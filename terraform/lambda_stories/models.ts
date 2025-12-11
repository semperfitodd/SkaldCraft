export type {
  AgeBand,
  ReadingLevelGRL,
  StoryGenre,
  StoryTone,
  StoryPOV,
  StoryLength,
  StoryStatus,
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

export interface CreateAdultStoryRequest {
  profileId: string;
  title?: string | null;
  genre?: import('../lambda_shared/storyModels').StoryGenre | null;
  tone?: import('../lambda_shared/storyModels').StoryTone | null;
  pov?: import('../lambda_shared/storyModels').StoryPOV | null;
  targetLength: import('../lambda_shared/storyModels').StoryLength;
  customPrompt?: string | null;
}

export interface ContinueStoryRequest {
  choiceId: string;
  userHint?: string | null;
}

export interface CreateStoryResponse {
  story: import('../lambda_shared/storyModels').Story;
  rootNode: import('../lambda_shared/storyModels').StoryNode;
}

export interface ContinueStoryResponse {
  story: import('../lambda_shared/storyModels').Story;
  newNode: import('../lambda_shared/storyModels').StoryNode;
}

export interface StoryCurrentResponse {
  story: import('../lambda_shared/storyModels').Story;
  currentNode: import('../lambda_shared/storyModels').StoryNode;
}
