export const ADULT_GENRES = [
  'fantasy', 'mystery', 'sci-fi', 'romance', 'thriller', 'horror',
  'historical', 'literary', 'adventure', 'humor', 'drama', 'western',
  'paranormal', 'dystopian', 'mythology', 'fairy-tale', 'steampunk', 'noir',
] as const;

export const CHILD_GENRES = [
  'adventure', 'animals', 'sports', 'school-life', 'history',
  'science-space', 'funny', 'mystery', 'fairy-tales', 'comic-style',
] as const;

export const CHILD_AGE_BANDS = [
  'prek',
  'early-elementary',
  'upper-elementary',
  'middle-school',
] as const;

export const READING_LEVELS_GRL = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'Z+',
] as const;

export const LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'] as const;

export const DEFAULT_LANGUAGE = 'en';

export const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
} as const;

export const MAX_CHILD_PROFILES = 5;
export const ADULT_AGE_THRESHOLD = 18;
