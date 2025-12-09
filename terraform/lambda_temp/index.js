"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const handler = async (event) => {
    const claims = event.requestContext?.authorizer?.jwt?.claims || {};
    const firstName = claims.given_name || '';
    const lastName = claims.family_name || '';
    const email = claims.email || '';
    const displayName = firstName && lastName
        ? `${firstName} ${lastName}`
        : firstName || email.split('@')[0] || 'Guest';
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: `Hello, ${displayName}!`,
        }),
    };
};
exports.handler = handler;
