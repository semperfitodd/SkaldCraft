export const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
} as const;

export const VALID_GENRES = [
  'fantasy', 'mystery', 'sci-fi', 'romance', 'thriller', 'horror',
  'historical', 'literary', 'adventure', 'humor', 'drama', 'western',
  'paranormal', 'dystopian', 'mythology', 'fairy-tale', 'steampunk', 'noir',
] as const;

export const VALID_CHILD_GENRES = [
  'adventure', 'animals', 'sports', 'school-life', 'history',
  'science-space', 'funny', 'mystery', 'fairy-tales', 'comic-style',
] as const;

export const ALL_GENRES = [
  'fantasy', 'mystery', 'sci-fi', 'romance', 'thriller', 'horror',
  'historical', 'literary', 'adventure', 'humor', 'drama', 'western',
  'paranormal', 'dystopian', 'mythology', 'fairy-tale', 'steampunk', 'noir',
  'animals', 'sports', 'school-life', 'science-space', 'funny', 'comic-style',
] as const;

export const VALID_LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'] as const;

export const VALID_GRL_VALUES = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'Z+',
] as const;

export const VALID_AGE_BANDS = [
  'adult', 'teen', 'middle-school', 'upper-elementary', 'early-elementary', 'prek',
] as const;

export const VALID_CHILD_AGE_BANDS = ['prek', 'early-elementary', 'upper-elementary', 'middle-school'] as const;

export const VALID_TONES = ['light', 'serious', 'dark', 'epic', 'humorous'] as const;

export const VALID_POVS = ['first-person', 'third-person-limited', 'third-person-omniscient'] as const;

export const VALID_LENGTHS = ['short', 'medium', 'long'] as const;

export const VALID_STORY_STATUSES = ['in_progress', 'completed', 'abandoned'] as const;

export const DEFAULT_LANGUAGE = 'en';
export const DEFAULT_GENRES = ['fantasy'] as const;

export const ADULT_AGE_THRESHOLD = 18;

export const STORY_TONES = VALID_TONES;
export const STORY_POVS = VALID_POVS;
export const STORY_LENGTHS = VALID_LENGTHS;
export const AGE_BANDS = VALID_AGE_BANDS;

export const READING_PURPOSES = ['school', 'fun', 'bedtime'] as const;
export const ELEMENTARY_MAX_GRADE = 5;
export const ELEMENTARY_MAX_AGE = 11;
export const ELEMENTARY_GRL_LEVELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'] as const;
