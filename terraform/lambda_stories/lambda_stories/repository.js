"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStory = createStory;
exports.getStoryById = getStoryById;
exports.listStoriesByProfile = listStoriesByProfile;
exports.updateStory = updateStory;
exports.deleteStory = deleteStory;
exports.createStoryNode = createStoryNode;
exports.getStoryNode = getStoryNode;
exports.getRootNode = getRootNode;
exports.listNodesForStory = listNodesForStory;
exports.updateStoryNode = updateStoryNode;
exports.batchGetNodes = batchGetNodes;
exports.getPathToNode = getPathToNode;
exports.deleteStoryNodes = deleteStoryNodes;
exports.getNodeByChapterIndex = getNodeByChapterIndex;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
});
const STORIES_TABLE = process.env.STORIES_TABLE;
const STORY_NODES_TABLE = process.env.STORY_NODES_TABLE;
const PROFILE_INDEX = 'profileId-createdAt-index';
function nowISO() {
    return new Date().toISOString();
}
async function createStory(input) {
    const now = nowISO();
    const story = {
        ...input,
        createdAt: now,
        updatedAt: now,
        isArchived: false,
        contentS3Key: null,
        completedAt: null,
    };
    await docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: STORIES_TABLE,
        Item: story,
        ConditionExpression: 'attribute_not_exists(storyId)',
    }));
    return story;
}
async function getStoryById(storyId) {
    const result = await docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: STORIES_TABLE,
        Key: { storyId },
    }));
    return result.Item ?? null;
}
async function listStoriesByProfile(profileId, limit = 20) {
    const result = await docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: STORIES_TABLE,
        IndexName: PROFILE_INDEX,
        KeyConditionExpression: 'profileId = :pid',
        ExpressionAttributeValues: { ':pid': profileId },
        ScanIndexForward: false,
        Limit: limit,
    }));
    return result.Items ?? [];
}
async function updateStory(storyId, updates) {
    const now = nowISO();
    const exprs = ['updatedAt = :now'];
    const vals = { ':now': now };
    const names = {};
    if (updates.title !== undefined) {
        exprs.push('title = :title');
        vals[':title'] = updates.title;
    }
    if (updates.status !== undefined) {
        exprs.push('#status = :status');
        vals[':status'] = updates.status;
        names['#status'] = 'status';
    }
    if (updates.activeNodeId !== undefined) {
        exprs.push('activeNodeId = :nid');
        vals[':nid'] = updates.activeNodeId;
    }
    if (updates.outline !== undefined) {
        exprs.push('outline = :outline');
        vals[':outline'] = updates.outline;
    }
    if (updates.pendingChoiceId !== undefined) {
        exprs.push('pendingChoiceId = :pci');
        vals[':pci'] = updates.pendingChoiceId;
    }
    if (updates.generationError !== undefined) {
        exprs.push('generationError = :gerr');
        vals[':gerr'] = updates.generationError;
    }
    if (updates.isArchived !== undefined) {
        exprs.push('isArchived = :arch');
        vals[':arch'] = updates.isArchived;
    }
    if (updates.contentS3Key !== undefined) {
        exprs.push('contentS3Key = :s3k');
        vals[':s3k'] = updates.contentS3Key;
    }
    if (updates.completedAt !== undefined) {
        exprs.push('completedAt = :cat');
        vals[':cat'] = updates.completedAt;
    }
    if (updates.bible) {
        const b = updates.bible;
        if (b.storySummaryShort !== undefined) {
            exprs.push('bible.storySummaryShort = :ss');
            vals[':ss'] = b.storySummaryShort;
        }
        if (b.charactersSummary !== undefined) {
            exprs.push('bible.charactersSummary = :cs');
            vals[':cs'] = b.charactersSummary;
        }
        if (b.settingSummary !== undefined) {
            exprs.push('bible.settingSummary = :sts');
            vals[':sts'] = b.settingSummary;
        }
        if (b.conflictSummary !== undefined) {
            exprs.push('bible.conflictSummary = :cos');
            vals[':cos'] = b.conflictSummary;
        }
        if (b.themeNotes !== undefined) {
            exprs.push('bible.themeNotes = :tn');
            vals[':tn'] = b.themeNotes;
        }
    }
    try {
        const result = await docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: STORIES_TABLE,
            Key: { storyId },
            UpdateExpression: `SET ${exprs.join(', ')}`,
            ExpressionAttributeValues: vals,
            ...(Object.keys(names).length > 0 && { ExpressionAttributeNames: names }),
            ConditionExpression: 'attribute_exists(storyId)',
            ReturnValues: 'ALL_NEW',
        }));
        return result.Attributes ?? null;
    }
    catch (error) {
        if (error instanceof Error && error.name === 'ConditionalCheckFailedException')
            return null;
        throw error;
    }
}
async function deleteStory(storyId) {
    await deleteStoryNodes(storyId);
    try {
        await docClient.send(new lib_dynamodb_1.DeleteCommand({
            TableName: STORIES_TABLE,
            Key: { storyId },
            ConditionExpression: 'attribute_exists(storyId)',
        }));
        return true;
    }
    catch (error) {
        if (error instanceof Error && error.name === 'ConditionalCheckFailedException')
            return false;
        throw error;
    }
}
async function createStoryNode(input) {
    const now = nowISO();
    const node = { ...input, createdAt: now, updatedAt: now };
    await docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: STORY_NODES_TABLE,
        Item: node,
        ConditionExpression: 'attribute_not_exists(storyId) AND attribute_not_exists(nodeId)',
    }));
    return node;
}
async function getStoryNode(storyId, nodeId) {
    const result = await docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: STORY_NODES_TABLE,
        Key: { storyId, nodeId },
    }));
    return result.Item ?? null;
}
async function getRootNode(storyId) {
    const result = await docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: STORY_NODES_TABLE,
        KeyConditionExpression: 'storyId = :sid',
        FilterExpression: 'depth = :zero',
        ExpressionAttributeValues: { ':sid': storyId, ':zero': 0 },
        Limit: 1,
    }));
    return result.Items?.[0] ?? null;
}
async function listNodesForStory(storyId, limit = 100) {
    const result = await docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: STORY_NODES_TABLE,
        KeyConditionExpression: 'storyId = :sid',
        ExpressionAttributeValues: { ':sid': storyId },
        Limit: limit,
    }));
    return result.Items ?? [];
}
async function updateStoryNode(storyId, nodeId, updates) {
    const now = nowISO();
    const exprs = ['updatedAt = :now'];
    const vals = { ':now': now };
    const names = {};
    if (updates.text !== undefined) {
        exprs.push('#text = :text');
        vals[':text'] = updates.text;
        names['#text'] = 'text';
    }
    if (updates.choices !== undefined) {
        exprs.push('choices = :ch');
        vals[':ch'] = updates.choices;
    }
    if (updates.localSummary !== undefined) {
        exprs.push('localSummary = :ls');
        vals[':ls'] = updates.localSummary;
    }
    if (updates.isEnding !== undefined) {
        exprs.push('isEnding = :ie');
        vals[':ie'] = updates.isEnding;
    }
    try {
        const result = await docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: STORY_NODES_TABLE,
            Key: { storyId, nodeId },
            UpdateExpression: `SET ${exprs.join(', ')}`,
            ExpressionAttributeValues: vals,
            ...(Object.keys(names).length > 0 && { ExpressionAttributeNames: names }),
            ConditionExpression: 'attribute_exists(storyId) AND attribute_exists(nodeId)',
            ReturnValues: 'ALL_NEW',
        }));
        return result.Attributes ?? null;
    }
    catch (error) {
        if (error instanceof Error && error.name === 'ConditionalCheckFailedException')
            return null;
        throw error;
    }
}
async function batchGetNodes(storyId, nodeIds) {
    if (!nodeIds.length)
        return [];
    const results = [];
    for (let i = 0; i < nodeIds.length; i += 100) {
        const batch = nodeIds.slice(i, i + 100);
        const result = await docClient.send(new lib_dynamodb_1.BatchGetCommand({
            RequestItems: {
                [STORY_NODES_TABLE]: { Keys: batch.map(nodeId => ({ storyId, nodeId })) },
            },
        }));
        const items = result.Responses?.[STORY_NODES_TABLE];
        if (items)
            results.push(...items);
    }
    return results;
}
async function getPathToNode(storyId, nodeId) {
    const path = [];
    let currentId = nodeId;
    while (currentId) {
        const node = await getStoryNode(storyId, currentId);
        if (!node)
            return [];
        path.unshift(node);
        currentId = node.parentNodeId;
    }
    return path;
}
async function deleteStoryNodes(storyId) {
    const nodes = await listNodesForStory(storyId, 1000);
    if (!nodes.length)
        return 0;
    for (let i = 0; i < nodes.length; i += 25) {
        const batch = nodes.slice(i, i + 25);
        await docClient.send(new lib_dynamodb_1.BatchWriteCommand({
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
async function getNodeByChapterIndex(storyId, chapterIndex) {
    const result = await docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: STORY_NODES_TABLE,
        KeyConditionExpression: 'storyId = :sid',
        FilterExpression: 'chapterIndex = :ci',
        ExpressionAttributeValues: { ':sid': storyId, ':ci': chapterIndex },
        Limit: 10,
    }));
    const nodes = result.Items;
    return nodes?.[0] ?? null;
}
