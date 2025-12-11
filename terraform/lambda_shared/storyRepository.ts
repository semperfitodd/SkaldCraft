import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  BatchGetCommand,
  DeleteCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import type {
  Story,
  StoryNode,
  CreateStoryInput,
  CreateStoryNodeInput,
  UpdateStoryInput,
  UpdateStoryNodeInput,
} from './storyModels';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const STORIES_TABLE = process.env.STORIES_TABLE!;
const STORY_NODES_TABLE = process.env.STORY_NODES_TABLE!;
const PROFILE_INDEX = 'profileId-createdAt-index';

function nowISO(): string {
  return new Date().toISOString();
}

export async function createStory(input: CreateStoryInput): Promise<Story> {
  const now = nowISO();
  const story: Story = { 
    ...input, 
    createdAt: now, 
    updatedAt: now,
    isArchived: false,
    contentS3Key: null,
    completedAt: null,
  };

  await docClient.send(new PutCommand({
    TableName: STORIES_TABLE,
    Item: story,
    ConditionExpression: 'attribute_not_exists(storyId)',
  }));

  return story;
}

export async function getStoryById(storyId: string): Promise<Story | null> {
  const result = await docClient.send(new GetCommand({
    TableName: STORIES_TABLE,
    Key: { storyId },
  }));
  return (result.Item as Story) ?? null;
}

export async function listStoriesByProfile(profileId: string, limit = 20): Promise<Story[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: STORIES_TABLE,
    IndexName: PROFILE_INDEX,
    KeyConditionExpression: 'profileId = :pid',
    ExpressionAttributeValues: { ':pid': profileId },
    ScanIndexForward: false,
    Limit: limit,
  }));
  return (result.Items as Story[]) ?? [];
}

export async function updateStory(storyId: string, updates: UpdateStoryInput): Promise<Story | null> {
  const now = nowISO();
  const exprs: string[] = ['updatedAt = :now'];
  const vals: Record<string, unknown> = { ':now': now };
  const names: Record<string, string> = {};

  if (updates.title !== undefined) { exprs.push('title = :title'); vals[':title'] = updates.title; }
  if (updates.status !== undefined) { exprs.push('#status = :status'); vals[':status'] = updates.status; names['#status'] = 'status'; }
  if (updates.activeNodeId !== undefined) { exprs.push('activeNodeId = :nid'); vals[':nid'] = updates.activeNodeId; }
  if (updates.outline !== undefined) { exprs.push('outline = :outline'); vals[':outline'] = updates.outline; }
  if (updates.pendingChoiceId !== undefined) { exprs.push('pendingChoiceId = :pci'); vals[':pci'] = updates.pendingChoiceId; }
  if (updates.generationError !== undefined) { exprs.push('generationError = :gerr'); vals[':gerr'] = updates.generationError; }
  if (updates.isArchived !== undefined) { exprs.push('isArchived = :arch'); vals[':arch'] = updates.isArchived; }
  if (updates.contentS3Key !== undefined) { exprs.push('contentS3Key = :s3k'); vals[':s3k'] = updates.contentS3Key; }
  if (updates.completedAt !== undefined) { exprs.push('completedAt = :cat'); vals[':cat'] = updates.completedAt; }

  if (updates.bible) {
    const b = updates.bible;
    if (b.storySummaryShort !== undefined) { exprs.push('bible.storySummaryShort = :ss'); vals[':ss'] = b.storySummaryShort; }
    if (b.charactersSummary !== undefined) { exprs.push('bible.charactersSummary = :cs'); vals[':cs'] = b.charactersSummary; }
    if (b.settingSummary !== undefined) { exprs.push('bible.settingSummary = :sts'); vals[':sts'] = b.settingSummary; }
    if (b.conflictSummary !== undefined) { exprs.push('bible.conflictSummary = :cos'); vals[':cos'] = b.conflictSummary; }
    if (b.themeNotes !== undefined) { exprs.push('bible.themeNotes = :tn'); vals[':tn'] = b.themeNotes; }
  }

  try {
    const result = await docClient.send(new UpdateCommand({
      TableName: STORIES_TABLE,
      Key: { storyId },
      UpdateExpression: `SET ${exprs.join(', ')}`,
      ExpressionAttributeValues: vals,
      ...(Object.keys(names).length > 0 && { ExpressionAttributeNames: names }),
      ConditionExpression: 'attribute_exists(storyId)',
      ReturnValues: 'ALL_NEW',
    }));
    return (result.Attributes as Story) ?? null;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') return null;
    throw error;
  }
}

export async function deleteStory(storyId: string): Promise<boolean> {
  await deleteStoryNodes(storyId);

  try {
    await docClient.send(new DeleteCommand({
      TableName: STORIES_TABLE,
      Key: { storyId },
      ConditionExpression: 'attribute_exists(storyId)',
    }));
    return true;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') return false;
    throw error;
  }
}

export async function createStoryNode(input: CreateStoryNodeInput): Promise<StoryNode> {
  const now = nowISO();
  const node: StoryNode = { ...input, createdAt: now, updatedAt: now };

  await docClient.send(new PutCommand({
    TableName: STORY_NODES_TABLE,
    Item: node,
    ConditionExpression: 'attribute_not_exists(storyId) AND attribute_not_exists(nodeId)',
  }));

  return node;
}

export async function getStoryNode(storyId: string, nodeId: string): Promise<StoryNode | null> {
  const result = await docClient.send(new GetCommand({
    TableName: STORY_NODES_TABLE,
    Key: { storyId, nodeId },
  }));
  return (result.Item as StoryNode) ?? null;
}

export async function getRootNode(storyId: string): Promise<StoryNode | null> {
  const result = await docClient.send(new QueryCommand({
    TableName: STORY_NODES_TABLE,
    KeyConditionExpression: 'storyId = :sid',
    FilterExpression: 'depth = :zero',
    ExpressionAttributeValues: { ':sid': storyId, ':zero': 0 },
    Limit: 1,
  }));
  return (result.Items as StoryNode[])?.[0] ?? null;
}

export async function listNodesForStory(storyId: string, limit = 100): Promise<StoryNode[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: STORY_NODES_TABLE,
    KeyConditionExpression: 'storyId = :sid',
    ExpressionAttributeValues: { ':sid': storyId },
    Limit: limit,
  }));
  return (result.Items as StoryNode[]) ?? [];
}

export async function updateStoryNode(storyId: string, nodeId: string, updates: UpdateStoryNodeInput): Promise<StoryNode | null> {
  const now = nowISO();
  const exprs: string[] = ['updatedAt = :now'];
  const vals: Record<string, unknown> = { ':now': now };
  const names: Record<string, string> = {};

  if (updates.text !== undefined) { exprs.push('#text = :text'); vals[':text'] = updates.text; names['#text'] = 'text'; }
  if (updates.choices !== undefined) { exprs.push('choices = :ch'); vals[':ch'] = updates.choices; }
  if (updates.localSummary !== undefined) { exprs.push('localSummary = :ls'); vals[':ls'] = updates.localSummary; }
  if (updates.isEnding !== undefined) { exprs.push('isEnding = :ie'); vals[':ie'] = updates.isEnding; }

  try {
    const result = await docClient.send(new UpdateCommand({
      TableName: STORY_NODES_TABLE,
      Key: { storyId, nodeId },
      UpdateExpression: `SET ${exprs.join(', ')}`,
      ExpressionAttributeValues: vals,
      ...(Object.keys(names).length > 0 && { ExpressionAttributeNames: names }),
      ConditionExpression: 'attribute_exists(storyId) AND attribute_exists(nodeId)',
      ReturnValues: 'ALL_NEW',
    }));
    return (result.Attributes as StoryNode) ?? null;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') return null;
    throw error;
  }
}

export async function batchGetNodes(storyId: string, nodeIds: string[]): Promise<StoryNode[]> {
  if (!nodeIds.length) return [];

  const results: StoryNode[] = [];
  for (let i = 0; i < nodeIds.length; i += 100) {
    const batch = nodeIds.slice(i, i + 100);
    const result = await docClient.send(new BatchGetCommand({
      RequestItems: {
        [STORY_NODES_TABLE]: { Keys: batch.map(nodeId => ({ storyId, nodeId })) },
      },
    }));
    const items = result.Responses?.[STORY_NODES_TABLE] as StoryNode[] | undefined;
    if (items) results.push(...items);
  }
  return results;
}

export async function getPathToNode(storyId: string, nodeId: string): Promise<StoryNode[]> {
  const path: StoryNode[] = [];
  let currentId: string | null = nodeId;

  while (currentId) {
    const node = await getStoryNode(storyId, currentId);
    if (!node) return [];
    path.unshift(node);
    currentId = node.parentNodeId;
  }

  return path;
}

export async function deleteStoryNodes(storyId: string): Promise<number> {
  const nodes = await listNodesForStory(storyId, 1000);
  if (!nodes.length) return 0;

  for (let i = 0; i < nodes.length; i += 25) {
    const batch = nodes.slice(i, i + 25);
    await docClient.send(new BatchWriteCommand({
      RequestItems: {
        [STORY_NODES_TABLE]: batch.map(node => ({
          DeleteRequest: {
            Key: { storyId, nodeId: node.nodeId },
          },
        })),
      },
    }));
  }

  return nodes.length;
}

export async function getNodeByChapterIndex(storyId: string, chapterIndex: number): Promise<StoryNode | null> {
  const result = await docClient.send(new QueryCommand({
    TableName: STORY_NODES_TABLE,
    KeyConditionExpression: 'storyId = :sid',
    FilterExpression: 'chapterIndex = :ci',
    ExpressionAttributeValues: { ':sid': storyId, ':ci': chapterIndex },
    Limit: 10,
  }));
  
  const nodes = result.Items as StoryNode[] | undefined;
  return nodes?.[0] ?? null;
}
