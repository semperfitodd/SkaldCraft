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

export async function fetchProfiles() {
  const response = await fetch(`https://${config.api.baseUrl}/profiles`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch profiles');
  }
  return data;
}

export async function createChildProfile(profileData) {
  const response = await fetch(`https://${config.api.baseUrl}/profiles`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(profileData),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create child profile');
  }
  return data;
}

export async function updateChildProfile(profileId, profileData) {
  const response = await fetch(`https://${config.api.baseUrl}/profiles/${profileId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(profileData),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update child profile');
  }
  return data;
}

export async function deleteChildProfile(profileId) {
  const response = await fetch(`https://${config.api.baseUrl}/profiles/${profileId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to delete child profile');
  }
  return data;
}

export function calculateAge(birthday) {
  if (!birthday) return null;
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function isExplicitContentDisabled(birthday) {
  const age = calculateAge(birthday);
  return age !== null && age < 18;
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
  childGenres: [
    { value: 'adventure', label: 'Adventure' },
    { value: 'animals', label: 'Animals' },
    { value: 'sports', label: 'Sports' },
    { value: 'school-life', label: 'School Life' },
    { value: 'history', label: 'History' },
    { value: 'science-space', label: 'Science & Space' },
    { value: 'funny', label: 'Funny' },
    { value: 'mystery', label: 'Mystery' },
    { value: 'fairy-tales', label: 'Fairy Tales' },
    { value: 'comic-style', label: 'Comic Style' },
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
  readingLevels: [
    { value: 'A', label: 'A' }, { value: 'B', label: 'B' }, { value: 'C', label: 'C' },
    { value: 'D', label: 'D' }, { value: 'E', label: 'E' }, { value: 'F', label: 'F' },
    { value: 'G', label: 'G' }, { value: 'H', label: 'H' }, { value: 'I', label: 'I' },
    { value: 'J', label: 'J' }, { value: 'K', label: 'K' }, { value: 'L', label: 'L' },
    { value: 'M', label: 'M' }, { value: 'N', label: 'N' }, { value: 'O', label: 'O' },
    { value: 'P', label: 'P' }, { value: 'Q', label: 'Q' }, { value: 'R', label: 'R' },
    { value: 'S', label: 'S' }, { value: 'T', label: 'T' }, { value: 'U', label: 'U' },
    { value: 'V', label: 'V' }, { value: 'W', label: 'W' }, { value: 'X', label: 'X' },
    { value: 'Y', label: 'Y' }, { value: 'Z', label: 'Z' }, { value: 'Z+', label: 'Z+' },
  ],
  readingAgeBands: [
    { value: 'prek', label: 'Pre-K (Ages 3-4)' },
    { value: 'early-elementary', label: 'Early Elementary (Ages 5-7)' },
    { value: 'upper-elementary', label: 'Upper Elementary (Ages 8-10)' },
    { value: 'middle-school', label: 'Middle School (Ages 11-13)' },
  ],
};

export const EXPLICIT_CONTENT_DISABLED_MESSAGE = 
  'Explicit content is disabled for readers under 18 based on their birthdate.';
