import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const CHILD_PROFILES_TABLE = process.env.CHILD_PROFILES_TABLE!;

export interface ChildProfile {
  parentEmail: string;
  profileId: string;
  displayName: string;
  birthday: string;
  readingLevelGRL: string;
  readingAgeBand: string;
}

export async function getChildProfile(parentEmail: string, profileId: string): Promise<ChildProfile | null> {
  const result = await docClient.send(new GetCommand({
    TableName: CHILD_PROFILES_TABLE,
    Key: { parentEmail, profileId },
  }));
  return (result.Item as ChildProfile) || null;
}

