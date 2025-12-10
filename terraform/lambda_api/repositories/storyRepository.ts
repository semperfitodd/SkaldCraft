/**
 * Story Repository
 *
 * Storage operations for Stories and StoryNodes tables.
 * Uses AWS SDK v3 with DynamoDBDocumentClient for simplified marshalling.
 *
 * This module provides ONLY data access operations - no business logic,
 * no Bedrock calls, no HTTP handling. Those will be added in future iterations.
 *
 * Environment variables required:
 * - STORIES_TABLE: Name of the Stories DynamoDB table
 * - STORY_NODES_TABLE: Name of the StoryNodes DynamoDB table
 *
 * @example
 * // Creating a story with its root node:
 * import { storyRepository } from './repositories/storyRepository';
 * import { v4 as uuidv4 } from 'uuid';
 *
 * const storyId = uuidv4();
 * const rootNodeId = uuidv4();
 *
 * // Create the story
 * await storyRepository.createStory({
 *   storyId,
 *   profileId: 'user@example.com',
 *   title: 'The Dragon\'s Quest',
 *   status: 'in_progress',
 *   config: {
 *     ageBand: 'adult',
 *     genre: 'fantasy',
 *     tone: 'epic',
 *     pov: 'third-person-limited',
 *     targetLength: 'medium',
 *     explicitContentAllowed: false,
 *   },
 *   bible: {
 *     storySummaryShort: '',
 *     charactersSummary: '',
 *     settingSummary: '',
 *     conflictSummary: '',
 *     themeNotes: '',
 *   },
 *   activeNodeId: rootNodeId,
 * });
 *
 * // Create the root node
 * await storyRepository.createStoryNode({
 *   storyId,
 *   nodeId: rootNodeId,
 *   parentNodeId: null,
 *   choiceLabelFromParent: null,
 *   depth: 0,
 *   text: 'You stand at the entrance of the ancient cave...',
 *   choices: [
 *     { choiceId: '1', label: 'Enter the cave cautiously' },
 *     { choiceId: '2', label: 'Call out into the darkness' },
 *     { choiceId: '3', label: 'Search for another entrance' },
 *   ],
 *   localSummary: 'Hero arrives at cave entrance, must choose approach.',
 *   isEnding: false,
 * });
 *
 * @example
 * // Reading a story and its root node:
 * const story = await storyRepository.getStoryById(storyId);
 * if (story) {
 *   const rootNode = await storyRepository.getRootNode(story.storyId);
 *   console.log(`Story: ${story.title}`);
 *   console.log(`Root node text: ${rootNode?.text}`);
 * }
 *
 * @example
 * // Listing stories for a profile:
 * const stories = await storyRepository.listStoriesByProfile('user@example.com', 10);
 * for (const story of stories) {
 *   console.log(`${story.title} - ${story.status}`);
 * }
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  BatchGetCommand,
} from '@aws-sdk/lib-dynamodb';

import type {
  Story,
  StoryNode,
  CreateStoryInput,
  CreateStoryNodeInput,
  UpdateStoryInput,
  UpdateStoryNodeInput,
} from '../models/story';

// -----------------------------------------------------------------------------
// DynamoDB Client Setup
// -----------------------------------------------------------------------------

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

// Table names from environment
const STORIES_TABLE = process.env.STORIES_TABLE!;
const STORY_NODES_TABLE = process.env.STORY_NODES_TABLE!;

// GSI name for profileId queries
const PROFILE_INDEX = 'profileId-createdAt-index';

// -----------------------------------------------------------------------------
// Story Operations
// -----------------------------------------------------------------------------

/**
 * Creates a new story in the database.
 * Automatically sets createdAt and updatedAt timestamps.
 *
 * @param input - Story data (without timestamps)
 */
async function createStory(input: CreateStoryInput): Promise<void> {
  const now = new Date().toISOString();

  const story: Story = {
    ...input,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: STORIES_TABLE,
      Item: story,
      // Prevent overwriting existing stories
      ConditionExpression: 'attribute_not_exists(storyId)',
    })
  );
}

/**
 * Retrieves a story by its ID.
 *
 * @param storyId - The story's unique identifier
 * @returns The story if found, null otherwise
 */
async function getStoryById(storyId: string): Promise<Story | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: STORIES_TABLE,
      Key: { storyId },
    })
  );

  return (result.Item as Story) ?? null;
}

/**
 * Lists stories belonging to a profile, ordered by creation date (newest first).
 * Uses the profileId-createdAt GSI.
 *
 * @param profileId - The profile's identifier (email or child profileId)
 * @param limit - Maximum number of stories to return (default 20)
 * @returns Array of stories, newest first
 */
async function listStoriesByProfile(
  profileId: string,
  limit: number = 20
): Promise<Story[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: STORIES_TABLE,
      IndexName: PROFILE_INDEX,
      KeyConditionExpression: 'profileId = :pid',
      ExpressionAttributeValues: {
        ':pid': profileId,
      },
      // Sort descending by createdAt (newest first)
      ScanIndexForward: false,
      Limit: limit,
    })
  );

  return (result.Items as Story[]) ?? [];
}

/**
 * Updates an existing story.
 * Only updates provided fields; others remain unchanged.
 *
 * @param storyId - The story's unique identifier
 * @param updates - Fields to update
 * @returns The updated story if found, null if story doesn't exist
 */
async function updateStory(
  storyId: string,
  updates: UpdateStoryInput
): Promise<Story | null> {
  const now = new Date().toISOString();

  // Build update expression dynamically based on provided fields
  const updateExpressions: string[] = ['updatedAt = :updatedAt'];
  const expressionValues: Record<string, unknown> = { ':updatedAt': now };
  const expressionNames: Record<string, string> = {};

  if (updates.title !== undefined) {
    updateExpressions.push('title = :title');
    expressionValues[':title'] = updates.title;
  }

  if (updates.status !== undefined) {
    updateExpressions.push('#status = :status');
    expressionValues[':status'] = updates.status;
    expressionNames['#status'] = 'status'; // 'status' is a reserved word
  }

  if (updates.activeNodeId !== undefined) {
    updateExpressions.push('activeNodeId = :activeNodeId');
    expressionValues[':activeNodeId'] = updates.activeNodeId;
  }

  // Handle partial bible updates
  if (updates.bible) {
    if (updates.bible.storySummaryShort !== undefined) {
      updateExpressions.push('bible.storySummaryShort = :storySummary');
      expressionValues[':storySummary'] = updates.bible.storySummaryShort;
    }
    if (updates.bible.charactersSummary !== undefined) {
      updateExpressions.push('bible.charactersSummary = :charSummary');
      expressionValues[':charSummary'] = updates.bible.charactersSummary;
    }
    if (updates.bible.settingSummary !== undefined) {
      updateExpressions.push('bible.settingSummary = :settingSummary');
      expressionValues[':settingSummary'] = updates.bible.settingSummary;
    }
    if (updates.bible.conflictSummary !== undefined) {
      updateExpressions.push('bible.conflictSummary = :conflictSummary');
      expressionValues[':conflictSummary'] = updates.bible.conflictSummary;
    }
    if (updates.bible.themeNotes !== undefined) {
      updateExpressions.push('bible.themeNotes = :themeNotes');
      expressionValues[':themeNotes'] = updates.bible.themeNotes;
    }
  }

  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: STORIES_TABLE,
        Key: { storyId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeValues: expressionValues,
        ...(Object.keys(expressionNames).length > 0 && {
          ExpressionAttributeNames: expressionNames,
        }),
        ConditionExpression: 'attribute_exists(storyId)',
        ReturnValues: 'ALL_NEW',
      })
    );

    return (result.Attributes as Story) ?? null;
  } catch (error: unknown) {
    // Handle case where story doesn't exist
    if (
      error instanceof Error &&
      error.name === 'ConditionalCheckFailedException'
    ) {
      return null;
    }
    throw error;
  }
}

// -----------------------------------------------------------------------------
// Story Node Operations
// -----------------------------------------------------------------------------

/**
 * Creates a new story node in the database.
 * Automatically sets createdAt and updatedAt timestamps.
 *
 * @param input - Node data (without timestamps)
 */
async function createStoryNode(input: CreateStoryNodeInput): Promise<void> {
  const now = new Date().toISOString();

  const node: StoryNode = {
    ...input,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: STORY_NODES_TABLE,
      Item: node,
      // Prevent overwriting existing nodes
      ConditionExpression:
        'attribute_not_exists(storyId) AND attribute_not_exists(nodeId)',
    })
  );
}

/**
 * Retrieves a specific story node.
 *
 * @param storyId - The story's unique identifier
 * @param nodeId - The node's unique identifier
 * @returns The node if found, null otherwise
 */
async function getStoryNode(
  storyId: string,
  nodeId: string
): Promise<StoryNode | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: STORY_NODES_TABLE,
      Key: { storyId, nodeId },
    })
  );

  return (result.Item as StoryNode) ?? null;
}

/**
 * Retrieves the root node of a story (depth = 0).
 * Uses a query with filter expression since we don't have a GSI on depth.
 *
 * @param storyId - The story's unique identifier
 * @returns The root node if found, null otherwise
 */
async function getRootNode(storyId: string): Promise<StoryNode | null> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: STORY_NODES_TABLE,
      KeyConditionExpression: 'storyId = :sid',
      FilterExpression: 'depth = :zero',
      ExpressionAttributeValues: {
        ':sid': storyId,
        ':zero': 0,
      },
      Limit: 1,
    })
  );

  const items = result.Items as StoryNode[] | undefined;
  return items?.[0] ?? null;
}

/**
 * Lists all nodes for a story.
 * Useful for exporting or analyzing the full story graph.
 *
 * @param storyId - The story's unique identifier
 * @param limit - Maximum number of nodes to return (default 100)
 * @returns Array of story nodes
 */
async function listNodesForStory(
  storyId: string,
  limit: number = 100
): Promise<StoryNode[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: STORY_NODES_TABLE,
      KeyConditionExpression: 'storyId = :sid',
      ExpressionAttributeValues: {
        ':sid': storyId,
      },
      Limit: limit,
    })
  );

  return (result.Items as StoryNode[]) ?? [];
}

/**
 * Updates an existing story node.
 * Only updates provided fields; others remain unchanged.
 *
 * @param storyId - The story's unique identifier
 * @param nodeId - The node's unique identifier
 * @param updates - Fields to update
 * @returns The updated node if found, null if node doesn't exist
 */
async function updateStoryNode(
  storyId: string,
  nodeId: string,
  updates: UpdateStoryNodeInput
): Promise<StoryNode | null> {
  const now = new Date().toISOString();

  // Build update expression dynamically
  const updateExpressions: string[] = ['updatedAt = :updatedAt'];
  const expressionValues: Record<string, unknown> = { ':updatedAt': now };
  const expressionNames: Record<string, string> = {};

  if (updates.text !== undefined) {
    updateExpressions.push('#text = :text');
    expressionValues[':text'] = updates.text;
    expressionNames['#text'] = 'text'; // 'text' might be reserved
  }

  if (updates.contentS3Key !== undefined) {
    updateExpressions.push('contentS3Key = :s3Key');
    expressionValues[':s3Key'] = updates.contentS3Key;
  }

  if (updates.choices !== undefined) {
    updateExpressions.push('choices = :choices');
    expressionValues[':choices'] = updates.choices;
  }

  if (updates.localSummary !== undefined) {
    updateExpressions.push('localSummary = :localSummary');
    expressionValues[':localSummary'] = updates.localSummary;
  }

  if (updates.isEnding !== undefined) {
    updateExpressions.push('isEnding = :isEnding');
    expressionValues[':isEnding'] = updates.isEnding;
  }

  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: STORY_NODES_TABLE,
        Key: { storyId, nodeId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeValues: expressionValues,
        ...(Object.keys(expressionNames).length > 0 && {
          ExpressionAttributeNames: expressionNames,
        }),
        ConditionExpression:
          'attribute_exists(storyId) AND attribute_exists(nodeId)',
        ReturnValues: 'ALL_NEW',
      })
    );

    return (result.Attributes as StoryNode) ?? null;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === 'ConditionalCheckFailedException'
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * Retrieves multiple nodes by their IDs in a single batch request.
 * Useful for fetching a path through the story graph.
 *
 * @param storyId - The story's unique identifier
 * @param nodeIds - Array of node IDs to fetch
 * @returns Array of found nodes (may be fewer than requested if some don't exist)
 */
async function batchGetNodes(
  storyId: string,
  nodeIds: string[]
): Promise<StoryNode[]> {
  if (nodeIds.length === 0) {
    return [];
  }

  // DynamoDB BatchGetItem has a limit of 100 items
  const batchSize = 100;
  const results: StoryNode[] = [];

  for (let i = 0; i < nodeIds.length; i += batchSize) {
    const batch = nodeIds.slice(i, i + batchSize);

    const result = await docClient.send(
      new BatchGetCommand({
        RequestItems: {
          [STORY_NODES_TABLE]: {
            Keys: batch.map((nodeId) => ({ storyId, nodeId })),
          },
        },
      })
    );

    const items = result.Responses?.[STORY_NODES_TABLE] as
      | StoryNode[]
      | undefined;
    if (items) {
      results.push(...items);
    }
  }

  return results;
}

/**
 * Gets the path from root to a specific node.
 * Traverses up the tree following parentNodeId links.
 *
 * @param storyId - The story's unique identifier
 * @param nodeId - The target node's identifier
 * @returns Array of nodes from root to target (inclusive), or empty if node not found
 */
async function getPathToNode(
  storyId: string,
  nodeId: string
): Promise<StoryNode[]> {
  const path: StoryNode[] = [];
  let currentNodeId: string | null = nodeId;

  // Traverse up to root, collecting nodes
  while (currentNodeId) {
    const node = await getStoryNode(storyId, currentNodeId);
    if (!node) {
      // Node not found - return empty path
      return [];
    }
    path.unshift(node); // Add to front
    currentNodeId = node.parentNodeId;
  }

  return path;
}

// -----------------------------------------------------------------------------
// Export Repository Object
// -----------------------------------------------------------------------------

export const storyRepository = {
  // Story operations
  createStory,
  getStoryById,
  listStoriesByProfile,
  updateStory,

  // Node operations
  createStoryNode,
  getStoryNode,
  getRootNode,
  listNodesForStory,
  updateStoryNode,
  batchGetNodes,
  getPathToNode,
};

// Also export individual functions for flexibility
export {
  createStory,
  getStoryById,
  listStoriesByProfile,
  updateStory,
  createStoryNode,
  getStoryNode,
  getRootNode,
  listNodesForStory,
  updateStoryNode,
  batchGetNodes,
  getPathToNode,
};

