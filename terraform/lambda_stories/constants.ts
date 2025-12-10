export const ALL_GENRES = [
  'fantasy', 'mystery', 'sci-fi', 'romance', 'thriller', 'horror',
  'historical', 'literary', 'adventure', 'humor', 'drama', 'western',
  'paranormal', 'dystopian', 'mythology', 'fairy-tale', 'steampunk', 'noir',
  'animals', 'sports', 'school-life', 'science-space', 'funny', 'comic-style',
] as const;

export const STORY_TONES = ['light', 'serious', 'dark', 'epic', 'humorous'] as const;

export const STORY_POVS = [
  'first-person',
  'third-person-limited',
  'third-person-omniscient',
] as const;

export const STORY_LENGTHS = ['short', 'medium', 'long'] as const;

export const AGE_BANDS = [
  'adult',
  'teen',
  'middle-school',
  'upper-elementary',
  'early-elementary',
  'prek',
] as const;

export const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
} as const;

export const ADULT_AGE_THRESHOLD = 18;


