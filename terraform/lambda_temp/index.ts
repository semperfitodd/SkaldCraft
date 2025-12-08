export const handler = async (event: any, context: any) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  console.log('Context:', JSON.stringify(context, null, 2));

  try {
    const response = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Hello World!',
        timestamp: new Date().toISOString(),
        environment: process.env.ENVIRONMENT || 'unknown',
        requestId: context.requestId,
      }),
    };

    return response;
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

