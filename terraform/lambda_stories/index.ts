import { randomUUID } from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import {
  ALL_GENRES,
  STORY_TONES,
  STORY_POVS,
  STORY_LENGTHS,
  AGE_BANDS,
  CORS_HEADERS,
  ADULT_AGE_THRESHOLD,
} from './constants';
import type {
  StoryConfig,
  StoryBible,
  StoryStatus,
  CreateStoryInput,
  CreateStoryNodeInput,
  CreateAdultStoryRequest,
  ContinueStoryRequest,
  OutlineChapter,
} from './models';
import {
  createStory,
  getStoryById,
  listStoriesByProfile,
  updateStory,
  deleteStory,
  createStoryNode,
  getStoryNode,
  getRootNode,
  listNodesForStory,
  updateStoryNode,
  getPathToNode,
  getNodeByChapterIndex,
} from './repository';
import { 
  initAdultStory,
  generateAdultStoryContent,
  initContinueStory,
  generateNextChapter,
  getArchivedStory,
  LENGTH_TO_NODE_COUNT,
  type CreateAdultStoryOptions,
} from './storyEngine';
import type { APIGatewayEvent, APIResponse } from 'lambda_shared/types';
import { createResponse, parseBody } from 'lambda_shared/utils';

const lambdaClient = new LambdaClient({});

const VALID_STATUSES: StoryStatus[] = ['in_progress', 'completed', 'abandoned'];
const MAX_CUSTOM_PROMPT_LENGTH = 500;
const MAX_TITLE_LENGTH = 200;
const MAX_USER_HINT_LENGTH = 200;

interface CreateStoryRequest {
  title: string;
  profileId: string;
  config: StoryConfig;
}

interface UpdateStoryRequest {
  title?: string;
  status?: StoryStatus;
  activeNodeId?: string;
  bible?: Partial<StoryBible>;
}

interface CreateNodeRequest {
  parentNodeId: string | null;
  choiceLabelFromParent: string | null;
  chapterIndex: number;
  depth: number;
  text: string;
  choices: Array<{ choiceId: string; label: string; targetNodeId?: string | null }>;
  localSummary: string;
  isEnding: boolean;
}

interface UpdateNodeRequest {
  text?: string;
  choices?: Array<{ choiceId: string; label: string; targetNodeId?: string | null }>;
  localSummary?: string;
  isEnding?: boolean;
}

interface UserProfile {
  email: string;
  birthday?: string;
  explicitContentAllowed: boolean;
}

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const USERS_TABLE = process.env.USERS_TABLE!;

function response(statusCode: number, body: object): APIResponse {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

function parseJSON<T>(body: string | undefined): T | null {
  if (!body) return null;
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

/**
 * Invoke this Lambda function asynchronously for background processing
 */
async function invokeAsync(payload: { action: string; data: any }): Promise<void> {
  const functionName = process.env.LAMBDA_FUNCTION_NAME;
  if (!functionName) {
    throw new Error('LAMBDA_FUNCTION_NAME environment variable not set');
  }

  const command = new InvokeCommand({
    FunctionName: functionName,
    InvocationType: 'Event', // Async invoke
    Payload: JSON.stringify(payload),
  });

  try {
    await lambdaClient.send(command);
    console.log('[Lambda] Async invocation triggered', { action: payload.action });
  } catch (error) {
    console.error('[Lambda] Failed to trigger async invocation', {
      action: payload.action,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

function calculateAge(birthday: string): number {
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function isAdultProfile(user: UserProfile): boolean {
  return !!user.birthday && calculateAge(user.birthday) >= ADULT_AGE_THRESHOLD;
}

async function getUserProfile(email: string): Promise<UserProfile | null> {
  const result = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { email } }));
  if (!result.Item) return null;
  return {
    email: result.Item.email,
    birthday: result.Item.birthday,
    explicitContentAllowed: result.Item.explicitContentAllowed ?? false,
  };
}

function validateConfig(config: StoryConfig): string | null {
  if (!config) return 'config is required';
  if (!AGE_BANDS.includes(config.ageBand as any)) return 'Invalid ageBand';
  if (!ALL_GENRES.includes(config.genre as any)) return 'Invalid genre';
  if (!STORY_TONES.includes(config.tone as any)) return 'Invalid tone';
  if (!STORY_POVS.includes(config.pov as any)) return 'Invalid pov';
  if (!STORY_LENGTHS.includes(config.targetLength as any)) return 'Invalid targetLength';
  if (typeof config.explicitContentAllowed !== 'boolean') return 'explicitContentAllowed must be boolean';
  return null;
}

function validateCreateStory(data: CreateStoryRequest): string | null {
  if (!data.title?.trim()) return 'title is required';
  if (!data.profileId) return 'profileId is required';
  return validateConfig(data.config);
}

function validateCreateNode(data: CreateNodeRequest): string | null {
  if (typeof data.depth !== 'number' || data.depth < 0) return 'depth must be non-negative';
  if (typeof data.chapterIndex !== 'number' || data.chapterIndex < 0) return 'chapterIndex must be non-negative';
  if (!data.text) return 'text is required';
  if (!Array.isArray(data.choices)) return 'choices must be array';
  for (const c of data.choices) {
    if (!c.choiceId || !c.label) return 'Each choice needs choiceId and label';
  }
  if (typeof data.isEnding !== 'boolean') return 'isEnding must be boolean';
  if (data.isEnding && data.choices.length > 0) return 'Ending nodes cannot have choices';
  return null;
}

function validateCreateAdultStory(data: CreateAdultStoryRequest): string | null {
  if (!data.profileId) return 'profileId is required';
  if (!STORY_LENGTHS.includes(data.targetLength as any)) return 'Invalid targetLength';
  if (data.genre != null && !ALL_GENRES.includes(data.genre as any)) return 'Invalid genre';
  if (data.tone != null && !STORY_TONES.includes(data.tone as any)) return 'Invalid tone';
  if (data.pov != null && !STORY_POVS.includes(data.pov as any)) return 'Invalid pov';
  if (data.customPrompt && data.customPrompt.length > MAX_CUSTOM_PROMPT_LENGTH) {
    return `customPrompt must be ${MAX_CUSTOM_PROMPT_LENGTH} characters or less`;
  }
  if (data.title && data.title.length > MAX_TITLE_LENGTH) {
    return `title must be ${MAX_TITLE_LENGTH} characters or less`;
  }
  return null;
}

function validateContinueStory(data: ContinueStoryRequest): string | null {
  if (!data.choiceId) return 'choiceId is required';
  if (data.userHint && data.userHint.length > MAX_USER_HINT_LENGTH) {
    return `userHint must be ${MAX_USER_HINT_LENGTH} characters or less`;
  }
  return null;
}

async function handleListStories(email: string, query?: Record<string, string>): Promise<APIResponse> {
  const profileId = query?.profileId || email;
  const limit = query?.limit ? parseInt(query.limit, 10) : 20;
  const stories = await listStoriesByProfile(profileId, limit);
  return response(200, { stories });
}

async function handleCreateStory(body: string | undefined): Promise<APIResponse> {
  const data = parseJSON<CreateStoryRequest>(body);
  if (!data) return response(400, { error: 'Invalid JSON' });

  const err = validateCreateStory(data);
  if (err) return response(400, { error: err });

  const storyId = randomUUID();
  const rootNodeId = randomUUID();

  const emptyBible: StoryBible = {
    storySummaryShort: '',
    charactersSummary: '',
    settingSummary: '',
    conflictSummary: '',
    themeNotes: '',
  };

  const emptyOutline: OutlineChapter[] = [];
  const targetNodeCount = LENGTH_TO_NODE_COUNT[data.config.targetLength];

  const input: CreateStoryInput = {
    storyId,
    profileId: data.profileId,
    title: data.title.trim(),
    status: 'in_progress',
    config: data.config,
    bible: emptyBible,
    outline: emptyOutline,
    targetNodeCount,
    activeNodeId: rootNodeId,
  };

  const story = await createStory(input);
  return response(201, { story, rootNodeId });
}

async function handleGetStory(storyId: string, email: string): Promise<APIResponse> {
  const story = await getStoryById(storyId);
  if (!story) return response(404, { error: 'Story not found' });
  
  if (story.profileId !== email) {
    return response(403, { error: 'Access denied' });
  }

  return response(200, { 
    story,
    hasArchivedContent: story.isArchived && !!story.contentS3Key,
  });
}

async function handleUpdateStory(storyId: string, body: string | undefined): Promise<APIResponse> {
  const data = parseJSON<UpdateStoryRequest>(body);
  if (!data) return response(400, { error: 'Invalid JSON' });

  if (data.status !== undefined && !VALID_STATUSES.includes(data.status)) {
    return response(400, { error: 'Invalid status' });
  }

  const story = await updateStory(storyId, data);
  if (!story) return response(404, { error: 'Story not found' });
  return response(200, { story });
}

async function handleDeleteStory(storyId: string): Promise<APIResponse> {
  try {
    // Get story first to check if it exists
    const story = await getStoryById(storyId);
    if (!story) return response(404, { error: 'Story not found' });

    // Delete from DynamoDB (this also deletes all nodes)
    const deleted = await deleteStory(storyId);
    if (!deleted) return response(404, { error: 'Story not found' });

    // Delete from S3 if archived
    if (story.status === 'completed') {
      try {
        const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
        const s3Client = new S3Client({});
        const STORY_ARCHIVE_BUCKET = process.env.STORY_ARCHIVE_BUCKET!;
        const STORY_ARCHIVE_PREFIX = process.env.STORY_ARCHIVE_PREFIX || 'stories/';
        
        await s3Client.send(new DeleteObjectCommand({
          Bucket: STORY_ARCHIVE_BUCKET,
          Key: `${STORY_ARCHIVE_PREFIX}${storyId}.json`,
        }));
        
        console.log(`[DeleteStory] Deleted archived story from S3: ${storyId}`);
      } catch (s3Error) {
        console.error('[DeleteStory] Failed to delete from S3:', s3Error);
        // Continue anyway - DynamoDB deletion succeeded
      }
    }

    return response(200, { message: 'Story deleted successfully' });
  } catch (error) {
    console.error('[DeleteStory] Error:', error);
    return response(500, { error: 'Failed to delete story' });
  }
}

async function handleListNodes(storyId: string, query?: Record<string, string>): Promise<APIResponse> {
  const story = await getStoryById(storyId);
  if (!story) return response(404, { error: 'Story not found' });

  const limit = query?.limit ? parseInt(query.limit, 10) : 100;
  const nodes = await listNodesForStory(storyId, limit);
  return response(200, { nodes });
}

async function handleGetNode(storyId: string, nodeId: string): Promise<APIResponse> {
  const node = await getStoryNode(storyId, nodeId);
  if (!node) return response(404, { error: 'Node not found' });
  return response(200, { node });
}

async function handleGetRootNode(storyId: string): Promise<APIResponse> {
  const node = await getRootNode(storyId);
  if (!node) return response(404, { error: 'Root node not found' });
  return response(200, { node });
}

async function handleCreateNode(storyId: string, body: string | undefined): Promise<APIResponse> {
  const story = await getStoryById(storyId);
  if (!story) return response(404, { error: 'Story not found' });

  const data = parseJSON<CreateNodeRequest>(body);
  if (!data) return response(400, { error: 'Invalid JSON' });

  const err = validateCreateNode(data);
  if (err) return response(400, { error: err });

  const input: CreateStoryNodeInput = {
    storyId,
    nodeId: randomUUID(),
    parentNodeId: data.parentNodeId,
    choiceLabelFromParent: data.choiceLabelFromParent,
    chapterIndex: data.chapterIndex,
    depth: data.depth,
    text: data.text,
    choices: data.choices,
    localSummary: data.localSummary || '',
    isEnding: data.isEnding,
  };

  const node = await createStoryNode(input);
  return response(201, { node });
}

async function handleUpdateNode(storyId: string, nodeId: string, body: string | undefined): Promise<APIResponse> {
  const data = parseJSON<UpdateNodeRequest>(body);
  if (!data) return response(400, { error: 'Invalid JSON' });

  const node = await updateStoryNode(storyId, nodeId, data);
  if (!node) return response(404, { error: 'Node not found' });
  return response(200, { node });
}

async function handleCreateAdultStory(email: string, body: string | undefined): Promise<APIResponse> {
  const data = parseJSON<CreateAdultStoryRequest>(body);
  if (!data) return response(400, { error: 'Invalid JSON' });

  const validationError = validateCreateAdultStory(data);
  if (validationError) return response(400, { error: validationError });

  const user = await getUserProfile(email);
  if (!user) return response(404, { error: 'User profile not found' });

  if (!isAdultProfile(user)) {
    return response(403, { error: 'Adult story creation requires an adult profile with verified age' });
  }

  if (data.profileId !== email) {
    return response(403, { error: 'profileId must match authenticated user email for adult stories' });
  }

  const storyOptions: CreateAdultStoryOptions = {
    profileId: data.profileId,
    userEmail: email,
    title: data.title ?? undefined,
    genre: data.genre,
    tone: data.tone,
    pov: data.pov,
    targetLength: data.targetLength,
    customPrompt: data.customPrompt,
    explicitContentAllowed: user.explicitContentAllowed,
  };

  try {
    const { story } = await initAdultStory(storyOptions);

    console.log('[Stories] Adult story initialized', {
      storyId: story.storyId,
      profileId: data.profileId,
      status: story.status,
    });

    // Trigger async Lambda invocation for background generation
    await invokeAsync({
      action: 'generateAdultStory',
      data: { storyId: story.storyId, storyOptions },
    });

    return response(202, { story, status: 'creating' });
  } catch (error) {
    console.error('[Stories] Failed to initialize adult story', {
      profileId: data.profileId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return response(500, { error: 'Failed to create story' });
  }
}

async function handleContinueStory(email: string, storyId: string, body: string | undefined): Promise<APIResponse> {
  const data = parseJSON<ContinueStoryRequest>(body);
  if (!data) return response(400, { error: 'Invalid JSON' });

  const validationError = validateContinueStory(data);
  if (validationError) return response(400, { error: validationError });

  const user = await getUserProfile(email);
  if (!user) return response(404, { error: 'User profile not found' });

  if (!isAdultProfile(user)) {
    return response(403, { error: 'Story continuation requires an adult profile' });
  }

  try {
    const { story } = await initContinueStory({
      storyId,
      choiceId: data.choiceId,
      userEmail: email,
      profileId: email,
      userHint: data.userHint,
    });

    console.log('[Stories] Continue story initialized', {
      storyId,
      choiceId: data.choiceId,
      status: story.status,
    });

    // Trigger async Lambda invocation for background generation
    await invokeAsync({
      action: 'generateNextChapter',
      data: { storyId, email, userHint: data.userHint },
    });

    return response(202, { story, status: 'generating_chapter' });
  } catch (error) {
    console.error('[Stories] Failed to initialize continue story', {
      storyId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof Error) {
      const errorMap: Record<string, { status: number; message: string }> = {
        'Story not found': { status: 404, message: 'Story not found' },
        'Story does not belong to this profile': { status: 403, message: 'Story does not belong to this profile' },
        'Story is already completed': { status: 400, message: 'Story is already completed' },
        'Story is archived and cannot be continued': { status: 400, message: 'Story is archived and cannot be continued' },
        'Chapter generation already in progress': { status: 409, message: 'Chapter generation already in progress' },
        'Invalid choice ID': { status: 400, message: 'Invalid choice ID' },
      };

      const mapped = errorMap[error.message];
      if (mapped) return response(mapped.status, { error: mapped.message });
    }

    return response(500, { error: 'Failed to continue story' });
  }
}

async function handleGetStoryCurrent(email: string, storyId: string): Promise<APIResponse> {
  const story = await getStoryById(storyId);
  if (!story) return response(404, { error: 'Story not found' });
  
  if (story.profileId !== email) {
    return response(403, { error: 'Access denied' });
  }

  if (story.isArchived) {
    return response(400, { error: 'Story is archived. Use /archive endpoint instead.' });
  }

  const currentNode = await getStoryNode(storyId, story.activeNodeId);
  if (!currentNode) {
    return response(404, { error: 'Current node not found' });
  }

  return response(200, { 
    story,
    currentNode,
  });
}

async function handleGetStoryArchive(email: string, storyId: string): Promise<APIResponse> {
  const story = await getStoryById(storyId);
  if (!story) return response(404, { error: 'Story not found' });
  
  if (story.profileId !== email) {
    return response(403, { error: 'Access denied' });
  }

  if (story.status !== 'completed') {
    return response(400, { error: 'Story is not completed yet' });
  }

  // Story is completed - archiving should be handled by DynamoDB Stream Lambda
  if (!story.isArchived || !story.contentS3Key) {
    console.log('[Stories] Story completed but not yet archived, archiving in progress', { 
      storyId,
      status: story.status,
      isArchived: story.isArchived,
    });
    return response(202, { 
      message: 'Story is being archived. Please try again in a few moments.',
      status: 'archiving',
    });
  }

  const archivedStory = await getArchivedStory(storyId);
  if (!archivedStory) {
    return response(404, { error: 'Archived story content not found in S3' });
  }

  return response(200, archivedStory);
}

async function handleGetStoryChapter(email: string, storyId: string, chapterIndex: number): Promise<APIResponse> {
  const story = await getStoryById(storyId);
  if (!story) return response(404, { error: 'Story not found' });
  
  if (story.profileId !== email) {
    return response(403, { error: 'Access denied' });
  }

  if (chapterIndex < 0 || chapterIndex >= story.outline.length) {
    return response(400, { error: 'Invalid chapter index' });
  }

  if (story.isArchived && story.contentS3Key) {
    const archivedStory = await getArchivedStory(storyId);
    if (!archivedStory) {
      return response(404, { error: 'Archived content not found' });
    }

    const chapter = archivedStory.chapters.find(ch => ch.chapterIndex === chapterIndex);
    if (!chapter) {
      return response(404, { error: 'Chapter not found in archive' });
    }

    return response(200, {
      chapter,
      outline: story.outline[chapterIndex],
    });
  }

  const node = await getNodeByChapterIndex(storyId, chapterIndex);
  if (!node) {
    return response(404, { error: 'Chapter not yet generated' });
  }

  return response(200, {
    node,
    outline: story.outline[chapterIndex],
  });
}


export const handler = async (event: APIGatewayEvent | any, context: any): Promise<APIResponse | void> => {
  // Handle background invocations (async invoke from same Lambda)
  if (event.action && event.data) {
    console.log('[Lambda] Background invocation detected', { action: event.action });
    
    try {
      if (event.action === 'generateAdultStory') {
        const { storyId, storyOptions } = event.data;
        await generateAdultStoryContent(storyId, storyOptions);
        console.log('[Lambda] Background story generation complete', { storyId });
        return;
      }
      
      if (event.action === 'generateNextChapter') {
        const { storyId, email, userHint } = event.data;
        await generateNextChapter(storyId, email, userHint);
        console.log('[Lambda] Background chapter generation complete', { storyId });
        return;
      }
      
      console.warn('[Lambda] Unknown background action', { action: event.action });
    } catch (error) {
      console.error('[Lambda] Background invocation failed', {
        action: event.action,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
    return;
  }

  // Handle HTTP requests
  try {
    const claims = event.requestContext?.authorizer?.jwt?.claims || {};
    const email = claims.email;
    const method = event.requestContext?.http?.method || 'GET';
    const path = event.rawPath || event.requestContext?.http?.path || '/';

    if (!email) return response(401, { error: 'Unauthorized' });

    if (path === '/stories' && method === 'GET') {
      return handleListStories(email, event.queryStringParameters);
    }

    if (path === '/stories' && method === 'POST') {
      return handleCreateStory(event.body);
    }

    if (path === '/stories/adult' && method === 'POST') {
      return handleCreateAdultStory(email, event.body);
    }

    const currentMatch = path.match(/^\/stories\/([a-zA-Z0-9-]+)\/current$/);
    if (currentMatch && method === 'GET') {
      return handleGetStoryCurrent(email, currentMatch[1]);
    }

    const archiveMatch = path.match(/^\/stories\/([a-zA-Z0-9-]+)\/archive$/);
    if (archiveMatch && method === 'GET') {
      return handleGetStoryArchive(email, archiveMatch[1]);
    }

    const chapterMatch = path.match(/^\/stories\/([a-zA-Z0-9-]+)\/chapters\/(\d+)$/);
    if (chapterMatch && method === 'GET') {
      return handleGetStoryChapter(email, chapterMatch[1], parseInt(chapterMatch[2], 10));
    }

    const continueMatch = path.match(/^\/stories\/([a-zA-Z0-9-]+)\/continue$/);
    if (continueMatch && method === 'POST') {
      return handleContinueStory(email, continueMatch[1], event.body);
    }

    const storyMatch = path.match(/^\/stories\/([a-zA-Z0-9-]+)$/);
    if (storyMatch) {
      const storyId = storyMatch[1];
      if (method === 'GET') return handleGetStory(storyId, email);
      if (method === 'PUT') return handleUpdateStory(storyId, event.body);
      if (method === 'DELETE') return handleDeleteStory(storyId);
    }

    const nodesMatch = path.match(/^\/stories\/([a-zA-Z0-9-]+)\/nodes$/);
    if (nodesMatch) {
      const storyId = nodesMatch[1];
      if (method === 'GET') return handleListNodes(storyId, event.queryStringParameters);
      if (method === 'POST') return handleCreateNode(storyId, event.body);
    }

    const rootMatch = path.match(/^\/stories\/([a-zA-Z0-9-]+)\/nodes\/root$/);
    if (rootMatch && method === 'GET') {
      return handleGetRootNode(rootMatch[1]);
    }

    const nodeMatch = path.match(/^\/stories\/([a-zA-Z0-9-]+)\/nodes\/([a-zA-Z0-9-]+)$/);
    if (nodeMatch) {
      const [, storyId, nodeId] = nodeMatch;
      if (method === 'GET') return handleGetNode(storyId, nodeId);
      if (method === 'PUT') return handleUpdateNode(storyId, nodeId, event.body);
    }

    return response(404, { error: 'Not found' });
  } catch (error) {
    console.error('Error:', error);
    return response(500, { error: 'Internal server error' });
  }
};
