import config from './config';
import { getTokens } from './auth';

const getAuthHeaders = () => {
  const { idToken } = getTokens();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
  };
};

export async function fetchGreeting() {
  const response = await fetch(`https://${config.api.baseUrl}/greeting`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch greeting');
  }
  return data;
}

export async function fetchProfile() {
  const response = await fetch(`https://${config.api.baseUrl}/me`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch profile');
  }
  return data;
}

export async function updateProfile(profileData) {
  const response = await fetch(`https://${config.api.baseUrl}/profile`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(profileData),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update profile');
  }
  return data;
}

export const PROFILE_OPTIONS = {
  genres: [
    { value: 'fantasy', label: 'Fantasy' },
    { value: 'mystery', label: 'Mystery' },
    { value: 'sci-fi', label: 'Science Fiction' },
    { value: 'romance', label: 'Romance' },
    { value: 'thriller', label: 'Thriller' },
    { value: 'horror', label: 'Horror' },
    { value: 'historical', label: 'Historical Fiction' },
    { value: 'literary', label: 'Literary Fiction' },
    { value: 'adventure', label: 'Adventure' },
    { value: 'humor', label: 'Humor' },
    { value: 'drama', label: 'Drama' },
    { value: 'western', label: 'Western' },
    { value: 'paranormal', label: 'Paranormal' },
    { value: 'dystopian', label: 'Dystopian' },
    { value: 'mythology', label: 'Mythology' },
    { value: 'fairy-tale', label: 'Fairy Tale' },
    { value: 'steampunk', label: 'Steampunk' },
    { value: 'noir', label: 'Noir' },
  ],
  languages: [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'ja', label: 'Japanese' },
    { value: 'ko', label: 'Korean' },
    { value: 'zh', label: 'Chinese' },
  ],
};
