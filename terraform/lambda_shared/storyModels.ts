export type AgeBand = 'adult' | 'teen' | 'middle-school' | 'upper-elementary' | 'early-elementary' | 'prek';

export type ReadingLevelGRL =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J'
  | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T'
  | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z' | 'Z+';

export type StoryGenre =
  | 'fantasy' | 'mystery' | 'sci-fi' | 'romance' | 'thriller' | 'horror'
  | 'historical' | 'literary' | 'adventure' | 'humor' | 'drama' | 'western'
  | 'paranormal' | 'dystopian' | 'mythology' | 'fairy-tale' | 'steampunk' | 'noir'
  | 'animals' | 'sports' | 'school-life' | 'science-space' | 'funny' | 'comic-style';

export type StoryTone = 'light' | 'serious' | 'dark' | 'epic' | 'humorous';

export type StoryPOV = 'first-person' | 'third-person-limited' | 'third-person-omniscient';

export type StoryLength = 'short' | 'medium' | 'long';

export type StoryStatus = 'creating' | 'generating_chapter' | 'in_progress' | 'completed' | 'abandoned' | 'failed';

export type ReadingPurpose = 'school' | 'fun' | 'bedtime';

export interface StoryConfig {
  ageBand: AgeBand;
  readingLevelGRL?: ReadingLevelGRL;
  genre: StoryGenre;
  tone: StoryTone;
  pov: StoryPOV;
  targetLength: StoryLength;
  explicitContentAllowed: boolean;
}

export interface StoryBible {
  storySummaryShort: string;
  charactersSummary: string;
  settingSummary: string;
  conflictSummary: string;
  themeNotes: string;
}

export interface OutlineChapter {
  chapterIndex: number;
  title: string;
  description: string;
}

export interface Story {
  storyId: string;
  profileId: string;
  title: string;
  status: StoryStatus;
  config: StoryConfig;
  bible: StoryBible;
  outline: OutlineChapter[];
  targetNodeCount: number;
  activeNodeId: string;
  pendingChoiceId?: string | null;
  generationError?: string | null;
  isArchived?: boolean;
  contentS3Key?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoryChoice {
  choiceId: string;
  label: string;
  targetNodeId?: string | null;
}

export interface StoryNode {
  storyId: string;
  nodeId: string;
  parentNodeId: string | null;
  choiceLabelFromParent: string | null;
  chapterIndex: number;
  depth: number;
  text: string;
  choices: StoryChoice[];
  localSummary: string;
  isEnding: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateStoryInput = Omit<Story, 'createdAt' | 'updatedAt' | 'isArchived' | 'contentS3Key' | 'completedAt'>;

export type CreateStoryNodeInput = Omit<StoryNode, 'createdAt' | 'updatedAt'>;

export interface UpdateStoryInput {
  title?: string;
  status?: StoryStatus;
  bible?: Partial<StoryBible>;
  outline?: OutlineChapter[];
  activeNodeId?: string;
  pendingChoiceId?: string | null;
  generationError?: string | null;
  isArchived?: boolean;
  contentS3Key?: string | null;
  completedAt?: string | null;
}

export interface UpdateStoryNodeInput {
  text?: string;
  choices?: StoryChoice[];
  localSummary?: string;
  isEnding?: boolean;
}

export interface ArchivedChapter {
  chapterIndex: number;
  title: string;
  nodeId: string;
  text: string;
  choicesTaken: Array<{
    choiceId: string;
    label: string;
  }>;
  localSummary: string;
}

export interface ArchivedStoryMetadata {
  storyId: string;
  profileId: string;
  title: string;
  status: 'completed';
  targetLength: StoryLength;
  targetNodeCount: number;
  createdAt: string;
  completedAt: string;
  genre: StoryGenre;
  tone: StoryTone;
  pov: StoryPOV;
  ageBand: AgeBand;
  readingLevelGRL?: ReadingLevelGRL;
  explicitContentAllowed: boolean;
  outline: OutlineChapter[];
}

export interface ArchivedStory {
  metadata: ArchivedStoryMetadata;
  chapters: ArchivedChapter[];
}

export interface OutlineGenerationResponse {
  outline: Array<{
    chapterIndex: number;
    title: string;
    description: string;
  }>;
  suggestedTitle: string;
}

export interface ChapterGenerationResponse {
  chapterText: string;
  choices: Array<{ label: string }>;
  localSummary: string;
  updatedStorySummaryShort: string;
  updatedCharactersSummary: string;
  updatedSettingSummary: string;
  updatedConflictSummary: string;
  updatedThemeNotes: string;
  isEnding: boolean;
}

export interface RootChapterGenerationResponse {
  chapterText: string;
  choices: Array<{ label: string }>;
  localSummary: string;
  storySummaryShort: string;
  charactersSummary: string;
  settingSummary: string;
  conflictSummary: string;
  themeNotes: string;
}
