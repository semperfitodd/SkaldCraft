"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_GENRES = exports.DEFAULT_LANGUAGE = exports.VALID_STORY_STATUSES = exports.VALID_LENGTHS = exports.VALID_POVS = exports.VALID_TONES = exports.VALID_CHILD_AGE_BANDS = exports.VALID_AGE_BANDS = exports.VALID_GRL_VALUES = exports.VALID_LANGUAGES = exports.ALL_GENRES = exports.VALID_CHILD_GENRES = exports.VALID_GENRES = exports.CORS_HEADERS = void 0;
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
exports.ALL_GENRES = [...exports.VALID_GENRES, ...exports.VALID_CHILD_GENRES.filter(g => !exports.VALID_GENRES.includes(g))];
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
