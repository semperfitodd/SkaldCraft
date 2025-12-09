import config from './config';
import { getTokens } from './auth';

export async function fetchGreeting() {
  const { idToken } = getTokens();
  const url = `https://${config.api.baseUrl}/greeting`;

  console.log('API Request:', { url, hasToken: !!idToken });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
  });

  const data = await response.json();
  console.log('API Response:', { status: response.status, data });

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch greeting');
  }

  return data;
}

