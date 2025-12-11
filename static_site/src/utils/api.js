import config from './config';
import { getTokens } from './auth';
import { POLLING_CONFIG } from './constants';

const getAuthHeaders = () => {
  const { idToken } = getTokens();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
  };
};

const apiRequest = async (endpoint, options = {}) => {
  const url = `https://${config.api.baseUrl}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed: ${endpoint}`);
  }
  return data;
};

export const fetchGreeting = () => apiRequest('/greeting', { method: 'POST' });

export const fetchProfile = () => apiRequest('/me');

export const updateProfile = (profileData) => 
  apiRequest('/profile', { method: 'PUT', body: JSON.stringify(profileData) });

export const fetchProfiles = () => apiRequest('/profiles');

export const createChildProfile = (profileData) => 
  apiRequest('/profiles', { method: 'POST', body: JSON.stringify(profileData) });

export const updateChildProfile = (profileId, profileData) => 
  apiRequest(`/profiles/${profileId}`, { method: 'PUT', body: JSON.stringify(profileData) });

export const deleteChildProfile = (profileId) => 
  apiRequest(`/profiles/${profileId}`, { method: 'DELETE' });

export { 
  PROFILE_OPTIONS, 
  STORY_OPTIONS, 
  ADULT_AGE_THRESHOLD, 
  POLLING_CONFIG,
  EXPLICIT_CONTENT_DISABLED_MESSAGE,
  READING_PURPOSES
} from './constants';

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

export async function fetchStories(profileId, limit = 20) {
  const params = new URLSearchParams();
  if (profileId) params.append('profileId', profileId);
  if (limit) params.append('limit', limit.toString());
  const queryString = params.toString();
  const data = await apiRequest(`/stories${queryString ? `?${queryString}` : ''}`);
  return data.stories;
}

export const createStory = (storyData) => 
  apiRequest('/stories', { method: 'POST', body: JSON.stringify(storyData) });

export async function fetchStory(storyId) {
  const data = await apiRequest(`/stories/${storyId}`);
  return data.story;
}

export async function updateStory(storyId, updates) {
  const data = await apiRequest(`/stories/${storyId}`, { 
    method: 'PUT', 
    body: JSON.stringify(updates) 
  });
  return data.story;
}

export const deleteStory = (storyId) => apiRequest(`/stories/${storyId}`, { method: 'DELETE' });

export async function fetchStoryNodes(storyId, limit = 100) {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  const queryString = params.toString();
  const data = await apiRequest(`/stories/${storyId}/nodes${queryString ? `?${queryString}` : ''}`);
  return data.nodes;
}

export async function fetchRootNode(storyId) {
  const data = await apiRequest(`/stories/${storyId}/nodes/root`);
  return data.node;
}

export async function fetchStoryNode(storyId, nodeId) {
  const data = await apiRequest(`/stories/${storyId}/nodes/${nodeId}`);
  return data.node;
}

export async function createStoryNode(storyId, nodeData) {
  const data = await apiRequest(`/stories/${storyId}/nodes`, { 
    method: 'POST', 
    body: JSON.stringify(nodeData) 
  });
  return data.node;
}

export async function updateStoryNode(storyId, nodeId, updates) {
  const data = await apiRequest(`/stories/${storyId}/nodes/${nodeId}`, { 
    method: 'PUT', 
    body: JSON.stringify(updates) 
  });
  return data.node;
}

export async function createAdultStory(payload) {
  const data = await apiRequest('/stories/adult', { 
    method: 'POST', 
    body: JSON.stringify(payload) 
  });
  return data;
}

export async function pollStoryReady(storyId, maxAttempts = POLLING_CONFIG.maxAttempts, intervalMs = POLLING_CONFIG.intervalMs) {
  await new Promise(resolve => setTimeout(resolve, POLLING_CONFIG.initialDelayMs));
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const story = await fetchStory(storyId);
    
    if (story.status === 'in_progress') {
      const currentNode = await fetchStoryNode(storyId, story.activeNodeId);
      return { story, currentNode };
    }
    
    if (story.status === 'failed') {
      throw new Error(story.generationError || 'Story generation failed');
    }
    
    if (story.status !== 'creating') {
      throw new Error(`Unexpected story status: ${story.status}`);
    }
    
    if (attempt < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  
  throw new Error('Story generation timed out');
}

export async function pollChapterReady(storyId, expectedChapterIndex, maxAttempts = POLLING_CONFIG.maxAttempts, intervalMs = POLLING_CONFIG.intervalMs) {
  await new Promise(resolve => setTimeout(resolve, POLLING_CONFIG.initialDelayMs));
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const story = await fetchStory(storyId);
    
    if (story.status === 'in_progress' || story.status === 'completed') {
      const currentNode = await fetchStoryNode(storyId, story.activeNodeId);
      if (currentNode.chapterIndex >= expectedChapterIndex) {
        return { story, newNode: currentNode };
      }
    }
    
    if (story.status === 'failed' || story.generationError) {
      throw new Error(story.generationError || 'Chapter generation failed');
    }
    
    if (story.status !== 'generating_chapter' && story.status !== 'in_progress') {
      throw new Error(`Unexpected story status: ${story.status}`);
    }
    
    if (attempt < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  
  throw new Error('Chapter generation timed out');
}

export async function continueAdultStory(storyId, payload) {
  const data = await apiRequest(`/stories/${storyId}/continue`, { 
    method: 'POST', 
    body: JSON.stringify(payload) 
  });
  return data;
}

export async function fetchStoryCurrent(storyId) {
  return apiRequest(`/stories/${storyId}/current`);
}

export async function fetchStoryArchive(storyId) {
  return apiRequest(`/stories/${storyId}/archive`);
}

export async function fetchStoryChapter(storyId, chapterIndex) {
  return apiRequest(`/stories/${storyId}/chapters/${chapterIndex}`);
}

// Child story endpoints
export async function createChildStory(payload) {
  const data = await apiRequest('/stories/child', { 
    method: 'POST', 
    body: JSON.stringify(payload) 
  });
  return data;
}

export async function continueChildStory(storyId, payload) {
  const data = await apiRequest(`/stories/child/${storyId}/continue`, { 
    method: 'POST', 
    body: JSON.stringify(payload) 
  });
  return data;
}

// Helper to determine if a profile is a child profile
export function isChildProfile(activeProfile) {
  return activeProfile?.type === 'child';
}

// Helper to get the appropriate profile ID for API calls
export function getProfileIdForStory(activeProfile, parentEmail) {
  if (activeProfile?.type === 'child') {
    return activeProfile.profileId;
  }
  return parentEmail;
}
