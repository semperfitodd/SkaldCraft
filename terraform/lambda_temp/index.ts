interface APIGatewayEvent {
  requestContext: {
    authorizer?: {
      jwt?: {
        claims?: {
          given_name?: string;
          family_name?: string;
          email?: string;
        };
      };
    };
  };
}

export const handler = async (event: APIGatewayEvent) => {
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

