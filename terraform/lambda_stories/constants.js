"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADULT_AGE_THRESHOLD = exports.CORS_HEADERS = exports.AGE_BANDS = exports.STORY_LENGTHS = exports.STORY_POVS = exports.STORY_TONES = exports.ALL_GENRES = void 0;
exports.ALL_GENRES = [
    'fantasy', 'mystery', 'sci-fi', 'romance', 'thriller', 'horror',
    'historical', 'literary', 'adventure', 'humor', 'drama', 'western',
    'paranormal', 'dystopian', 'mythology', 'fairy-tale', 'steampunk', 'noir',
    'animals', 'sports', 'school-life', 'science-space', 'funny', 'comic-style',
];
exports.STORY_TONES = ['light', 'serious', 'dark', 'epic', 'humorous'];
exports.STORY_POVS = [
    'first-person',
    'third-person-limited',
    'third-person-omniscient',
];
exports.STORY_LENGTHS = ['short', 'medium', 'long'];
exports.AGE_BANDS = [
    'adult',
    'teen',
    'middle-school',
    'upper-elementary',
    'early-elementary',
    'prek',
];
exports.CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
};
exports.ADULT_AGE_THRESHOLD = 18;
