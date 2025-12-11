import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import {
  ALL_GENRES,
  STORY_TONES,
  STORY_POVS,
  STORY_LENGTHS,
  CORS_HEADERS,
  ADULT_AGE_THRESHOLD,
  READING_PURPOSES,
} from './constants';
import type {
  CreateChildStoryRequest,
  ContinueChildStoryRequest,
} from './models';
import {
  getStoryById,
} from './repository';
import { 
  initChildStory,
  generateChildStoryContent,
  initContinueChildStory,
  generateNextChildChapter,
  type CreateChildStoryOptions,
} from './storyEngine';
import type { APIGatewayEvent, APIResponse } from 'lambda_shared/types';
import { createResponse, parseBody } from 'lambda_shared/utils';

const lambdaClient = new LambdaClient({});

const MAX_CUSTOM_PROMPT_LENGTH = 500;
const MAX_TITLE_LENGTH = 200;
const MAX_USER_HINT_LENGTH = 200;

interface UserProfile {
  email: string;
  birthday?: string;
  explicitContentAllowed: boolean;
}

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const USERS_TABLE = process.env.USERS_TABLE!;

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
    console.log('[ChildLambda] Async invocation triggered', { action: payload.action });
  } catch (error) {
    console.error('[ChildLambda] Failed to trigger async invocation', {
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

function validateCreateChildStory(data: CreateChildStoryRequest): string | null {
  if (!data.profileId) return 'profileId is required';
  if (!data.readingPurpose) return 'readingPurpose is required';
  if (!READING_PURPOSES.includes(data.readingPurpose as any)) {
    return 'readingPurpose must be one of: school, fun, bedtime';
  }
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
  // At least one of readingLevel, gradeLevel, or age should be provided
  if (!data.readingLevel && data.gradeLevel === null && data.gradeLevel === undefined && 
      data.age === null && data.age === undefined) {
    return 'At least one of readingLevel, gradeLevel, or age must be provided';
  }
  return null;
}

function validateContinueChildStory(data: ContinueChildStoryRequest): string | null {
  if (!data.choiceId) return 'choiceId is required';
  if (data.userHint && data.userHint.length > MAX_USER_HINT_LENGTH) {
    return `userHint must be ${MAX_USER_HINT_LENGTH} characters or less`;
  }
  return null;
}

async function handleCreateChildStory(email: string, body: string | undefined): Promise<APIResponse> {
  const data = parseBody<CreateChildStoryRequest>(body);
  if (!data) return createResponse(400, { error: 'Invalid JSON' });

  const validationError = validateCreateChildStory(data);
  if (validationError) return createResponse(400, { error: validationError });

  const user = await getUserProfile(email);
  if (!user) return createResponse(404, { error: 'User profile not found' });

  if (isAdultProfile(user)) {
    return createResponse(403, { error: 'Child story creation requires a child profile with verified age' });
  }

  if (data.profileId !== email) {
    return createResponse(403, { error: 'profileId must match authenticated user email' });
  }

  const storyOptions: CreateChildStoryOptions = {
    profileId: data.profileId,
    userEmail: email,
    readingPurpose: data.readingPurpose,
    readingLevel: data.readingLevel,
    gradeLevel: data.gradeLevel,
    age: data.age,
    title: data.title ?? undefined,
    genre: data.genre,
    tone: data.tone,
    pov: data.pov,
    targetLength: data.targetLength,
    customPrompt: data.customPrompt,
  };

  try {
    const { story } = await initChildStory(storyOptions);

    console.log('[ChildStories] Story initialized', {
      storyId: story.storyId,
      profileId: data.profileId,
      status: story.status,
      readingPurpose: data.readingPurpose,
    });

    await invokeAsync({
      action: 'generateChildStory',
      data: { storyId: story.storyId, storyOptions },
    });

    return createResponse(202, { story, status: 'creating' });
  } catch (error) {
    console.error('[ChildStories] Failed to initialize story', {
      profileId: data.profileId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return createResponse(500, { error: 'Failed to create story' });
  }
}

async function handleContinueChildStory(
  email: string,
  storyId: string,
  body: string | undefined
): Promise<APIResponse> {
  const data = parseBody<ContinueChildStoryRequest>(body);
  if (!data) return createResponse(400, { error: 'Invalid JSON' });

  const validationError = validateContinueChildStory(data);
  if (validationError) return createResponse(400, { error: validationError });

  const user = await getUserProfile(email);
  if (!user) return createResponse(404, { error: 'User profile not found' });

  if (isAdultProfile(user)) {
    return createResponse(403, { error: 'Child story continuation requires a child profile' });
  }

  const story = await getStoryById(storyId);
  if (!story) return createResponse(404, { error: 'Story not found' });
  if (story.profileId !== email) {
    return createResponse(403, { error: 'Story does not belong to this profile' });
  }

  const childOptions: CreateChildStoryOptions = {
    profileId: email,
    userEmail: email,
    readingPurpose: 'fun',
    readingLevel: story.config.readingLevelGRL || null,
    gradeLevel: null,
    age: null,
    targetLength: story.config.targetLength,
    genre: story.config.genre,
    tone: story.config.tone,
    pov: story.config.pov,
  };

  try {
    const { story: updatedStory } = await initContinueChildStory({
      storyId,
      choiceId: data.choiceId,
      userEmail: email,
      profileId: email,
      userHint: data.userHint,
    });

    console.log('[ChildStories] Continue initialized', {
      storyId,
      choiceId: data.choiceId,
      status: updatedStory.status,
    });

    await invokeAsync({
      action: 'generateNextChildChapter',
      data: { storyId, email, childOptions, userHint: data.userHint },
    });

    return createResponse(202, { story: updatedStory, status: 'generating_chapter' });
  } catch (error) {
    console.error('[ChildStories] Failed to initialize continue', {
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
      if (mapped) return createResponse(mapped.status, { error: mapped.message });
    }

    return createResponse(500, { error: 'Failed to continue story' });
  }
}

export const handler = async (event: APIGatewayEvent | any, context: any): Promise<APIResponse | void> => {
  if (event.action && event.data) {
    console.log('[ChildLambda] Background invocation detected', { action: event.action });
    
    try {
      if (event.action === 'generateChildStory') {
        const { storyId, storyOptions } = event.data;
        await generateChildStoryContent(storyId, storyOptions);
        console.log('[ChildLambda] Background story generation complete', { storyId });
        return;
      }
      
      if (event.action === 'generateNextChildChapter') {
        const { storyId, email, childOptions, userHint } = event.data;
        await generateNextChildChapter(storyId, email, childOptions, userHint);
        console.log('[ChildLambda] Background chapter generation complete', { storyId });
        return;
      }
      
      console.warn('[ChildLambda] Unknown background action', { action: event.action });
    } catch (error) {
      console.error('[ChildLambda] Background invocation failed', {
        action: event.action,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
    return;
  }

  try {
    const claims = event.requestContext?.authorizer?.jwt?.claims || {};
    const email = claims.email;
    const method = event.requestContext?.http?.method || 'GET';
    const path = event.rawPath || event.requestContext?.http?.path || '/';

    if (!email) return createResponse(401, { error: 'Unauthorized' });

    if (path === '/stories/child' && method === 'POST') {
      return handleCreateChildStory(email, event.body);
    }

    const continueMatch = path.match(/^\/stories\/child\/([a-zA-Z0-9-]+)\/continue$/);
    if (continueMatch && method === 'POST') {
      return handleContinueChildStory(email, continueMatch[1], event.body);
    }

    return createResponse(404, { error: 'Not found' });
  } catch (error) {
    console.error('[ChildLambda] Error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};
