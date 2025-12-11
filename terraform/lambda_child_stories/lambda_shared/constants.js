"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ELEMENTARY_GRL_LEVELS = exports.ELEMENTARY_MAX_AGE = exports.ELEMENTARY_MAX_GRADE = exports.READING_PURPOSES = exports.AGE_BANDS = exports.STORY_LENGTHS = exports.STORY_POVS = exports.STORY_TONES = exports.ADULT_AGE_THRESHOLD = exports.DEFAULT_GENRES = exports.DEFAULT_LANGUAGE = exports.VALID_STORY_STATUSES = exports.VALID_LENGTHS = exports.VALID_POVS = exports.VALID_TONES = exports.VALID_CHILD_AGE_BANDS = exports.VALID_AGE_BANDS = exports.VALID_GRL_VALUES = exports.VALID_LANGUAGES = exports.ALL_GENRES = exports.VALID_CHILD_GENRES = exports.VALID_GENRES = exports.CORS_HEADERS = void 0;
exports.CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
};
exports.VALID_GENRES = [
    'fantasy', 'mystery', 'sci-fi', 'romance', 'thriller', 'horror',
    'historical', 'literary', 'adventure', 'humor', 'drama', 'western',
    'paranormal', 'dystopian', 'mythology', 'fairy-tale', 'steampunk', 'noir',
];
exports.VALID_CHILD_GENRES = [
    'adventure', 'animals', 'sports', 'school-life', 'history',
    'science-space', 'funny', 'mystery', 'fairy-tales', 'comic-style',
];
exports.ALL_GENRES = [
    'fantasy', 'mystery', 'sci-fi', 'romance', 'thriller', 'horror',
    'historical', 'literary', 'adventure', 'humor', 'drama', 'western',
    'paranormal', 'dystopian', 'mythology', 'fairy-tale', 'steampunk', 'noir',
    'animals', 'sports', 'school-life', 'science-space', 'funny', 'comic-style',
];
exports.VALID_LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'];
exports.VALID_GRL_VALUES = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'Z+',
];
exports.VALID_AGE_BANDS = [
    'adult', 'teen', 'middle-school', 'upper-elementary', 'early-elementary', 'prek',
];
exports.VALID_CHILD_AGE_BANDS = ['prek', 'early-elementary', 'upper-elementary', 'middle-school'];
exports.VALID_TONES = ['light', 'serious', 'dark', 'epic', 'humorous'];
exports.VALID_POVS = ['first-person', 'third-person-limited', 'third-person-omniscient'];
exports.VALID_LENGTHS = ['short', 'medium', 'long'];
exports.VALID_STORY_STATUSES = ['in_progress', 'completed', 'abandoned'];
exports.DEFAULT_LANGUAGE = 'en';
exports.DEFAULT_GENRES = ['fantasy'];
exports.ADULT_AGE_THRESHOLD = 18;
exports.STORY_TONES = exports.VALID_TONES;
exports.STORY_POVS = exports.VALID_POVS;
exports.STORY_LENGTHS = exports.VALID_LENGTHS;
exports.AGE_BANDS = exports.VALID_AGE_BANDS;
exports.READING_PURPOSES = ['school', 'fun', 'bedtime'];
exports.ELEMENTARY_MAX_GRADE = 5;
exports.ELEMENTARY_MAX_AGE = 11;
exports.ELEMENTARY_GRL_LEVELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
