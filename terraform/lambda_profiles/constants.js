"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADULT_AGE_THRESHOLD = exports.MAX_CHILD_PROFILES = exports.CORS_HEADERS = exports.DEFAULT_LANGUAGE = exports.LANGUAGES = exports.READING_LEVELS_GRL = exports.CHILD_AGE_BANDS = exports.CHILD_GENRES = exports.ADULT_GENRES = void 0;
exports.ADULT_GENRES = [
    'fantasy', 'mystery', 'sci-fi', 'romance', 'thriller', 'horror',
    'historical', 'literary', 'adventure', 'humor', 'drama', 'western',
    'paranormal', 'dystopian', 'mythology', 'fairy-tale', 'steampunk', 'noir',
];
exports.CHILD_GENRES = [
    'adventure', 'animals', 'sports', 'school-life', 'history',
    'science-space', 'funny', 'mystery', 'fairy-tales', 'comic-style',
];
exports.CHILD_AGE_BANDS = [
    'prek',
    'early-elementary',
    'upper-elementary',
    'middle-school',
];
exports.READING_LEVELS_GRL = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'Z+',
];
exports.LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'];
exports.DEFAULT_LANGUAGE = 'en';
exports.CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
};
exports.MAX_CHILD_PROFILES = 5;
exports.ADULT_AGE_THRESHOLD = 18;
