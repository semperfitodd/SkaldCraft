"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const crypto_1 = require("crypto");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const USERS_TABLE = process.env.USERS_TABLE;
const CHILD_PROFILES_TABLE = process.env.CHILD_PROFILES_TABLE;
const MAX_CHILD_PROFILES = 5;
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
const VALID_CHILD_GENRES = [
    'adventure', 'animals', 'sports', 'school-life', 'history',
    'science-space', 'funny', 'mystery', 'fairy-tales', 'comic-style'
];
const VALID_LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'];
const VALID_GRL_VALUES = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'Z+'
];
const VALID_READING_AGE_BANDS = ['prek', 'early-elementary', 'upper-elementary', 'middle-school'];
function createResponse(statusCode, body) {
    return {
        statusCode,
        headers: CORS_HEADERS,
        body: JSON.stringify(body),
    };
}
function calculateAgeFromBirthday(birthday) {
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}
function deriveReadingAgeBandFromAge(age) {
    if (age < 5)
        return 'prek';
    if (age < 8)
        return 'early-elementary';
    if (age < 11)
        return 'upper-elementary';
    return 'middle-school';
}
function enforceExplicitContentRule(birthday, requestedValue) {
    const age = calculateAgeFromBirthday(birthday);
    if (age < 18) {
        return false;
    }
    return requestedValue ?? false;
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
function validateCreateChildProfile(data) {
    if (!data.displayName || typeof data.displayName !== 'string' || data.displayName.trim().length === 0) {
        return 'displayName is required and must be a non-empty string';
    }
    if (!data.birthday) {
        return 'birthday is required';
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.birthday)) {
        return 'birthday must be in YYYY-MM-DD format';
    }
    const birthDate = new Date(data.birthday);
    if (isNaN(birthDate.getTime())) {
        return 'birthday must be a valid date';
    }
    if (!data.readingLevelGRL) {
        return 'readingLevelGRL is required';
    }
    if (!VALID_GRL_VALUES.includes(data.readingLevelGRL)) {
        return `Invalid readingLevelGRL. Must be one of: ${VALID_GRL_VALUES.join(', ')}`;
    }
    if (!data.preferredGenres || !Array.isArray(data.preferredGenres) || data.preferredGenres.length === 0) {
        return 'preferredGenres must be a non-empty array';
    }
    for (const genre of data.preferredGenres) {
        if (!VALID_CHILD_GENRES.includes(genre)) {
            return `Invalid child genre: ${genre}. Must be one of: ${VALID_CHILD_GENRES.join(', ')}`;
        }
    }
    if (data.readingAgeBand !== undefined && !VALID_READING_AGE_BANDS.includes(data.readingAgeBand)) {
        return `Invalid readingAgeBand. Must be one of: ${VALID_READING_AGE_BANDS.join(', ')}`;
    }
    if (data.defaultLanguage !== undefined && !VALID_LANGUAGES.includes(data.defaultLanguage)) {
        return `Invalid defaultLanguage. Must be one of: ${VALID_LANGUAGES.join(', ')}`;
    }
    return null;
}
function validateUpdateChildProfile(data) {
    if (data.displayName !== undefined) {
        if (typeof data.displayName !== 'string' || data.displayName.trim().length === 0) {
            return 'displayName must be a non-empty string';
        }
    }
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
    if (data.readingLevelGRL !== undefined && !VALID_GRL_VALUES.includes(data.readingLevelGRL)) {
        return `Invalid readingLevelGRL. Must be one of: ${VALID_GRL_VALUES.join(', ')}`;
    }
    if (data.preferredGenres !== undefined) {
        if (!Array.isArray(data.preferredGenres) || data.preferredGenres.length === 0) {
            return 'preferredGenres must be a non-empty array';
        }
        for (const genre of data.preferredGenres) {
            if (!VALID_CHILD_GENRES.includes(genre)) {
                return `Invalid child genre: ${genre}. Must be one of: ${VALID_CHILD_GENRES.join(', ')}`;
            }
        }
    }
    if (data.readingAgeBand !== undefined && !VALID_READING_AGE_BANDS.includes(data.readingAgeBand)) {
        return `Invalid readingAgeBand. Must be one of: ${VALID_READING_AGE_BANDS.join(', ')}`;
    }
    if (data.defaultLanguage !== undefined && !VALID_LANGUAGES.includes(data.defaultLanguage)) {
        return `Invalid defaultLanguage. Must be one of: ${VALID_LANGUAGES.join(', ')}`;
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
async function getChildProfilesByParent(parentEmail) {
    const result = await docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: CHILD_PROFILES_TABLE,
        KeyConditionExpression: 'parentEmail = :email',
        ExpressionAttributeValues: {
            ':email': parentEmail,
        },
    }));
    return (result.Items || []);
}
async function getChildProfile(parentEmail, profileId) {
    const result = await docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: CHILD_PROFILES_TABLE,
        Key: { parentEmail, profileId },
    }));
    return result.Item || null;
}
async function createChildProfile(parentEmail, data) {
    const now = new Date().toISOString();
    const profileId = (0, crypto_1.randomUUID)();
    const age = calculateAgeFromBirthday(data.birthday);
    const childProfile = {
        parentEmail,
        profileId,
        displayName: data.displayName.trim(),
        birthday: data.birthday,
        createdAt: now,
        updatedAt: now,
        defaultLanguage: data.defaultLanguage || DEFAULT_LANGUAGE,
        explicitContentAllowed: enforceExplicitContentRule(data.birthday, data.explicitContentAllowed),
        preferredGenres: data.preferredGenres,
        readingLevelGRL: data.readingLevelGRL,
        readingAgeBand: data.readingAgeBand || deriveReadingAgeBandFromAge(age),
        isActive: false,
    };
    await docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: CHILD_PROFILES_TABLE,
        Item: childProfile,
    }));
    return childProfile;
}
async function updateChildProfile(parentEmail, profileId, updates) {
    const existing = await getChildProfile(parentEmail, profileId);
    if (!existing)
        return null;
    const now = new Date().toISOString();
    const updateExpressions = ['updatedAt = :updatedAt'];
    const expressionValues = { ':updatedAt': now };
    const birthdayToUse = updates.birthday || existing.birthday;
    if (updates.displayName !== undefined) {
        updateExpressions.push('displayName = :displayName');
        expressionValues[':displayName'] = updates.displayName.trim();
    }
    if (updates.birthday !== undefined) {
        updateExpressions.push('birthday = :birthday');
        expressionValues[':birthday'] = updates.birthday;
        if (updates.readingAgeBand === undefined) {
            const newAge = calculateAgeFromBirthday(updates.birthday);
            updateExpressions.push('readingAgeBand = :readingAgeBand');
            expressionValues[':readingAgeBand'] = deriveReadingAgeBandFromAge(newAge);
        }
    }
    if (updates.readingLevelGRL !== undefined) {
        updateExpressions.push('readingLevelGRL = :readingLevelGRL');
        expressionValues[':readingLevelGRL'] = updates.readingLevelGRL;
    }
    if (updates.readingAgeBand !== undefined) {
        updateExpressions.push('readingAgeBand = :readingAgeBand');
        expressionValues[':readingAgeBand'] = updates.readingAgeBand;
    }
    if (updates.preferredGenres !== undefined) {
        updateExpressions.push('preferredGenres = :preferredGenres');
        expressionValues[':preferredGenres'] = updates.preferredGenres;
    }
    if (updates.defaultLanguage !== undefined) {
        updateExpressions.push('defaultLanguage = :defaultLanguage');
        expressionValues[':defaultLanguage'] = updates.defaultLanguage;
    }
    const explicitAllowed = enforceExplicitContentRule(birthdayToUse, updates.explicitContentAllowed ?? existing.explicitContentAllowed);
    updateExpressions.push('explicitContentAllowed = :explicitContentAllowed');
    expressionValues[':explicitContentAllowed'] = explicitAllowed;
    await docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: CHILD_PROFILES_TABLE,
        Key: { parentEmail, profileId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeValues: expressionValues,
    }));
    return {
        ...existing,
        displayName: updates.displayName?.trim() ?? existing.displayName,
        birthday: updates.birthday ?? existing.birthday,
        readingLevelGRL: updates.readingLevelGRL ?? existing.readingLevelGRL,
        readingAgeBand: updates.readingAgeBand ?? (updates.birthday ? deriveReadingAgeBandFromAge(calculateAgeFromBirthday(updates.birthday)) : existing.readingAgeBand),
        preferredGenres: updates.preferredGenres ?? existing.preferredGenres,
        defaultLanguage: updates.defaultLanguage ?? existing.defaultLanguage,
        explicitContentAllowed: explicitAllowed,
        updatedAt: now,
    };
}
async function deleteChildProfile(parentEmail, profileId) {
    const existing = await getChildProfile(parentEmail, profileId);
    if (!existing)
        return false;
    await docClient.send(new lib_dynamodb_1.DeleteCommand({
        TableName: CHILD_PROFILES_TABLE,
        Key: { parentEmail, profileId },
    }));
    return true;
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
async function handleGetProfiles(email) {
    const user = await getUserByEmail(email);
    if (!user) {
        return createResponse(404, { error: 'User not found' });
    }
    const children = await getChildProfilesByParent(email);
    const response = {
        parent: {
            email: user.email,
            displayName: user.givenName && user.familyName
                ? `${user.givenName} ${user.familyName}`
                : user.givenName || user.email.split('@')[0],
            givenName: user.givenName,
            familyName: user.familyName,
            birthday: user.birthday,
            explicitContentAllowed: user.explicitContentAllowed ?? DEFAULT_EXPLICIT,
            preferredGenres: user.preferredGenres || DEFAULT_GENRES,
            defaultLanguage: user.defaultLanguage || DEFAULT_LANGUAGE,
            onboardingComplete: user.onboardingComplete,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
        },
        children,
    };
    return createResponse(200, response);
}
async function handleCreateChildProfile(email, body) {
    if (!body) {
        return createResponse(400, { error: 'Request body is required' });
    }
    let data;
    try {
        data = JSON.parse(body);
    }
    catch {
        return createResponse(400, { error: 'Invalid JSON in request body' });
    }
    const validationError = validateCreateChildProfile(data);
    if (validationError) {
        return createResponse(400, { error: validationError });
    }
    const existingChildren = await getChildProfilesByParent(email);
    if (existingChildren.length >= MAX_CHILD_PROFILES) {
        return createResponse(400, {
            error: `Maximum of ${MAX_CHILD_PROFILES} child profiles allowed per account`
        });
    }
    const childProfile = await createChildProfile(email, data);
    return createResponse(201, childProfile);
}
async function handleUpdateChildProfile(email, profileId, body) {
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
    const validationError = validateUpdateChildProfile(updates);
    if (validationError) {
        return createResponse(400, { error: validationError });
    }
    const updatedProfile = await updateChildProfile(email, profileId, updates);
    if (!updatedProfile) {
        return createResponse(404, { error: 'Child profile not found' });
    }
    return createResponse(200, updatedProfile);
}
async function handleDeleteChildProfile(email, profileId) {
    const deleted = await deleteChildProfile(email, profileId);
    if (!deleted) {
        return createResponse(404, { error: 'Child profile not found' });
    }
    return createResponse(200, { message: 'Child profile deleted successfully' });
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
        if (path === '/profiles' && method === 'GET') {
            return handleGetProfiles(email);
        }
        if (path === '/profiles' && method === 'POST') {
            return handleCreateChildProfile(email, event.body);
        }
        const profileIdMatch = path.match(/^\/profiles\/([a-zA-Z0-9-]+)$/);
        if (profileIdMatch) {
            const profileId = profileIdMatch[1];
            if (method === 'PUT') {
                return handleUpdateChildProfile(email, profileId, event.body);
            }
            if (method === 'DELETE') {
                return handleDeleteChildProfile(email, profileId);
            }
        }
        return handleGetMe(email, cognitoSub, givenName, familyName);
    }
    catch (error) {
        console.error('Error processing request:', error);
        return createResponse(500, { error: 'Internal server error' });
    }
};
exports.handler = handler;
