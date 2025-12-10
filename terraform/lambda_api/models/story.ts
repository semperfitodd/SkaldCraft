/**
 * Story Domain Models
 *
 * These interfaces define the data structures for the branching,
 * choose-your-adventure story system. Stories are composed of:
 * - Story metadata (configuration, bible, status)
 * - StoryNodes (individual episodes/branch points in the story graph)
 *
 * Design notes:
 * - StoryConfig captures settings at story creation time (snapshot)
 * - StoryBible holds compressed summaries for context management
 * - StoryNode.choices array enables branching narrative structure
 * - All text is stored in DynamoDB for now; contentS3Key is reserved
 *   for future migration of large text blobs to S3
 */

// -----------------------------------------------------------------------------
// Age Bands and Reading Levels
// -----------------------------------------------------------------------------

/**
 * Age bands for content appropriateness and complexity.
 * Adult/teen are for older readers; others map to typical school levels.
 */
export type AgeBand =
  | 'adult'
  | 'teen'
  | 'middle-school'
  | 'upper-elementary'
  | 'early-elementary'
  | 'prek';

/**
 * Guided Reading Level (GRL) values A-Z and Z+.
 * Used primarily for child profiles to calibrate vocabulary and sentence complexity.
 * Adults may leave this unset or use 'Z+'.
 */
export type ReadingLevelGRL =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J'
  | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T'
  | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z' | 'Z+';

// -----------------------------------------------------------------------------
// Story Configuration
// -----------------------------------------------------------------------------

/**
 * Genre options for stories.
 * This list can be extended; keep in sync with frontend options.
 */
export type StoryGenre =
  | 'fantasy'
  | 'mystery'
  | 'sci-fi'
  | 'romance'
  | 'thriller'
  | 'horror'
  | 'historical'
  | 'literary'
  | 'adventure'
  | 'humor'
  | 'drama'
  | 'western'
  | 'paranormal'
  | 'dystopian'
  | 'mythology'
  | 'fairy-tale'
  | 'steampunk'
  | 'noir'
  // Child-friendly genres
  | 'animals'
  | 'sports'
  | 'school-life'
  | 'science-space'
  | 'funny'
  | 'comic-style';

/**
 * Tone/mood of the story.
 */
export type StoryTone =
  | 'light'
  | 'serious'
  | 'dark'
  | 'epic'
  | 'humorous';

/**
 * Point of view for narration.
 */
export type StoryPOV =
  | 'first-person'
  | 'third-person-limited'
  | 'third-person-omniscient';

/**
 * Target length affects pacing and episode count.
 */
export type StoryLength =
  | 'short'   // ~5-10 nodes
  | 'medium'  // ~15-25 nodes
  | 'long';   // ~30+ nodes

/**
 * Configuration snapshot captured at story creation.
 * These values are immutable for the life of the story to ensure
 * consistent generation across all nodes.
 */
export interface StoryConfig {
  /** Age appropriateness band */
  ageBand: AgeBand;

  /** Reading level (optional for adults) */
  readingLevelGRL?: ReadingLevelGRL;

  /** Primary genre */
  genre: StoryGenre;

  /** Narrative tone */
  tone: StoryTone;

  /** Point of view */
  pov: StoryPOV;

  /** Target story length */
  targetLength: StoryLength;

  /** Whether explicit content is allowed (snapshot from profile) */
  explicitContentAllowed: boolean;
}

// -----------------------------------------------------------------------------
// Story Bible (Rolling Summaries)
// -----------------------------------------------------------------------------

/**
 * The story "bible" contains compressed summaries that help maintain
 * consistency across generation calls while keeping context size manageable.
 * These are updated as the story progresses.
 */
export interface StoryBible {
  /** High-level summary of the story so far (50-100 tokens) */
  storySummaryShort: string;

  /** Brief character sheet: names, traits, relationships */
  charactersSummary: string;

  /** Setting description: world, location, time period */
  settingSummary: string;

  /** Central conflict and stakes */
  conflictSummary: string;

  /** Thematic notes: motifs, lessons, recurring elements */
  themeNotes: string;
}

// -----------------------------------------------------------------------------
// Story Status
// -----------------------------------------------------------------------------

/**
 * Story lifecycle status.
 */
export type StoryStatus =
  | 'in_progress'  // Active story, reader can continue
  | 'completed'    // Story reached an ending node
  | 'abandoned';   // User chose to stop without finishing

// -----------------------------------------------------------------------------
// Story (Main Record)
// -----------------------------------------------------------------------------

/**
 * Main story record stored in the Stories table.
 * One item per story, keyed by storyId.
 */
export interface Story {
  /** Unique identifier (UUID) - Primary Key */
  storyId: string;

  /**
   * Profile that owns this story.
   * Can be an adult user's email or a child profile's profileId.
   */
  profileId: string;

  /** Story title (may be auto-generated or user-provided) */
  title: string;

  /** Current lifecycle status */
  status: StoryStatus;

  /** Configuration snapshot from creation */
  config: StoryConfig;

  /** Rolling summaries for context management */
  bible: StoryBible;

  /**
   * The node where the reader currently is in the main branch.
   * Updated when the reader makes choices.
   */
  activeNodeId: string;

  /** ISO timestamp of creation */
  createdAt: string;

  /** ISO timestamp of last update */
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Story Choices
// -----------------------------------------------------------------------------

/**
 * A choice presented to the reader at the end of a node.
 * Choices link to child nodes in the story graph.
 */
export interface StoryChoice {
  /** Unique identifier for this choice within the node */
  choiceId: string;

  /** Display text for the choice (what the reader sees) */
  label: string;

  /**
   * The nodeId this choice leads to.
   * May be null/undefined if the branch hasn't been generated yet.
   */
  targetNodeId?: string | null;
}

// -----------------------------------------------------------------------------
// Story Node
// -----------------------------------------------------------------------------

/**
 * A single node (episode/branch point) in the story graph.
 * Stored in the StoryNodes table with composite key (storyId, nodeId).
 */
export interface StoryNode {
  /** Story this node belongs to - Partition Key */
  storyId: string;

  /** Unique identifier for this node - Sort Key */
  nodeId: string;

  /**
   * Parent node's ID, or null for the root node.
   * Used to traverse the story graph.
   */
  parentNodeId: string | null;

  /**
   * The choice label that led to this node from the parent.
   * Null for the root node.
   */
  choiceLabelFromParent: string | null;

  /**
   * Depth in the story tree.
   * Root = 0, its children = 1, etc.
   * Useful for pacing and limiting story depth.
   */
  depth: number;

  /** The prose content for this episode */
  text: string;

  /**
   * Optional S3 key if text is stored externally.
   * Reserved for future use when text exceeds DynamoDB limits.
   */
  contentS3Key?: string | null;

  /**
   * Available choices at the end of this node.
   * Empty array for ending nodes.
   */
  choices: StoryChoice[];

  /**
   * Brief summary of what happens in this node (50-100 tokens).
   * Used for context compression in subsequent generations.
   */
  localSummary: string;

  /**
   * Whether this node represents a story ending.
   * Ending nodes have no choices.
   */
  isEnding: boolean;

  /** ISO timestamp of creation */
  createdAt: string;

  /** ISO timestamp of last update */
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Helper Types for Creation
// -----------------------------------------------------------------------------

/**
 * Input type for creating a new story.
 * Omits auto-generated fields.
 */
export type CreateStoryInput = Omit<Story, 'createdAt' | 'updatedAt'>;

/**
 * Input type for creating a new story node.
 * Omits auto-generated fields.
 */
export type CreateStoryNodeInput = Omit<StoryNode, 'createdAt' | 'updatedAt'>;

/**
 * Fields that can be updated on a story.
 */
export interface UpdateStoryInput {
  title?: string;
  status?: StoryStatus;
  bible?: Partial<StoryBible>;
  activeNodeId?: string;
}

/**
 * Fields that can be updated on a story node.
 */
export interface UpdateStoryNodeInput {
  text?: string;
  contentS3Key?: string | null;
  choices?: StoryChoice[];
  localSummary?: string;
  isEnding?: boolean;
}

