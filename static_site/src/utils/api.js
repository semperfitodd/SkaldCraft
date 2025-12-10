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

export const STORY_OPTIONS = {
  ageBands: [
    { value: 'adult', label: 'Adult' },
    { value: 'teen', label: 'Teen (14-17)' },
    { value: 'middle-school', label: 'Middle School (11-13)' },
    { value: 'upper-elementary', label: 'Upper Elementary (8-10)' },
    { value: 'early-elementary', label: 'Early Elementary (5-7)' },
    { value: 'prek', label: 'Pre-K (3-4)' },
  ],
  tones: [
    { value: 'light', label: 'Light & Fun' },
    { value: 'serious', label: 'Serious' },
    { value: 'dark', label: 'Dark' },
    { value: 'epic', label: 'Epic' },
    { value: 'humorous', label: 'Humorous' },
  ],
  povs: [
    { value: 'first-person', label: 'First Person (I/me)' },
    { value: 'third-person-limited', label: 'Third Person Limited' },
    { value: 'third-person-omniscient', label: 'Third Person Omniscient' },
  ],
  lengths: [
    { value: 'short', label: 'Short (~5-10 chapters)' },
    { value: 'medium', label: 'Medium (~15-25 chapters)' },
    { value: 'long', label: 'Long (~30+ chapters)' },
  ],
  statuses: [
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'abandoned', label: 'Abandoned' },
  ],
};

export async function fetchStories(profileId, limit = 20) {
  const params = new URLSearchParams();
  if (profileId) params.append('profileId', profileId);
  if (limit) params.append('limit', limit.toString());
  
  const queryString = params.toString();
  const url = `https://${config.api.baseUrl}/stories${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch stories');
  }
  return data.stories;
}

export async function createStory(storyData) {
  const response = await fetch(`https://${config.api.baseUrl}/stories`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(storyData),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create story');
  }
  return data;
}

export async function fetchStory(storyId) {
  const response = await fetch(`https://${config.api.baseUrl}/stories/${storyId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch story');
  }
  return data.story;
}

export async function updateStory(storyId, updates) {
  const response = await fetch(`https://${config.api.baseUrl}/stories/${storyId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update story');
  }
  return data.story;
}

export async function deleteStory(storyId) {
  const response = await fetch(`https://${config.api.baseUrl}/stories/${storyId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to delete story');
  }
  return data;
}

export async function fetchStoryNodes(storyId, limit = 100) {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  
  const queryString = params.toString();
  const url = `https://${config.api.baseUrl}/stories/${storyId}/nodes${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch story nodes');
  }
  return data.nodes;
}

export async function fetchRootNode(storyId) {
  const response = await fetch(`https://${config.api.baseUrl}/stories/${storyId}/nodes/root`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch root node');
  }
  return data.node;
}

export async function fetchStoryNode(storyId, nodeId) {
  const response = await fetch(`https://${config.api.baseUrl}/stories/${storyId}/nodes/${nodeId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch story node');
  }
  return data.node;
}

export async function createStoryNode(storyId, nodeData) {
  const response = await fetch(`https://${config.api.baseUrl}/stories/${storyId}/nodes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(nodeData),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create story node');
  }
  return data.node;
}

export async function updateStoryNode(storyId, nodeId, updates) {
  const response = await fetch(`https://${config.api.baseUrl}/stories/${storyId}/nodes/${nodeId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update story node');
  }
  return data.node;
}

export async function createAdultStory(payload) {
  console.log('[API] Creating adult story:', payload);
  
  const response = await fetch(`https://${config.api.baseUrl}/stories/adult`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error('[API] Create adult story failed:', response.status, data);
    throw new Error(data.error || 'Failed to create story');
  }
  
  console.log('[API] Adult story initialized:', data.story?.storyId, 'status:', data.status);
  return data;
}

export async function pollStoryReady(storyId, maxAttempts = 15, intervalMs = 7000) {
  console.log('[API] Polling for story ready:', storyId);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const story = await fetchStory(storyId);
    console.log('[API] Poll attempt', attempt + 1, 'status:', story.status);
    
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
    
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  throw new Error('Story generation timed out');
}

export async function pollChapterReady(storyId, expectedChapterIndex, maxAttempts = 15, intervalMs = 7000) {
  console.log('[API] Polling for chapter ready:', storyId, 'chapter:', expectedChapterIndex);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const story = await fetchStory(storyId);
    console.log('[API] Poll attempt', attempt + 1, 'status:', story.status);
    
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
    
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  throw new Error('Chapter generation timed out');
}

export async function continueAdultStory(storyId, payload) {
  console.log('[API] Continuing story:', storyId, payload);
  
  const response = await fetch(`https://${config.api.baseUrl}/stories/${storyId}/continue`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error('[API] Continue story failed:', response.status, data);
    throw new Error(data.error || 'Failed to continue story');
  }
  
  console.log('[API] Continue story initiated, status:', data.status);
  return data;
}

export async function fetchStoryCurrent(storyId) {
  console.log('[API] Fetching current story state:', storyId);
  
  const response = await fetch(`https://${config.api.baseUrl}/stories/${storyId}/current`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error('[API] Fetch current failed:', response.status, data);
    throw new Error(data.error || 'Failed to fetch story');
  }
  
  return data;
}

export async function fetchStoryArchive(storyId) {
  console.log('[API] Fetching archived story:', storyId);
  
  const response = await fetch(`https://${config.api.baseUrl}/stories/${storyId}/archive`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error('[API] Fetch archive failed:', response.status, data);
    throw new Error(data.error || 'Failed to fetch archived story');
  }
  
  return data;
}

export async function fetchStoryChapter(storyId, chapterIndex) {
  console.log('[API] Fetching chapter:', storyId, chapterIndex);
  
  const response = await fetch(`https://${config.api.baseUrl}/stories/${storyId}/chapters/${chapterIndex}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error('[API] Fetch chapter failed:', response.status, data);
    throw new Error(data.error || 'Failed to fetch chapter');
  }
  
  return data;
}
