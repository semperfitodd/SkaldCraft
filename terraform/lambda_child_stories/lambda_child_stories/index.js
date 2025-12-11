"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_lambda_1 = require("@aws-sdk/client-lambda");
const constants_1 = require("./constants");
const repository_1 = require("./repository");
const storyEngine_1 = require("./storyEngine");
const utils_1 = require("lambda_shared/utils");
const profileRepository_1 = require("lambda_shared/profileRepository");
const lambdaClient = new client_lambda_1.LambdaClient({});
const MAX_CUSTOM_PROMPT_LENGTH = 500;
const MAX_TITLE_LENGTH = 200;
const MAX_USER_HINT_LENGTH = 200;
const ddbClient = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(ddbClient);
const USERS_TABLE = process.env.USERS_TABLE;
async function invokeAsync(payload) {
    const functionName = process.env.LAMBDA_FUNCTION_NAME;
    if (!functionName) {
        throw new Error('LAMBDA_FUNCTION_NAME environment variable not set');
    }
    const command = new client_lambda_1.InvokeCommand({
        FunctionName: functionName,
        InvocationType: 'Event', // Async invoke
        Payload: JSON.stringify(payload),
    });
    try {
        await lambdaClient.send(command);
        console.log('[ChildLambda] Async invocation triggered', { action: payload.action });
    }
    catch (error) {
        console.error('[ChildLambda] Failed to trigger async invocation', {
            action: payload.action,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
}
function isAdultProfile(user) {
    return !!user.birthday && (0, utils_1.calculateAgeFromBirthday)(user.birthday) >= constants_1.ADULT_AGE_THRESHOLD;
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
function validateCreateChildStory(data) {
    if (!data.profileId)
        return 'profileId is required';
    if (!data.readingPurpose)
        return 'readingPurpose is required';
    if (!constants_1.READING_PURPOSES.includes(data.readingPurpose)) {
        return 'readingPurpose must be one of: school, fun, bedtime';
    }
    if (!constants_1.STORY_LENGTHS.includes(data.targetLength))
        return 'Invalid targetLength';
    if (data.genre != null && !constants_1.ALL_GENRES.includes(data.genre))
        return 'Invalid genre';
    if (data.tone != null && !constants_1.STORY_TONES.includes(data.tone))
        return 'Invalid tone';
    if (data.pov != null && !constants_1.STORY_POVS.includes(data.pov))
        return 'Invalid pov';
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
function validateContinueChildStory(data) {
    if (!data.choiceId)
        return 'choiceId is required';
    if (data.userHint && data.userHint.length > MAX_USER_HINT_LENGTH) {
        return `userHint must be ${MAX_USER_HINT_LENGTH} characters or less`;
    }
    return null;
}
async function handleCreateChildStory(email, body) {
    const data = (0, utils_1.parseBody)(body);
    if (!data)
        return (0, utils_1.createResponse)(400, { error: 'Invalid JSON' });
    const validationError = validateCreateChildStory(data);
    if (validationError)
        return (0, utils_1.createResponse)(400, { error: validationError });
    const user = await getUserProfile(email);
    if (!user)
        return (0, utils_1.createResponse)(404, { error: 'User profile not found' });
    // Fetch the child profile
    const childProfile = await (0, profileRepository_1.getChildProfile)(email, data.profileId);
    if (!childProfile) {
        return (0, utils_1.createResponse)(404, { error: 'Child profile not found' });
    }
    // Verify the child profile belongs to the authenticated parent
    if (childProfile.parentEmail !== email) {
        return (0, utils_1.createResponse)(403, { error: 'You do not have permission to create stories for this profile' });
    }
    // Verify the child has a birthday
    if (!childProfile.birthday) {
        return (0, utils_1.createResponse)(403, { error: 'Child profile requires a verified birthday' });
    }
    const childAge = (0, utils_1.calculateAgeFromBirthday)(childProfile.birthday);
    const storyOptions = {
        profileId: data.profileId,
        userEmail: email,
        readingPurpose: data.readingPurpose,
        readingLevel: data.readingLevel || childProfile.readingLevelGRL,
        gradeLevel: data.gradeLevel,
        age: data.age || childAge,
        title: data.title ?? undefined,
        genre: data.genre,
        tone: data.tone,
        pov: data.pov,
        targetLength: data.targetLength,
        customPrompt: data.customPrompt,
    };
    try {
        const { story } = await (0, storyEngine_1.initChildStory)(storyOptions);
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
        return (0, utils_1.createResponse)(202, { story, status: 'creating' });
    }
    catch (error) {
        console.error('[ChildStories] Failed to initialize story', {
            profileId: data.profileId,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        });
        return (0, utils_1.createResponse)(500, { error: 'Failed to create story' });
    }
}
async function handleContinueChildStory(email, storyId, body) {
    const data = (0, utils_1.parseBody)(body);
    if (!data)
        return (0, utils_1.createResponse)(400, { error: 'Invalid JSON' });
    const validationError = validateContinueChildStory(data);
    if (validationError)
        return (0, utils_1.createResponse)(400, { error: validationError });
    const user = await getUserProfile(email);
    if (!user)
        return (0, utils_1.createResponse)(404, { error: 'User profile not found' });
    const story = await (0, repository_1.getStoryById)(storyId);
    if (!story)
        return (0, utils_1.createResponse)(404, { error: 'Story not found' });
    // Fetch the child profile to verify ownership
    const childProfile = await (0, profileRepository_1.getChildProfile)(email, story.profileId);
    if (!childProfile) {
        return (0, utils_1.createResponse)(404, { error: 'Child profile not found' });
    }
    // Verify the child profile belongs to the authenticated parent
    if (childProfile.parentEmail !== email) {
        return (0, utils_1.createResponse)(403, { error: 'Story does not belong to a profile you own' });
    }
    const childOptions = {
        profileId: story.profileId, // Use the story's actual profileId (child UUID)
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
        const { story: updatedStory } = await (0, storyEngine_1.initContinueChildStory)({
            storyId,
            choiceId: data.choiceId,
            userEmail: email,
            profileId: story.profileId, // Use the story's actual profileId (child UUID)
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
        return (0, utils_1.createResponse)(202, { story: updatedStory, status: 'generating_chapter' });
    }
    catch (error) {
        console.error('[ChildStories] Failed to initialize continue', {
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
                return (0, utils_1.createResponse)(mapped.status, { error: mapped.message });
        }
        return (0, utils_1.createResponse)(500, { error: 'Failed to continue story' });
    }
}
const handler = async (event, context) => {
    if (event.action && event.data) {
        console.log('[ChildLambda] Background invocation detected', { action: event.action });
        try {
            if (event.action === 'generateChildStory') {
                const { storyId, storyOptions } = event.data;
                await (0, storyEngine_1.generateChildStoryContent)(storyId, storyOptions);
                console.log('[ChildLambda] Background story generation complete', { storyId });
                return;
            }
            if (event.action === 'generateNextChildChapter') {
                const { storyId, email, childOptions, userHint } = event.data;
                await (0, storyEngine_1.generateNextChildChapter)(storyId, email, childOptions, userHint);
                console.log('[ChildLambda] Background chapter generation complete', { storyId });
                return;
            }
            console.warn('[ChildLambda] Unknown background action', { action: event.action });
        }
        catch (error) {
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
        if (!email)
            return (0, utils_1.createResponse)(401, { error: 'Unauthorized' });
        if (path === '/stories/child' && method === 'POST') {
            return handleCreateChildStory(email, event.body);
        }
        const continueMatch = path.match(/^\/stories\/child\/([a-zA-Z0-9-]+)\/continue$/);
        if (continueMatch && method === 'POST') {
            return handleContinueChildStory(email, continueMatch[1], event.body);
        }
        return (0, utils_1.createResponse)(404, { error: 'Not found' });
    }
    catch (error) {
        console.error('[ChildLambda] Error:', error);
        return (0, utils_1.createResponse)(500, { error: 'Internal server error' });
    }
};
exports.handler = handler;
