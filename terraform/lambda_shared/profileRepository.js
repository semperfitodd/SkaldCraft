"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChildProfile = getChildProfile;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const CHILD_PROFILES_TABLE = process.env.CHILD_PROFILES_TABLE;
async function getChildProfile(parentEmail, profileId) {
    const result = await docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: CHILD_PROFILES_TABLE,
        Key: { parentEmail, profileId },
    }));
    return result.Item || null;
}
