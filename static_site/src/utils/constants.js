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

export const EXPLICIT_CONTENT_DISABLED_MESSAGE = 
  'Explicit content is disabled for readers under 18 based on their birthdate.';

export const ADULT_AGE_THRESHOLD = 18;

export const POLLING_CONFIG = {
  maxAttempts: 15,
  intervalMs: 7000,
};
