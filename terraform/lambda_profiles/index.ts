import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import {
  ADULT_GENRES,
  CHILD_GENRES,
  CHILD_AGE_BANDS,
  READING_LEVELS_GRL,
  LANGUAGES,
  DEFAULT_LANGUAGE,
  CORS_HEADERS,
  MAX_CHILD_PROFILES,
  ADULT_AGE_THRESHOLD,
} from './constants';
import type { APIGatewayEvent, APIResponse } from 'lambda_shared/types';
import { createResponse, parseBody } from 'lambda_shared/utils';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE!;
const CHILD_PROFILES_TABLE = process.env.CHILD_PROFILES_TABLE!;
const DEFAULT_GENRES = ['fantasy'];

type ReadingAgeBand = typeof CHILD_AGE_BANDS[number];

interface UserRecord {
  email: string;
  cognitoSubs: string[];
  givenName?: string;
  familyName?: string;
  createdAt: string;
  lastLoginAt: string;
  defaultProfileType: 'adult' | 'child';
  onboardingComplete: boolean;
  birthday?: string;
  preferredGenres: string[];
  defaultLanguage: string;
  explicitContentAllowed: boolean;
}

interface ChildProfile {
  parentEmail: string;
  profileId: string;
  displayName: string;
  birthday: string;
  createdAt: string;
  updatedAt: string;
  defaultLanguage: string;
  explicitContentAllowed: boolean;
  preferredGenres: string[];
  readingLevelGRL: string;
  readingAgeBand: ReadingAgeBand;
  isActive: boolean;
}

interface CreateChildProfileRequest {
  displayName: string;
  birthday: string;
  readingLevelGRL: string;
  readingAgeBand?: ReadingAgeBand;
  preferredGenres: string[];
  defaultLanguage?: string;
  explicitContentAllowed?: boolean;
}

interface UpdateChildProfileRequest {
  displayName?: string;
  birthday?: string;
  readingLevelGRL?: string;
  readingAgeBand?: ReadingAgeBand;
  preferredGenres?: string[];
  defaultLanguage?: string;
  explicitContentAllowed?: boolean;
}

interface UpdateProfileRequest {
  birthday?: string;
  preferredGenres?: string[];
  defaultLanguage?: string;
  explicitContentAllowed?: boolean;
  onboardingComplete?: boolean;
}

function response(statusCode: number, body: object): APIResponse {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

function nowISO(): string {
  return new Date().toISOString();
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

function deriveAgeBand(age: number): ReadingAgeBand {
  if (age < 5) return 'prek';
  if (age < 8) return 'early-elementary';
  if (age < 11) return 'upper-elementary';
  return 'middle-school';
}

function enforceExplicitRule(birthday: string, requested?: boolean): boolean {
  return calculateAge(birthday) >= 18 ? (requested ?? false) : false;
}

function isValidDate(str: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(new Date(str).getTime());
}

function validateCreateChild(data: CreateChildProfileRequest): string | null {
  if (!data.displayName?.trim()) return 'displayName is required';
  if (!data.birthday || !isValidDate(data.birthday)) return 'birthday must be valid YYYY-MM-DD';
  if (!READING_LEVELS_GRL.includes(data.readingLevelGRL as any)) return 'Invalid readingLevelGRL';
  if (!data.preferredGenres?.length) return 'preferredGenres required';
  for (const g of data.preferredGenres) {
    if (!CHILD_GENRES.includes(g as any)) return `Invalid genre: ${g}`;
  }
  if (data.readingAgeBand && !CHILD_AGE_BANDS.includes(data.readingAgeBand)) return 'Invalid readingAgeBand';
  if (data.defaultLanguage && !LANGUAGES.includes(data.defaultLanguage as any)) return 'Invalid language';
  return null;
}

function validateUpdateChild(data: UpdateChildProfileRequest): string | null {
  if (data.displayName !== undefined && !data.displayName.trim()) return 'displayName cannot be empty';
  if (data.birthday !== undefined && !isValidDate(data.birthday)) return 'birthday must be valid YYYY-MM-DD';
  if (data.readingLevelGRL !== undefined && !READING_LEVELS_GRL.includes(data.readingLevelGRL as any)) return 'Invalid readingLevelGRL';
  if (data.preferredGenres !== undefined) {
    if (!data.preferredGenres.length) return 'preferredGenres cannot be empty';
    for (const g of data.preferredGenres) {
      if (!CHILD_GENRES.includes(g as any)) return `Invalid genre: ${g}`;
    }
  }
  if (data.readingAgeBand !== undefined && !CHILD_AGE_BANDS.includes(data.readingAgeBand)) return 'Invalid readingAgeBand';
  if (data.defaultLanguage !== undefined && !LANGUAGES.includes(data.defaultLanguage as any)) return 'Invalid language';
  return null;
}

function validateUpdateProfile(data: UpdateProfileRequest): string | null {
  if (data.birthday !== undefined && !isValidDate(data.birthday)) return 'birthday must be valid YYYY-MM-DD';
  if (data.preferredGenres !== undefined) {
    if (!data.preferredGenres.length) return 'preferredGenres cannot be empty';
    for (const g of data.preferredGenres) {
      if (!ADULT_GENRES.includes(g as any)) return `Invalid genre: ${g}`;
    }
  }
  if (data.defaultLanguage !== undefined && !LANGUAGES.includes(data.defaultLanguage as any)) return 'Invalid language';
  return null;
}

function normalizeUser(user: UserRecord): UserRecord {
  return {
    ...user,
    preferredGenres: user.preferredGenres || DEFAULT_GENRES,
    defaultLanguage: user.defaultLanguage || DEFAULT_LANGUAGE,
    explicitContentAllowed: user.explicitContentAllowed ?? false,
  };
}

function toProfileResponse(user: UserRecord) {
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
      explicitContentAllowed: user.explicitContentAllowed ?? false,
    },
  };
}

async function getOrCreateUser(email: string, cognitoSub: string, givenName?: string, familyName?: string): Promise<UserRecord> {
  const now = nowISO();
  const result = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { email } }));

  if (result.Item) {
    const existing = result.Item as UserRecord;
    const subs = existing.cognitoSubs || [];
    const updatedSubs = subs.includes(cognitoSub) ? subs : [...subs, cognitoSub];

    await docClient.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { email },
      UpdateExpression: 'SET lastLoginAt = :now, cognitoSubs = :subs',
      ExpressionAttributeValues: { ':now': now, ':subs': updatedSubs },
    }));

    return normalizeUser({ ...existing, cognitoSubs: updatedSubs, lastLoginAt: now });
  }

  const newUser: UserRecord = {
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
    explicitContentAllowed: false,
  };

  await docClient.send(new PutCommand({ TableName: USERS_TABLE, Item: newUser }));
  return newUser;
}

async function getUser(email: string): Promise<UserRecord | null> {
  const result = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { email } }));
  return result.Item ? normalizeUser(result.Item as UserRecord) : null;
}

async function updateUser(email: string, updates: UpdateProfileRequest): Promise<UserRecord | null> {
  const user = await getUser(email);
  if (!user) return null;

  const now = nowISO();
  const exprs: string[] = ['lastLoginAt = :now'];
  const vals: Record<string, unknown> = { ':now': now };

  if (updates.birthday !== undefined) { exprs.push('birthday = :bd'); vals[':bd'] = updates.birthday; }
  if (updates.preferredGenres !== undefined) { exprs.push('preferredGenres = :pg'); vals[':pg'] = updates.preferredGenres; }
  if (updates.defaultLanguage !== undefined) { exprs.push('defaultLanguage = :dl'); vals[':dl'] = updates.defaultLanguage; }
  if (updates.explicitContentAllowed !== undefined) { exprs.push('explicitContentAllowed = :ec'); vals[':ec'] = updates.explicitContentAllowed; }
  if (updates.onboardingComplete !== undefined) { exprs.push('onboardingComplete = :oc'); vals[':oc'] = updates.onboardingComplete; }

  await docClient.send(new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { email },
    UpdateExpression: `SET ${exprs.join(', ')}`,
    ExpressionAttributeValues: vals,
  }));

  return { ...user, ...updates, lastLoginAt: now };
}

async function getChildProfiles(parentEmail: string): Promise<ChildProfile[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: CHILD_PROFILES_TABLE,
    KeyConditionExpression: 'parentEmail = :email',
    ExpressionAttributeValues: { ':email': parentEmail },
  }));
  return (result.Items || []) as ChildProfile[];
}

async function getChildProfile(parentEmail: string, profileId: string): Promise<ChildProfile | null> {
  const result = await docClient.send(new GetCommand({
    TableName: CHILD_PROFILES_TABLE,
    Key: { parentEmail, profileId },
  }));
  return (result.Item as ChildProfile) || null;
}

async function createChild(parentEmail: string, data: CreateChildProfileRequest): Promise<ChildProfile> {
  const now = nowISO();
  const age = calculateAge(data.birthday);

  const profile: ChildProfile = {
    parentEmail,
    profileId: randomUUID(),
    displayName: data.displayName.trim(),
    birthday: data.birthday,
    createdAt: now,
    updatedAt: now,
    defaultLanguage: data.defaultLanguage || DEFAULT_LANGUAGE,
    explicitContentAllowed: enforceExplicitRule(data.birthday, data.explicitContentAllowed),
    preferredGenres: data.preferredGenres,
    readingLevelGRL: data.readingLevelGRL,
    readingAgeBand: data.readingAgeBand || deriveAgeBand(age),
    isActive: false,
  };

  await docClient.send(new PutCommand({ TableName: CHILD_PROFILES_TABLE, Item: profile }));
  return profile;
}

async function updateChild(parentEmail: string, profileId: string, updates: UpdateChildProfileRequest): Promise<ChildProfile | null> {
  const existing = await getChildProfile(parentEmail, profileId);
  if (!existing) return null;

  const now = nowISO();
  const exprs: string[] = ['updatedAt = :now'];
  const vals: Record<string, unknown> = { ':now': now };
  const birthday = updates.birthday || existing.birthday;

  if (updates.displayName !== undefined) { exprs.push('displayName = :dn'); vals[':dn'] = updates.displayName.trim(); }
  if (updates.birthday !== undefined) {
    exprs.push('birthday = :bd');
    vals[':bd'] = updates.birthday;
    if (updates.readingAgeBand === undefined) {
      exprs.push('readingAgeBand = :rab');
      vals[':rab'] = deriveAgeBand(calculateAge(updates.birthday));
    }
  }
  if (updates.readingLevelGRL !== undefined) { exprs.push('readingLevelGRL = :grl'); vals[':grl'] = updates.readingLevelGRL; }
  if (updates.readingAgeBand !== undefined) { exprs.push('readingAgeBand = :rab'); vals[':rab'] = updates.readingAgeBand; }
  if (updates.preferredGenres !== undefined) { exprs.push('preferredGenres = :pg'); vals[':pg'] = updates.preferredGenres; }
  if (updates.defaultLanguage !== undefined) { exprs.push('defaultLanguage = :dl'); vals[':dl'] = updates.defaultLanguage; }

  const explicit = enforceExplicitRule(birthday, updates.explicitContentAllowed ?? existing.explicitContentAllowed);
  exprs.push('explicitContentAllowed = :ec');
  vals[':ec'] = explicit;

  await docClient.send(new UpdateCommand({
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
    readingAgeBand: updates.readingAgeBand ?? (updates.birthday ? deriveAgeBand(calculateAge(updates.birthday)) : existing.readingAgeBand),
  };
}

async function deleteChild(parentEmail: string, profileId: string): Promise<boolean> {
  const existing = await getChildProfile(parentEmail, profileId);
  if (!existing) return false;
  await docClient.send(new DeleteCommand({ TableName: CHILD_PROFILES_TABLE, Key: { parentEmail, profileId } }));
  return true;
}

export const handler = async (event: APIGatewayEvent): Promise<APIResponse> => {
  try {
    const claims = event.requestContext?.authorizer?.jwt?.claims || {};
    const { sub: cognitoSub, email, given_name: givenName, family_name: familyName } = claims;
    const method = event.requestContext?.http?.method || 'GET';
    const path = event.rawPath || event.requestContext?.http?.path || '/';

    if (!email) return response(401, { error: 'Unauthorized: Missing email' });
    if (!cognitoSub) return response(401, { error: 'Unauthorized: Missing user ID' });

    if (path === '/me' && method === 'GET') {
      const user = await getOrCreateUser(email, cognitoSub, givenName, familyName);
      return response(200, toProfileResponse(user));
    }

    if (path === '/profile' && method === 'GET') {
      const user = await getUser(email);
      if (!user) return response(404, { error: 'User not found' });
      return response(200, toProfileResponse(user));
    }

    if (path === '/profile' && method === 'PUT') {
      if (!event.body) return response(400, { error: 'Request body required' });
      let data: UpdateProfileRequest;
      try { data = JSON.parse(event.body); } catch { return response(400, { error: 'Invalid JSON' }); }
      const err = validateUpdateProfile(data);
      if (err) return response(400, { error: err });
      const updated = await updateUser(email, data);
      if (!updated) return response(404, { error: 'User not found' });
      return response(200, toProfileResponse(updated));
    }

    if (path === '/profiles' && method === 'GET') {
      const user = await getOrCreateUser(email, cognitoSub, givenName, familyName);
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
      if (!event.body) return response(400, { error: 'Request body required' });
      let data: CreateChildProfileRequest;
      try { data = JSON.parse(event.body); } catch { return response(400, { error: 'Invalid JSON' }); }
      const err = validateCreateChild(data);
      if (err) return response(400, { error: err });
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
        if (!event.body) return response(400, { error: 'Request body required' });
        let data: UpdateChildProfileRequest;
        try { data = JSON.parse(event.body); } catch { return response(400, { error: 'Invalid JSON' }); }
        const err = validateUpdateChild(data);
        if (err) return response(400, { error: err });
        const updated = await updateChild(email, profileId, data);
        if (!updated) return response(404, { error: 'Child profile not found' });
        return response(200, updated);
      }
      if (method === 'DELETE') {
        const deleted = await deleteChild(email, profileId);
        if (!deleted) return response(404, { error: 'Child profile not found' });
        return response(200, { message: 'Child profile deleted' });
      }
    }

    return response(404, { error: 'Not found' });
  } catch (error) {
    console.error('Error:', error);
    return response(500, { error: 'Internal server error' });
  }
};
