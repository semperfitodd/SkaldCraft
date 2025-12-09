const REQUIRED_ENV_VARS = [
  'REACT_APP_COGNITO_USER_POOL_ID',
  'REACT_APP_COGNITO_CLIENT_ID',
  'REACT_APP_COGNITO_DOMAIN',
  'REACT_APP_API_URL',
];

const missingVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missingVars.length > 0 && process.env.NODE_ENV === 'production') {
  console.error(`Missing environment variables: ${missingVars.join(', ')}`);
}

const config = {
  cognito: {
    userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
    clientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
    domain: process.env.REACT_APP_COGNITO_DOMAIN,
    redirectUri: process.env.REACT_APP_REDIRECT_URI || `${window.location.origin}/auth/callback`,
    logoutUri: process.env.REACT_APP_LOGOUT_URI || `${window.location.origin}/logout`,
    scopes: 'email openid profile',
  },
  api: {
    baseUrl: process.env.REACT_APP_API_URL,
  },
  providers: {
    apple: 'SignInWithApple',
    google: 'Google',
  },
};

export default config;
