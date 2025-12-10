export const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export const VALID_GENRES = [
  'fantasy', 'mystery', 'sci-fi', 'romance', 'thriller', 'horror',
  'historical', 'literary', 'adventure', 'humor', 'drama', 'western',
  'paranormal', 'dystopian', 'mythology', 'fairy-tale', 'steampunk', 'noir',
];

export const VALID_CHILD_GENRES = [
  'adventure', 'animals', 'sports', 'school-life', 'history',
  'science-space', 'funny', 'mystery', 'fairy-tales', 'comic-style',
];

export const ALL_GENRES = [...VALID_GENRES, ...VALID_CHILD_GENRES.filter(g => !VALID_GENRES.includes(g))];

export const VALID_LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'];

export const VALID_GRL_VALUES = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'Z+',
];

export const VALID_AGE_BANDS = [
  'adult', 'teen', 'middle-school', 'upper-elementary', 'early-elementary', 'prek',
];

export const VALID_CHILD_AGE_BANDS = ['prek', 'early-elementary', 'upper-elementary', 'middle-school'];

export const VALID_TONES = ['light', 'serious', 'dark', 'epic', 'humorous'];

export const VALID_POVS = ['first-person', 'third-person-limited', 'third-person-omniscient'];

export const VALID_LENGTHS = ['short', 'medium', 'long'];

export const VALID_STORY_STATUSES = ['in_progress', 'completed', 'abandoned'];

export const DEFAULT_LANGUAGE = 'en';
export const DEFAULT_GENRES = ['fantasy'];

