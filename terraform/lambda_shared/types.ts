export interface APIGatewayEvent {
  requestContext: {
    authorizer?: {
      jwt?: {
        claims?: {
          sub?: string;
          email?: string;
          given_name?: string;
          family_name?: string;
        };
      };
    };
    http?: {
      method?: string;
      path?: string;
    };
  };
  body?: string;
  rawPath?: string;
  pathParameters?: Record<string, string>;
  queryStringParameters?: Record<string, string>;
}

export interface APIResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}



