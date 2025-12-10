"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const crypto_1 = require("crypto");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const repository_1 = require("./repository");
const storyEngine_1 = require("./storyEngine");
const CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
};
const VALID_AGE_BANDS = ['adult', 'teen', 'middle-school', 'upper-elementary', 'early-elementary', 'prek'];
const VALID_GENRES = [
    'fantasy', 'mystery', 'sci-fi', 'romance', 'thriller', 'horror',
    'historical', 'literary', 'adventure', 'humor', 'drama', 'western',
    'paranormal', 'dystopian', 'mythology', 'fairy-tale', 'steampunk', 'noir',
    'animals', 'sports', 'school-life', 'science-space', 'funny', 'comic-style',
];
const VALID_TONES = ['light', 'serious', 'dark', 'epic', 'humorous'];
const VALID_POVS = ['first-person', 'third-person-limited', 'third-person-omniscient'];
const VALID_LENGTHS = ['short', 'medium', 'long'];
const VALID_STATUSES = ['in_progress', 'completed', 'abandoned'];
const MAX_CUSTOM_PROMPT_LENGTH = 500;
const MAX_TITLE_LENGTH = 200;
const MAX_USER_HINT_LENGTH = 200;
const ADULT_AGE_THRESHOLD = 18;
const ddbClient = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(ddbClient);
const USERS_TABLE = process.env.USERS_TABLE;
function response(statusCode, body) {
    return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}
function parseJSON(body) {
    if (!body)
        return null;
    try {
        return JSON.parse(body);
    }
    catch {
        return null;
    }
}
function calculateAge(birthday) {
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}
function isAdultProfile(user) {
    return !!user.birthday && calculateAge(user.birthday) >= ADULT_AGE_THRESHOLD;
}
async function getUserProfile(email) {
    const result = await docClient.send(new lib_dynamodb_1.GetCommand({ TableName: USERS_TABLE, Key: { email } }));
    if (!result.Item)
        return null;
    return {
        email: result.Item.email,
        birthday: result.Item.birthday,
        explicitContentAllowed: result.Item.explicitContentAllowed ?? false,
    };
}
function validateConfig(config) {
    if (!config)
        return 'config is required';
    if (!VALID_AGE_BANDS.includes(config.ageBand))
        return 'Invalid ageBand';
    if (!VALID_GENRES.includes(config.genre))
        return 'Invalid genre';
    if (!VALID_TONES.includes(config.tone))
        return 'Invalid tone';
    if (!VALID_POVS.includes(config.pov))
        return 'Invalid pov';
    if (!VALID_LENGTHS.includes(config.targetLength))
        return 'Invalid targetLength';
    if (typeof config.explicitContentAllowed !== 'boolean')
        return 'explicitContentAllowed must be boolean';
    return null;
}
function validateCreateStory(data) {
    if (!data.title?.trim())
        return 'title is required';
    if (!data.profileId)
        return 'profileId is required';
    return validateConfig(data.config);
}
function validateCreateNode(data) {
    if (typeof data.depth !== 'number' || data.depth < 0)
        return 'depth must be non-negative';
    if (typeof data.chapterIndex !== 'number' || data.chapterIndex < 0)
        return 'chapterIndex must be non-negative';
    if (!data.text)
        return 'text is required';
    if (!Array.isArray(data.choices))
        return 'choices must be array';
    for (const c of data.choices) {
        if (!c.choiceId || !c.label)
            return 'Each choice needs choiceId and label';
    }
    if (typeof data.isEnding !== 'boolean')
        return 'isEnding must be boolean';
    if (data.isEnding && data.choices.length > 0)
        return 'Ending nodes cannot have choices';
    return null;
}
function validateCreateAdultStory(data) {
    if (!data.profileId)
        return 'profileId is required';
    if (!VALID_LENGTHS.includes(data.targetLength))
        return 'Invalid targetLength';
    if (data.genre != null && !VALID_GENRES.includes(data.genre))
        return 'Invalid genre';
    if (data.tone != null && !VALID_TONES.includes(data.tone))
        return 'Invalid tone';
    if (data.pov != null && !VALID_POVS.includes(data.pov))
        return 'Invalid pov';
    if (data.customPrompt && data.customPrompt.length > MAX_CUSTOM_PROMPT_LENGTH) {
        return `customPrompt must be ${MAX_CUSTOM_PROMPT_LENGTH} characters or less`;
    }
    if (data.title && data.title.length > MAX_TITLE_LENGTH) {
        return `title must be ${MAX_TITLE_LENGTH} characters or less`;
    }
    return null;
}
function validateContinueStory(data) {
    if (!data.choiceId)
        return 'choiceId is required';
    if (data.userHint && data.userHint.length > MAX_USER_HINT_LENGTH) {
        return `userHint must be ${MAX_USER_HINT_LENGTH} characters or less`;
    }
    return null;
}
async function handleListStories(email, query) {
    const profileId = query?.profileId || email;
    const limit = query?.limit ? parseInt(query.limit, 10) : 20;
    const stories = await (0, repository_1.listStoriesByProfile)(profileId, limit);
    return response(200, { stories });
}
async function handleCreateStory(body) {
    const data = parseJSON(body);
    if (!data)
        return response(400, { error: 'Invalid JSON' });
    const err = validateCreateStory(data);
    if (err)
        return response(400, { error: err });
    const storyId = (0, crypto_1.randomUUID)();
    const rootNodeId = (0, crypto_1.randomUUID)();
    const emptyBible = {
        storySummaryShort: '',
        charactersSummary: '',
        settingSummary: '',
        conflictSummary: '',
        themeNotes: '',
    };
    const emptyOutline = [];
    const targetNodeCount = storyEngine_1.LENGTH_TO_NODE_COUNT[data.config.targetLength];
    const input = {
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
    const story = await (0, repository_1.createStory)(input);
    return response(201, { story, rootNodeId });
}
async function handleGetStory(storyId, email) {
    const story = await (0, repository_1.getStoryById)(storyId);
    if (!story)
        return response(404, { error: 'Story not found' });
    if (story.profileId !== email) {
        return response(403, { error: 'Access denied' });
    }
    return response(200, {
        story,
        hasArchivedContent: story.isArchived && !!story.contentS3Key,
    });
}
async function handleUpdateStory(storyId, body) {
    const data = parseJSON(body);
    if (!data)
        return response(400, { error: 'Invalid JSON' });
    if (data.status !== undefined && !VALID_STATUSES.includes(data.status)) {
        return response(400, { error: 'Invalid status' });
    }
    const story = await (0, repository_1.updateStory)(storyId, data);
    if (!story)
        return response(404, { error: 'Story not found' });
    return response(200, { story });
}
async function handleDeleteStory(storyId) {
    const deleted = await (0, repository_1.deleteStory)(storyId);
    if (!deleted)
        return response(404, { error: 'Story not found' });
    return response(200, { message: 'Story deleted' });
}
async function handleListNodes(storyId, query) {
    const story = await (0, repository_1.getStoryById)(storyId);
    if (!story)
        return response(404, { error: 'Story not found' });
    const limit = query?.limit ? parseInt(query.limit, 10) : 100;
    const nodes = await (0, repository_1.listNodesForStory)(storyId, limit);
    return response(200, { nodes });
}
async function handleGetNode(storyId, nodeId) {
    const node = await (0, repository_1.getStoryNode)(storyId, nodeId);
    if (!node)
        return response(404, { error: 'Node not found' });
    return response(200, { node });
}
async function handleGetRootNode(storyId) {
    const node = await (0, repository_1.getRootNode)(storyId);
    if (!node)
        return response(404, { error: 'Root node not found' });
    return response(200, { node });
}
async function handleCreateNode(storyId, body) {
    const story = await (0, repository_1.getStoryById)(storyId);
    if (!story)
        return response(404, { error: 'Story not found' });
    const data = parseJSON(body);
    if (!data)
        return response(400, { error: 'Invalid JSON' });
    const err = validateCreateNode(data);
    if (err)
        return response(400, { error: err });
    const input = {
        storyId,
        nodeId: (0, crypto_1.randomUUID)(),
        parentNodeId: data.parentNodeId,
        choiceLabelFromParent: data.choiceLabelFromParent,
        chapterIndex: data.chapterIndex,
        depth: data.depth,
        text: data.text,
        choices: data.choices,
        localSummary: data.localSummary || '',
        isEnding: data.isEnding,
    };
    const node = await (0, repository_1.createStoryNode)(input);
    return response(201, { node });
}
async function handleUpdateNode(storyId, nodeId, body) {
    const data = parseJSON(body);
    if (!data)
        return response(400, { error: 'Invalid JSON' });
    const node = await (0, repository_1.updateStoryNode)(storyId, nodeId, data);
    if (!node)
        return response(404, { error: 'Node not found' });
    return response(200, { node });
}
async function handleCreateAdultStory(email, body) {
    const data = parseJSON(body);
    if (!data)
        return response(400, { error: 'Invalid JSON' });
    const validationError = validateCreateAdultStory(data);
    if (validationError)
        return response(400, { error: validationError });
    const user = await getUserProfile(email);
    if (!user)
        return response(404, { error: 'User profile not found' });
    if (!isAdultProfile(user)) {
        return response(403, { error: 'Adult story creation requires an adult profile with verified age' });
    }
    if (data.profileId !== email) {
        return response(403, { error: 'profileId must match authenticated user email for adult stories' });
    }
    const storyOptions = {
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
        const { story } = await (0, storyEngine_1.initAdultStory)(storyOptions);
        console.log('[Stories] Adult story initialized', {
            storyId: story.storyId,
            profileId: data.profileId,
            status: story.status,
        });
        (0, storyEngine_1.generateAdultStoryContent)(story.storyId, storyOptions).catch((error) => {
            console.error('[Stories] Background story generation failed', {
                storyId: story.storyId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        });
        return response(202, { story, status: 'creating' });
    }
    catch (error) {
        console.error('[Stories] Failed to initialize adult story', {
            profileId: data.profileId,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        });
        return response(500, { error: 'Failed to create story' });
    }
}
async function handleContinueStory(email, storyId, body) {
    const data = parseJSON(body);
    if (!data)
        return response(400, { error: 'Invalid JSON' });
    const validationError = validateContinueStory(data);
    if (validationError)
        return response(400, { error: validationError });
    const user = await getUserProfile(email);
    if (!user)
        return response(404, { error: 'User profile not found' });
    if (!isAdultProfile(user)) {
        return response(403, { error: 'Story continuation requires an adult profile' });
    }
    try {
        const { story } = await (0, storyEngine_1.initContinueStory)({
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
        (0, storyEngine_1.generateNextChapter)(storyId, email, data.userHint).catch((error) => {
            console.error('[Stories] Background chapter generation failed', {
                storyId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        });
        return response(202, { story, status: 'generating_chapter' });
    }
    catch (error) {
        console.error('[Stories] Failed to initialize continue story', {
            storyId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        if (error instanceof Error) {
            const errorMap = {
                'Story not found': { status: 404, message: 'Story not found' },
                'Story does not belong to this profile': { status: 403, message: 'Story does not belong to this profile' },
                'Story is already completed': { status: 400, message: 'Story is already completed' },
                'Story is archived and cannot be continued': { status: 400, message: 'Story is archived and cannot be continued' },
                'Chapter generation already in progress': { status: 409, message: 'Chapter generation already in progress' },
                'Invalid choice ID': { status: 400, message: 'Invalid choice ID' },
            };
            const mapped = errorMap[error.message];
            if (mapped)
                return response(mapped.status, { error: mapped.message });
        }
        return response(500, { error: 'Failed to continue story' });
    }
}
async function handleGetStoryCurrent(email, storyId) {
    const story = await (0, repository_1.getStoryById)(storyId);
    if (!story)
        return response(404, { error: 'Story not found' });
    if (story.profileId !== email) {
        return response(403, { error: 'Access denied' });
    }
    if (story.isArchived) {
        return response(400, { error: 'Story is archived. Use /archive endpoint instead.' });
    }
    const currentNode = await (0, repository_1.getStoryNode)(storyId, story.activeNodeId);
    if (!currentNode) {
        return response(404, { error: 'Current node not found' });
    }
    return response(200, {
        story,
        currentNode,
    });
}
async function handleGetStoryArchive(email, storyId) {
    const story = await (0, repository_1.getStoryById)(storyId);
    if (!story)
        return response(404, { error: 'Story not found' });
    if (story.profileId !== email) {
        return response(403, { error: 'Access denied' });
    }
    if (story.status !== 'completed') {
        return response(400, { error: 'Story is not completed yet' });
    }
    if (!story.isArchived || !story.contentS3Key) {
        try {
            await (0, storyEngine_1.archiveCompletedStory)(story);
        }
        catch (archiveError) {
            console.error('[Stories] Failed to archive story on demand', {
                storyId,
                error: archiveError instanceof Error ? archiveError.message : 'Unknown error',
            });
            return response(500, { error: 'Failed to archive story' });
        }
    }
    const archivedStory = await (0, storyEngine_1.getArchivedStory)(storyId);
    if (!archivedStory) {
        return response(404, { error: 'Archived story content not found' });
    }
    return response(200, archivedStory);
}
async function handleGetStoryChapter(email, storyId, chapterIndex) {
    const story = await (0, repository_1.getStoryById)(storyId);
    if (!story)
        return response(404, { error: 'Story not found' });
    if (story.profileId !== email) {
        return response(403, { error: 'Access denied' });
    }
    if (chapterIndex < 0 || chapterIndex >= story.outline.length) {
        return response(400, { error: 'Invalid chapter index' });
    }
    if (story.isArchived && story.contentS3Key) {
        const archivedStory = await (0, storyEngine_1.getArchivedStory)(storyId);
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
    const node = await (0, repository_1.getNodeByChapterIndex)(storyId, chapterIndex);
    if (!node) {
        return response(404, { error: 'Chapter not yet generated' });
    }
    return response(200, {
        node,
        outline: story.outline[chapterIndex],
    });
}
const handler = async (event) => {
    try {
        const claims = event.requestContext?.authorizer?.jwt?.claims || {};
        const email = claims.email;
        const method = event.requestContext?.http?.method || 'GET';
        const path = event.rawPath || event.requestContext?.http?.path || '/';
        if (!email)
            return response(401, { error: 'Unauthorized' });
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
            if (method === 'GET')
                return handleGetStory(storyId, email);
            if (method === 'PUT')
                return handleUpdateStory(storyId, event.body);
            if (method === 'DELETE')
                return handleDeleteStory(storyId);
        }
        const nodesMatch = path.match(/^\/stories\/([a-zA-Z0-9-]+)\/nodes$/);
        if (nodesMatch) {
            const storyId = nodesMatch[1];
            if (method === 'GET')
                return handleListNodes(storyId, event.queryStringParameters);
            if (method === 'POST')
                return handleCreateNode(storyId, event.body);
        }
        const rootMatch = path.match(/^\/stories\/([a-zA-Z0-9-]+)\/nodes\/root$/);
        if (rootMatch && method === 'GET') {
            return handleGetRootNode(rootMatch[1]);
        }
        const nodeMatch = path.match(/^\/stories\/([a-zA-Z0-9-]+)\/nodes\/([a-zA-Z0-9-]+)$/);
        if (nodeMatch) {
            const [, storyId, nodeId] = nodeMatch;
            if (method === 'GET')
                return handleGetNode(storyId, nodeId);
            if (method === 'PUT')
                return handleUpdateNode(storyId, nodeId, event.body);
        }
        return response(404, { error: 'Not found' });
    }
    catch (error) {
        console.error('Error:', error);
        return response(500, { error: 'Internal server error' });
    }
};
exports.handler = handler;
