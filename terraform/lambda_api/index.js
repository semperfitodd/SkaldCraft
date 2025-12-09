"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const USERS_TABLE = process.env.USERS_TABLE;
const CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
};
const DEFAULT_GENRES = ['fantasy'];
const DEFAULT_LANGUAGE = 'en';
const DEFAULT_EXPLICIT = false;
const VALID_GENRES = [
    'fantasy', 'mystery', 'sci-fi', 'romance', 'thriller', 'horror',
    'historical', 'literary', 'adventure', 'humor', 'drama', 'western',
    'paranormal', 'dystopian', 'mythology', 'fairy-tale', 'steampunk', 'noir'
];
const VALID_LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'];
function createResponse(statusCode, body) {
    return {
        statusCode,
        headers: CORS_HEADERS,
        body: JSON.stringify(body),
    };
}
function toUserProfileResponse(user) {
    return {
        email: user.email,
        givenName: user.givenName,
        familyName: user.familyName,
        defaultProfileType: user.defaultProfileType,
        onboardingComplete: user.onboardingComplete,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        profile: {
            birthday: user.birthday,
            preferredGenres: user.preferredGenres || DEFAULT_GENRES,
            defaultLanguage: user.defaultLanguage || DEFAULT_LANGUAGE,
            explicitContentAllowed: user.explicitContentAllowed ?? DEFAULT_EXPLICIT,
        },
    };
}
function validateProfileUpdate(data) {
    if (data.birthday !== undefined) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(data.birthday)) {
            return 'birthday must be in YYYY-MM-DD format';
        }
        const birthDate = new Date(data.birthday);
        if (isNaN(birthDate.getTime())) {
            return 'birthday must be a valid date';
        }
    }
    if (data.preferredGenres !== undefined) {
        if (!Array.isArray(data.preferredGenres)) {
            return 'preferredGenres must be an array';
        }
        for (const genre of data.preferredGenres) {
            if (!VALID_GENRES.includes(genre)) {
                return `Invalid genre: ${genre}. Must be one of: ${VALID_GENRES.join(', ')}`;
            }
        }
        if (data.preferredGenres.length === 0) {
            return 'preferredGenres must contain at least one genre';
        }
    }
    if (data.defaultLanguage !== undefined && !VALID_LANGUAGES.includes(data.defaultLanguage)) {
        return `Invalid defaultLanguage. Must be one of: ${VALID_LANGUAGES.join(', ')}`;
    }
    if (data.explicitContentAllowed !== undefined && typeof data.explicitContentAllowed !== 'boolean') {
        return 'explicitContentAllowed must be a boolean';
    }
    if (data.onboardingComplete !== undefined && typeof data.onboardingComplete !== 'boolean') {
        return 'onboardingComplete must be a boolean';
    }
    return null;
}
async function getOrCreateUser(email, cognitoSub, givenName, familyName) {
    const now = new Date().toISOString();
    const getResult = await docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: USERS_TABLE,
        Key: { email },
    }));
    if (getResult.Item) {
        const existingUser = getResult.Item;
        const cognitoSubs = existingUser.cognitoSubs || [];
        const updatedSubs = cognitoSubs.includes(cognitoSub)
            ? cognitoSubs
            : [...cognitoSubs, cognitoSub];
        await docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: USERS_TABLE,
            Key: { email },
            UpdateExpression: 'SET lastLoginAt = :lastLogin, cognitoSubs = :subs',
            ExpressionAttributeValues: {
                ':lastLogin': now,
                ':subs': updatedSubs,
            },
        }));
        return {
            ...existingUser,
            cognitoSubs: updatedSubs,
            lastLoginAt: now,
            preferredGenres: existingUser.preferredGenres || DEFAULT_GENRES,
            defaultLanguage: existingUser.defaultLanguage || DEFAULT_LANGUAGE,
            explicitContentAllowed: existingUser.explicitContentAllowed ?? DEFAULT_EXPLICIT,
        };
    }
    const newUser = {
        email,
        cognitoSubs: [cognitoSub],
        givenName,
        familyName,
        createdAt: now,
        lastLoginAt: now,
        defaultProfileType: 'adult',
        onboardingComplete: false,
        preferredGenres: DEFAULT_GENRES,
        defaultLanguage: DEFAULT_LANGUAGE,
        explicitContentAllowed: DEFAULT_EXPLICIT,
    };
    await docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: USERS_TABLE,
        Item: newUser,
    }));
    return newUser;
}
async function getUserByEmail(email) {
    const result = await docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: USERS_TABLE,
        Key: { email },
    }));
    if (!result.Item)
        return null;
    const user = result.Item;
    return {
        ...user,
        preferredGenres: user.preferredGenres || DEFAULT_GENRES,
        defaultLanguage: user.defaultLanguage || DEFAULT_LANGUAGE,
        explicitContentAllowed: user.explicitContentAllowed ?? DEFAULT_EXPLICIT,
    };
}
async function updateUserProfile(email, updates) {
    const user = await getUserByEmail(email);
    if (!user)
        return null;
    const now = new Date().toISOString();
    const updateExpressions = ['lastLoginAt = :lastLogin'];
    const expressionValues = { ':lastLogin': now };
    if (updates.birthday !== undefined) {
        updateExpressions.push('birthday = :birthday');
        expressionValues[':birthday'] = updates.birthday;
    }
    if (updates.preferredGenres !== undefined) {
        updateExpressions.push('preferredGenres = :genres');
        expressionValues[':genres'] = updates.preferredGenres;
    }
    if (updates.defaultLanguage !== undefined) {
        updateExpressions.push('defaultLanguage = :lang');
        expressionValues[':lang'] = updates.defaultLanguage;
    }
    if (updates.explicitContentAllowed !== undefined) {
        updateExpressions.push('explicitContentAllowed = :explicit');
        expressionValues[':explicit'] = updates.explicitContentAllowed;
    }
    if (updates.onboardingComplete !== undefined) {
        updateExpressions.push('onboardingComplete = :onboarding');
        expressionValues[':onboarding'] = updates.onboardingComplete;
    }
    await docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: USERS_TABLE,
        Key: { email },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeValues: expressionValues,
    }));
    return {
        ...user,
        birthday: updates.birthday ?? user.birthday,
        preferredGenres: updates.preferredGenres ?? user.preferredGenres,
        defaultLanguage: updates.defaultLanguage ?? user.defaultLanguage,
        explicitContentAllowed: updates.explicitContentAllowed ?? user.explicitContentAllowed,
        onboardingComplete: updates.onboardingComplete ?? user.onboardingComplete,
        lastLoginAt: now,
    };
}
async function handleGetMe(email, cognitoSub, givenName, familyName) {
    const user = await getOrCreateUser(email, cognitoSub, givenName, familyName);
    return createResponse(200, toUserProfileResponse(user));
}
async function handleGetProfile(email) {
    const user = await getUserByEmail(email);
    if (!user) {
        return createResponse(404, { error: 'User not found' });
    }
    return createResponse(200, toUserProfileResponse(user));
}
async function handleUpdateProfile(email, body) {
    if (!body) {
        return createResponse(400, { error: 'Request body is required' });
    }
    let updates;
    try {
        updates = JSON.parse(body);
    }
    catch {
        return createResponse(400, { error: 'Invalid JSON in request body' });
    }
    const validationError = validateProfileUpdate(updates);
    if (validationError) {
        return createResponse(400, { error: validationError });
    }
    const updatedUser = await updateUserProfile(email, updates);
    if (!updatedUser) {
        return createResponse(404, { error: 'User not found' });
    }
    return createResponse(200, toUserProfileResponse(updatedUser));
}
const handler = async (event) => {
    try {
        const claims = event.requestContext?.authorizer?.jwt?.claims || {};
        const cognitoSub = claims.sub;
        const email = claims.email;
        const givenName = claims.given_name;
        const familyName = claims.family_name;
        const method = event.requestContext?.http?.method || 'GET';
        const path = event.rawPath || event.requestContext?.http?.path || '/';
        if (!email) {
            return createResponse(401, { error: 'Unauthorized: Missing email' });
        }
        if (!cognitoSub) {
            return createResponse(401, { error: 'Unauthorized: Missing user ID' });
        }
        if (path === '/me' && method === 'GET') {
            return handleGetMe(email, cognitoSub, givenName, familyName);
        }
        if (path === '/profile' && method === 'GET') {
            return handleGetProfile(email);
        }
        if (path === '/profile' && method === 'PUT') {
            return handleUpdateProfile(email, event.body);
        }
        return handleGetMe(email, cognitoSub, givenName, familyName);
    }
    catch (error) {
        console.error('Error processing request:', error);
        return createResponse(500, { error: 'Internal server error' });
    }
};
exports.handler = handler;
