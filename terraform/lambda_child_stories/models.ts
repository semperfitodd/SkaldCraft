export type {
  AgeBand,
  ReadingLevelGRL,
  StoryGenre,
  StoryTone,
  StoryPOV,
  StoryLength,
  StoryStatus,
  ReadingPurpose,
  StoryConfig,
  StoryBible,
  OutlineChapter,
  Story,
  StoryChoice,
  StoryNode,
  CreateStoryInput,
  CreateStoryNodeInput,
  UpdateStoryInput,
  UpdateStoryNodeInput,
  ArchivedChapter,
  ArchivedStoryMetadata,
  ArchivedStory,
  OutlineGenerationResponse,
  ChapterGenerationResponse,
  RootChapterGenerationResponse,
} from 'lambda_shared/storyModels';

export interface CreateChildStoryRequest {
  profileId: string;
  readingPurpose: import('../lambda_shared/storyModels').ReadingPurpose;
  readingLevel?: string | null;
  gradeLevel?: number | null;
  age?: number | null;
  title?: string | null;
  genre?: import('../lambda_shared/storyModels').StoryGenre | null;
  tone?: import('../lambda_shared/storyModels').StoryTone | null;
  pov?: import('../lambda_shared/storyModels').StoryPOV | null;
  targetLength: import('../lambda_shared/storyModels').StoryLength;
  customPrompt?: string | null;
}

export interface ContinueChildStoryRequest {
  choiceId: string;
  userHint?: string | null;
}
