import config from './config';

const { cognito } = config;
const TOKEN_KEYS = ['id_token', 'access_token', 'refresh_token'];

export function buildAuthUrl(provider) {
  const params = new URLSearchParams({
    client_id: cognito.clientId,
    response_type: 'code',
    scope: cognito.scopes,
    redirect_uri: cognito.redirectUri,
    identity_provider: provider,
  });
  return `https://${cognito.domain}/oauth2/authorize?${params}`;
}

export function buildLogoutUrl() {
  const params = new URLSearchParams({
    client_id: cognito.clientId,
    logout_uri: cognito.logoutUri,
  });
  return `https://${cognito.domain}/logout?${params}`;
}

export async function exchangeCodeForTokens(code) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: cognito.clientId,
    code,
    redirect_uri: cognito.redirectUri,
  });

  const response = await fetch(`https://${cognito.domain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

export function saveTokens(tokens) {
  localStorage.setItem('id_token', tokens.id_token);
  localStorage.setItem('access_token', tokens.access_token);
  if (tokens.refresh_token) {
    localStorage.setItem('refresh_token', tokens.refresh_token);
  }
}

export function getTokens() {
  return {
    idToken: localStorage.getItem('id_token'),
    accessToken: localStorage.getItem('access_token'),
    refreshToken: localStorage.getItem('refresh_token'),
  };
}

export function clearTokens() {
  TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
}

export function decodeToken(token) {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
  } catch {
    return null;
  }
}

export function isTokenValid(token) {
  const payload = decodeToken(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 > Date.now();
}

export function isAuthenticated() {
  const { idToken } = getTokens();
  return isTokenValid(idToken);
}

export function getUserFromToken() {
  const { idToken } = getTokens();
  return decodeToken(idToken);
}

