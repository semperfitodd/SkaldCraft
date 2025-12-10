"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const crypto_1 = require("crypto");
const constants_1 = require("../lambda_shared/constants");
const utils_1 = require("../lambda_shared/utils");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const USERS_TABLE = process.env.USERS_TABLE;
const CHILD_PROFILES_TABLE = process.env.CHILD_PROFILES_TABLE;
const MAX_CHILD_PROFILES = 5;
const VALID_READING_AGE_BANDS = constants_1.VALID_CHILD_AGE_BANDS;
function response(statusCode, body) {
    return { statusCode, headers: constants_1.CORS_HEADERS, body: JSON.stringify(body) };
}
function deriveAgeBand(age) {
    if (age < 5)
        return 'prek';
    if (age < 8)
        return 'early-elementary';
    if (age < 11)
        return 'upper-elementary';
    return 'middle-school';
}
function enforceExplicitRule(birthday, requested) {
    return (0, utils_1.calculateAgeFromBirthday)(birthday) >= 18 ? (requested ?? false) : false;
}
function validateCreateChild(data) {
    if (!data.displayName?.trim())
        return 'displayName is required';
    if (!data.birthday || !(0, utils_1.isValidDate)(data.birthday))
        return 'birthday must be valid YYYY-MM-DD';
    if (!constants_1.VALID_GRL_VALUES.includes(data.readingLevelGRL))
        return 'Invalid readingLevelGRL';
    if (!data.preferredGenres?.length)
        return 'preferredGenres required';
    for (const g of data.preferredGenres) {
        if (!constants_1.VALID_CHILD_GENRES.includes(g))
            return `Invalid genre: ${g}`;
    }
    if (data.readingAgeBand && !VALID_READING_AGE_BANDS.includes(data.readingAgeBand))
        return 'Invalid readingAgeBand';
    if (data.defaultLanguage && !constants_1.VALID_LANGUAGES.includes(data.defaultLanguage))
        return 'Invalid language';
    return null;
}
function validateUpdateChild(data) {
    if (data.displayName !== undefined && !data.displayName.trim())
        return 'displayName cannot be empty';
    if (data.birthday !== undefined && !(0, utils_1.isValidDate)(data.birthday))
        return 'birthday must be valid YYYY-MM-DD';
    if (data.readingLevelGRL !== undefined && !constants_1.VALID_GRL_VALUES.includes(data.readingLevelGRL))
        return 'Invalid readingLevelGRL';
    if (data.preferredGenres !== undefined) {
        if (!data.preferredGenres.length)
            return 'preferredGenres cannot be empty';
        for (const g of data.preferredGenres) {
            if (!constants_1.VALID_CHILD_GENRES.includes(g))
                return `Invalid genre: ${g}`;
        }
    }
    if (data.readingAgeBand !== undefined && !VALID_READING_AGE_BANDS.includes(data.readingAgeBand))
        return 'Invalid readingAgeBand';
    if (data.defaultLanguage !== undefined && !constants_1.VALID_LANGUAGES.includes(data.defaultLanguage))
        return 'Invalid language';
    return null;
}
function validateUpdateProfile(data) {
    if (data.birthday !== undefined && !(0, utils_1.isValidDate)(data.birthday))
        return 'birthday must be valid YYYY-MM-DD';
    if (data.preferredGenres !== undefined) {
        if (!data.preferredGenres.length)
            return 'preferredGenres cannot be empty';
        for (const g of data.preferredGenres) {
            if (!constants_1.VALID_GENRES.includes(g))
                return `Invalid genre: ${g}`;
        }
    }
    if (data.defaultLanguage !== undefined && !constants_1.VALID_LANGUAGES.includes(data.defaultLanguage))
        return 'Invalid language';
    return null;
}
function normalizeUser(user) {
    return {
        ...user,
        preferredGenres: user.preferredGenres || constants_1.DEFAULT_GENRES,
        defaultLanguage: user.defaultLanguage || constants_1.DEFAULT_LANGUAGE,
        explicitContentAllowed: user.explicitContentAllowed ?? false,
    };
}
function toProfileResponse(user) {
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
            preferredGenres: user.preferredGenres || constants_1.DEFAULT_GENRES,
            defaultLanguage: user.defaultLanguage || constants_1.DEFAULT_LANGUAGE,
            explicitContentAllowed: user.explicitContentAllowed ?? false,
        },
    };
}
async function getOrCreateUser(email, cognitoSub, givenName, familyName) {
    const now = (0, utils_1.nowISO)();
    const result = await docClient.send(new lib_dynamodb_1.GetCommand({ TableName: USERS_TABLE, Key: { email } }));
    if (result.Item) {
        const existing = result.Item;
        const subs = existing.cognitoSubs || [];
        const updatedSubs = subs.includes(cognitoSub) ? subs : [...subs, cognitoSub];
        await docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: USERS_TABLE,
            Key: { email },
            UpdateExpression: 'SET lastLoginAt = :now, cognitoSubs = :subs',
            ExpressionAttributeValues: { ':now': now, ':subs': updatedSubs },
        }));
        return normalizeUser({ ...existing, cognitoSubs: updatedSubs, lastLoginAt: now });
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
        preferredGenres: constants_1.DEFAULT_GENRES,
        defaultLanguage: constants_1.DEFAULT_LANGUAGE,
        explicitContentAllowed: false,
    };
    await docClient.send(new lib_dynamodb_1.PutCommand({ TableName: USERS_TABLE, Item: newUser }));
    return newUser;
}
async function getUser(email) {
    const result = await docClient.send(new lib_dynamodb_1.GetCommand({ TableName: USERS_TABLE, Key: { email } }));
    return result.Item ? normalizeUser(result.Item) : null;
}
async function updateUser(email, updates) {
    const user = await getUser(email);
    if (!user)
        return null;
    const now = (0, utils_1.nowISO)();
    const exprs = ['lastLoginAt = :now'];
    const vals = { ':now': now };
    if (updates.birthday !== undefined) {
        exprs.push('birthday = :bd');
        vals[':bd'] = updates.birthday;
    }
    if (updates.preferredGenres !== undefined) {
        exprs.push('preferredGenres = :pg');
        vals[':pg'] = updates.preferredGenres;
    }
    if (updates.defaultLanguage !== undefined) {
        exprs.push('defaultLanguage = :dl');
        vals[':dl'] = updates.defaultLanguage;
    }
    if (updates.explicitContentAllowed !== undefined) {
        exprs.push('explicitContentAllowed = :ec');
        vals[':ec'] = updates.explicitContentAllowed;
    }
    if (updates.onboardingComplete !== undefined) {
        exprs.push('onboardingComplete = :oc');
        vals[':oc'] = updates.onboardingComplete;
    }
    await docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: USERS_TABLE,
        Key: { email },
        UpdateExpression: `SET ${exprs.join(', ')}`,
        ExpressionAttributeValues: vals,
    }));
    return { ...user, ...updates, lastLoginAt: now };
}
async function getChildProfiles(parentEmail) {
    const result = await docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: CHILD_PROFILES_TABLE,
        KeyConditionExpression: 'parentEmail = :email',
        ExpressionAttributeValues: { ':email': parentEmail },
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
async function createChild(parentEmail, data) {
    const now = (0, utils_1.nowISO)();
    const age = (0, utils_1.calculateAgeFromBirthday)(data.birthday);
    const profile = {
        parentEmail,
        profileId: (0, crypto_1.randomUUID)(),
        displayName: data.displayName.trim(),
        birthday: data.birthday,
        createdAt: now,
        updatedAt: now,
        defaultLanguage: data.defaultLanguage || constants_1.DEFAULT_LANGUAGE,
        explicitContentAllowed: enforceExplicitRule(data.birthday, data.explicitContentAllowed),
        preferredGenres: data.preferredGenres,
        readingLevelGRL: data.readingLevelGRL,
        readingAgeBand: data.readingAgeBand || deriveAgeBand(age),
        isActive: false,
    };
    await docClient.send(new lib_dynamodb_1.PutCommand({ TableName: CHILD_PROFILES_TABLE, Item: profile }));
    return profile;
}
async function updateChild(parentEmail, profileId, updates) {
    const existing = await getChildProfile(parentEmail, profileId);
    if (!existing)
        return null;
    const now = (0, utils_1.nowISO)();
    const exprs = ['updatedAt = :now'];
    const vals = { ':now': now };
    const birthday = updates.birthday || existing.birthday;
    if (updates.displayName !== undefined) {
        exprs.push('displayName = :dn');
        vals[':dn'] = updates.displayName.trim();
    }
    if (updates.birthday !== undefined) {
        exprs.push('birthday = :bd');
        vals[':bd'] = updates.birthday;
        if (updates.readingAgeBand === undefined) {
            exprs.push('readingAgeBand = :rab');
            vals[':rab'] = deriveAgeBand((0, utils_1.calculateAgeFromBirthday)(updates.birthday));
        }
    }
    if (updates.readingLevelGRL !== undefined) {
        exprs.push('readingLevelGRL = :grl');
        vals[':grl'] = updates.readingLevelGRL;
    }
    if (updates.readingAgeBand !== undefined) {
        exprs.push('readingAgeBand = :rab');
        vals[':rab'] = updates.readingAgeBand;
    }
    if (updates.preferredGenres !== undefined) {
        exprs.push('preferredGenres = :pg');
        vals[':pg'] = updates.preferredGenres;
    }
    if (updates.defaultLanguage !== undefined) {
        exprs.push('defaultLanguage = :dl');
        vals[':dl'] = updates.defaultLanguage;
    }
    const explicit = enforceExplicitRule(birthday, updates.explicitContentAllowed ?? existing.explicitContentAllowed);
    exprs.push('explicitContentAllowed = :ec');
    vals[':ec'] = explicit;
    await docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: CHILD_PROFILES_TABLE,
        Key: { parentEmail, profileId },
        UpdateExpression: `SET ${exprs.join(', ')}`,
        ExpressionAttributeValues: vals,
    }));
    return {
        ...existing,
        ...updates,
        displayName: updates.displayName?.trim() ?? existing.displayName,
        explicitContentAllowed: explicit,
        updatedAt: now,
        readingAgeBand: updates.readingAgeBand ?? (updates.birthday ? deriveAgeBand((0, utils_1.calculateAgeFromBirthday)(updates.birthday)) : existing.readingAgeBand),
    };
}
async function deleteChild(parentEmail, profileId) {
    const existing = await getChildProfile(parentEmail, profileId);
    if (!existing)
        return false;
    await docClient.send(new lib_dynamodb_1.DeleteCommand({ TableName: CHILD_PROFILES_TABLE, Key: { parentEmail, profileId } }));
    return true;
}
const handler = async (event) => {
    try {
        const claims = event.requestContext?.authorizer?.jwt?.claims || {};
        const { sub: cognitoSub, email, given_name: givenName, family_name: familyName } = claims;
        const method = event.requestContext?.http?.method || 'GET';
        const path = event.rawPath || event.requestContext?.http?.path || '/';
        if (!email)
            return response(401, { error: 'Unauthorized: Missing email' });
        if (!cognitoSub)
            return response(401, { error: 'Unauthorized: Missing user ID' });
        if (path === '/greeting' && method === 'POST') {
            const user = await getOrCreateUser(email, cognitoSub, givenName, familyName);
            return response(200, {
                message: `Hello, ${user.givenName || user.email}!`,
                user: toProfileResponse(user)
            });
        }
        if (path === '/me' && method === 'GET') {
            const user = await getOrCreateUser(email, cognitoSub, givenName, familyName);
            return response(200, toProfileResponse(user));
        }
        if (path === '/profile' && method === 'GET') {
            const user = await getUser(email);
            if (!user)
                return response(404, { error: 'User not found' });
            return response(200, toProfileResponse(user));
        }
        if (path === '/profile' && method === 'PUT') {
            if (!event.body)
                return response(400, { error: 'Request body required' });
            let data;
            try {
                data = JSON.parse(event.body);
            }
            catch {
                return response(400, { error: 'Invalid JSON' });
            }
            const err = validateUpdateProfile(data);
            if (err)
                return response(400, { error: err });
            const updated = await updateUser(email, data);
            if (!updated)
                return response(404, { error: 'User not found' });
            return response(200, toProfileResponse(updated));
        }
        if (path === '/profiles' && method === 'GET') {
            const user = await getUser(email);
            if (!user)
                return response(404, { error: 'User not found' });
            const children = await getChildProfiles(email);
            return response(200, {
                parent: {
                    email: user.email,
                    displayName: user.givenName && user.familyName ? `${user.givenName} ${user.familyName}` : user.givenName || user.email.split('@')[0],
                    givenName: user.givenName,
                    familyName: user.familyName,
                    birthday: user.birthday,
                    explicitContentAllowed: user.explicitContentAllowed,
                    preferredGenres: user.preferredGenres,
                    defaultLanguage: user.defaultLanguage,
                    onboardingComplete: user.onboardingComplete,
                    createdAt: user.createdAt,
                    lastLoginAt: user.lastLoginAt,
                },
                children,
            });
        }
        if (path === '/profiles' && method === 'POST') {
            if (!event.body)
                return response(400, { error: 'Request body required' });
            let data;
            try {
                data = JSON.parse(event.body);
            }
            catch {
                return response(400, { error: 'Invalid JSON' });
            }
            const err = validateCreateChild(data);
            if (err)
                return response(400, { error: err });
            const existing = await getChildProfiles(email);
            if (existing.length >= MAX_CHILD_PROFILES) {
                return response(400, { error: `Maximum ${MAX_CHILD_PROFILES} child profiles allowed` });
            }
            const child = await createChild(email, data);
            return response(201, child);
        }
        const profileMatch = path.match(/^\/profiles\/([a-zA-Z0-9-]+)$/);
        if (profileMatch) {
            const profileId = profileMatch[1];
            if (method === 'PUT') {
                if (!event.body)
                    return response(400, { error: 'Request body required' });
                let data;
                try {
                    data = JSON.parse(event.body);
                }
                catch {
                    return response(400, { error: 'Invalid JSON' });
                }
                const err = validateUpdateChild(data);
                if (err)
                    return response(400, { error: err });
                const updated = await updateChild(email, profileId, data);
                if (!updated)
                    return response(404, { error: 'Child profile not found' });
                return response(200, updated);
            }
            if (method === 'DELETE') {
                const deleted = await deleteChild(email, profileId);
                if (!deleted)
                    return response(404, { error: 'Child profile not found' });
                return response(200, { message: 'Child profile deleted' });
            }
        }
        return response(404, { error: 'Not found' });
    }
    catch (error) {
        console.error('Error:', error);
        return response(500, { error: 'Internal server error' });
    }
};
exports.handler = handler;
