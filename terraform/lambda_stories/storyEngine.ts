import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import type {
  Story,
  StoryNode,
  StoryConfig,
  StoryBible,
  StoryChoice,
  StoryGenre,
  StoryTone,
  StoryPOV,
  StoryLength,
  OutlineChapter,
  ArchivedStory,
  ArchivedChapter,
  OutlineGenerationResponse,
  RootChapterGenerationResponse,
  ChapterGenerationResponse,
} from './models';
import {
  createStory as repoCreateStory,
  createStoryNode,
  getStoryById,
  getStoryNode,
  updateStory,
  getPathToNode,
  listNodesForStory,
  deleteStoryNodes,
} from './repository';

const ADULT_STORY_MODEL_ID = process.env.ADULT_STORY_MODEL_ID!;
const STORY_ARCHIVE_BUCKET = process.env.STORY_ARCHIVE_BUCKET!;
const STORY_ARCHIVE_PREFIX = process.env.STORY_ARCHIVE_PREFIX || 'stories/';

export const LENGTH_TO_NODE_COUNT: Record<StoryLength, number> = {
  short: 5,
  medium: 10,
  long: 20,
};

export type StoryStage = 'setup' | 'rising_action' | 'complication' | 'climax' | 'resolution';

const BEAT_MAPS: Record<StoryLength, StoryStage[]> = {
  short: ['setup', 'rising_action', 'complication', 'climax', 'resolution'],
  medium: [
    'setup', 'setup',
    'rising_action', 'rising_action', 'rising_action',
    'complication', 'complication',
    'climax', 'climax',
    'resolution',
  ],
  long: [
    'setup', 'setup', 'setup',
    'rising_action', 'rising_action', 'rising_action', 'rising_action',
    'complication', 'complication', 'complication', 'complication',
    'climax', 'climax', 'climax', 'climax',
    'resolution', 'resolution', 'resolution', 'resolution', 'resolution',
  ],
};

const STAGE_DESCRIPTIONS: Record<StoryStage, string> = {
  setup: 'Introduce the main characters, establish the setting, and present the initial situation or conflict. Hook the reader with an intriguing opening.',
  rising_action: 'Build tension and develop the story. Introduce complications, deepen character relationships, and raise the stakes. Move the plot forward with meaningful events.',
  complication: 'Introduce a significant twist, obstacle, or escalation. Challenge the characters in unexpected ways. This should feel like a turning point.',
  climax: 'The decisive moment of the story. Maximum tension and conflict. Characters must make crucial decisions or face their greatest challenge.',
  resolution: 'Resolve the main conflict. Tie up loose ends. Provide a satisfying conclusion that feels earned based on what came before.',
};

export interface CreateAdultStoryOptions {
  profileId: string;
  userEmail: string;
  title?: string;
  genre?: StoryGenre | null;
  tone?: StoryTone | null;
  pov?: StoryPOV | null;
  targetLength: StoryLength;
  customPrompt?: string | null;
  explicitContentAllowed: boolean;
}

export interface ContinueAdultStoryOptions {
  storyId: string;
  choiceId: string;
  userEmail: string;
  profileId: string;
  userHint?: string | null;
}

export interface CreateStoryResult {
  story: Story;
  rootNode: StoryNode;
}

export interface ContinueStoryResult {
  story: Story;
  newNode: StoryNode;
}

const bedrockClient = new BedrockRuntimeClient({});
const s3Client = new S3Client({});

export function getStoryStage(targetLength: StoryLength, nodeIndex: number): StoryStage {
  const beats = BEAT_MAPS[targetLength];
  return nodeIndex >= beats.length ? 'resolution' : beats[nodeIndex];
}

function getContentGuidelines(explicitContentAllowed: boolean): string {
  if (explicitContentAllowed) {
    return `CONTENT GUIDELINES (Mature Themes Allowed):
- You may include mature themes, complex moral situations, and adult relationships
- Romantic/intimate scenes are allowed but should serve the story
- Violence can be depicted realistically but avoid gratuitous gore
- NEVER include: illegal content, child abuse, bestiality, detailed self-harm instructions
- Stay within "mature fiction" boundaries - think published adult novels, not extreme content
- No hate speech, slurs, or content promoting extremism`;
  }

  return `CONTENT GUIDELINES (No Explicit Content):
- No explicit sexual content
- No graphic violence or gore
- No self-harm instructions or promotion
- No hate speech or slurs
- Keep content appropriate for a general adult audience
- Violence can be implied or briefly described, not dwelt upon
- Romance is fine but keep physical intimacy tasteful and non-explicit`;
}

function getPovInstructions(pov: StoryPOV): string {
  switch (pov) {
    case 'first-person':
      return 'Use "I" and show only what the narrator knows/perceives.';
    case 'third-person-limited':
      return 'Stay close to one character\'s perspective and knowledge.';
    case 'third-person-omniscient':
      return 'You may show any character\'s thoughts and knowledge.';
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  const name = error.name?.toLowerCase() || '';
  
  return (
    message.includes('throttl') ||
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('service unavailable') ||
    message.includes('internal server error') ||
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('network') ||
    name.includes('throttling') ||
    name.includes('serviceunavailable')
  );
}

async function invokeBedrockJSON<T>(
  modelId: string,
  systemPrompt: string,
  userContent: string,
  storyId: string,
  profileId: string,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const backoffMs = attempt > 0 ? Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 10000) : 0;
    if (backoffMs > 0) {
      console.log('[StoryEngine] Retrying after backoff', { storyId, profileId, attempt, backoffMs: Math.round(backoffMs) });
      await sleep(backoffMs);
    }

    console.log('[StoryEngine] Invoking Bedrock', { modelId, storyId, profileId, attempt });

    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 8192,
        temperature: attempt > 0 ? 0.5 : 0.9,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    let response;
    try {
      response = await bedrockClient.send(command);
    } catch (bedrockError) {
      const errorMessage = bedrockError instanceof Error ? bedrockError.message : 'Unknown error';
      console.error('[StoryEngine] Bedrock invocation failed', {
        storyId,
        profileId,
        modelId,
        attempt,
        error: errorMessage,
        retryable: isRetryableError(bedrockError),
      });
      
      if (isRetryableError(bedrockError) && attempt < maxRetries - 1) {
        lastError = new Error(`Bedrock invocation failed: ${errorMessage}`);
        continue;
      }
      throw new Error(`Bedrock invocation failed: ${errorMessage}`);
    }

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    console.log('[StoryEngine] Bedrock response', {
      storyId,
      profileId,
      attempt,
      inputTokens: responseBody.usage?.input_tokens,
      outputTokens: responseBody.usage?.output_tokens,
      stopReason: responseBody.stop_reason,
    });

    const textContent = responseBody.content?.[0]?.text;
    if (!textContent) {
      lastError = new Error('No text content in Bedrock response');
      if (attempt < maxRetries - 1) continue;
      throw lastError;
    }

    let jsonStr = textContent.trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
    else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    let fixedJson = jsonStr;
    
    // Fix unescaped newlines, carriage returns, and tabs within string values
    // This regex matches quoted strings and replaces literal newlines/tabs with escaped versions
    const stringRegex = /"(?:[^"\\]|\\["\\\/bfnrt]|\\u[0-9a-fA-F]{4})*"/g;
    const strings: string[] = [];
    let stringIndex = 0;
    
    // Extract all strings, fix them, and replace with placeholders
    fixedJson = fixedJson.replace(stringRegex, (match: string) => {
      const fixed = match
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      strings.push(fixed);
      return `__STRING_${stringIndex++}__`;
    });
    
    // Put the fixed strings back
    stringIndex = 0;
    fixedJson = fixedJson.replace(/__STRING_\d+__/g, () => strings[stringIndex++]);

    try {
      return JSON.parse(fixedJson) as T;
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error';
      console.error('[StoryEngine] JSON parse failed', { 
        storyId, 
        profileId, 
        attempt,
        parseError: errorMessage,
        textLength: textContent.length,
        textPreview: textContent.substring(0, 300),
        textEnd: textContent.substring(Math.max(0, textContent.length - 100)),
        rawJson: jsonStr.length < 6000 ? jsonStr : 'too long to log',
      });
      lastError = new Error(`Failed to parse AI response as JSON: ${errorMessage}`);
      if (attempt < maxRetries - 1) continue;
    }
  }
  
  throw lastError || new Error('Failed to get valid response from AI');
}

function validateOutlineResponse(resp: unknown): resp is OutlineGenerationResponse {
  const r = resp as OutlineGenerationResponse;
  return (
    Array.isArray(r.outline) &&
    r.outline.every((ch) => 
      typeof ch.chapterIndex === 'number' &&
      typeof ch.title === 'string' &&
      typeof ch.description === 'string'
    ) &&
    typeof r.suggestedTitle === 'string'
  );
}

function validateRootChapterResponse(resp: unknown): resp is RootChapterGenerationResponse {
  const r = resp as RootChapterGenerationResponse;
  return (
    typeof r.chapterText === 'string' &&
    Array.isArray(r.choices) &&
    r.choices.every((c) => typeof c.label === 'string') &&
    typeof r.localSummary === 'string' &&
    typeof r.storySummaryShort === 'string' &&
    typeof r.charactersSummary === 'string' &&
    typeof r.settingSummary === 'string' &&
    typeof r.conflictSummary === 'string' &&
    typeof r.themeNotes === 'string'
  );
}

function validateChapterResponse(resp: unknown): resp is ChapterGenerationResponse {
  const r = resp as ChapterGenerationResponse;
  return (
    typeof r.chapterText === 'string' &&
    Array.isArray(r.choices) &&
    r.choices.every((c) => typeof c.label === 'string') &&
    typeof r.localSummary === 'string' &&
    typeof r.updatedStorySummaryShort === 'string' &&
    typeof r.updatedCharactersSummary === 'string' &&
    typeof r.updatedSettingSummary === 'string' &&
    typeof r.updatedConflictSummary === 'string' &&
    typeof r.updatedThemeNotes === 'string' &&
    typeof r.isEnding === 'boolean'
  );
}

function buildOutlineSystemPrompt(config: StoryConfig, targetNodeCount: number): string {
  return `You are an expert story planner creating a chapter-by-chapter outline for an interactive fiction story.

STORY CONFIGURATION:
- Genre: ${config.genre}
- Tone: ${config.tone}
- Point of View: ${config.pov}
- Total Chapters: ${targetNodeCount}

${getContentGuidelines(config.explicitContentAllowed)}

OUTLINE REQUIREMENTS:
- Create exactly ${targetNodeCount} chapters
- Each chapter should have a compelling title and clear purpose
- Follow classic story structure: setup → rising action → complication → climax → resolution
- Chapters 1-2: Setup (introduce characters, setting, initial situation)
- Middle chapters: Rising action and complications (build tension, develop conflict)
- Final chapters: Climax and resolution (decisive confrontation, satisfying ending)
- Each chapter description should be 1-2 sentences explaining the major beat
- Titles should be evocative but not spoil specific plot points

OUTPUT FORMAT - CRITICAL:
Respond with ONLY a complete, valid JSON object. Ensure all string values are properly escaped:
- Use \\n for line breaks (not literal newlines)
- Use \\" for quotes within strings
- Use \\\\ for backslashes

{
  "outline": [
    {"chapterIndex": 1, "title": "Chapter 1: [Title]", "description": "What happens in this chapter."},
    {"chapterIndex": 2, "title": "Chapter 2: [Title]", "description": "What happens in this chapter."}
  ],
  "suggestedTitle": "A compelling title for the overall story"
}

CRITICAL:
- Include exactly ${targetNodeCount} chapters
- Ensure the JSON is valid and parseable
- Close all brackets and quotes properly`;
}

function buildOutlineUserContent(options: CreateAdultStoryOptions, config: StoryConfig): string {
  const premise = options.customPrompt
    ? `Custom request: "${options.customPrompt}"`
    : `Genre: ${config.genre}, Tone: ${config.tone}${options.title ? `, Working title: "${options.title}"` : ''}`;

  return `Create a detailed chapter outline for this story:

PREMISE:
${premise}

Generate an outline with compelling chapter titles and clear story beats. The outline should set up an engaging narrative arc with meaningful character development and satisfying resolution.`;
}

function buildRootChapterSystemPrompt(
  config: StoryConfig,
  outline: OutlineChapter[],
  targetNodeCount: number
): string {
  const chapter = outline[0];
  
  return `You are an expert interactive fiction author writing Chapter 1 of a new story.

STORY CONFIGURATION:
- Genre: ${config.genre}
- Tone: ${config.tone}
- Point of View: ${config.pov}
- Total Chapters: ${targetNodeCount}

CHAPTER ASSIGNMENT:
- Chapter: ${chapter.title}
- Purpose: ${chapter.description}
- Story Stage: SETUP

FULL STORY OUTLINE (for context):
${outline.map(ch => `${ch.title}: ${ch.description}`).join('\n')}

${getContentGuidelines(config.explicitContentAllowed)}

CHAPTER REQUIREMENTS:
- Write 900-1100 words of engaging prose
- This is a FULL CHAPTER, not a short scene - develop it thoroughly
- Cover the major beat described in the chapter assignment
- Establish characters, setting, and initial situation
- Hook the reader with compelling opening
- End at a meaningful decision point with 2-3 choices
- POV: ${config.pov}. ${getPovInstructions(config.pov)}

WRITING GUIDELINES:
- Rich, immersive prose with sensory details
- Develop characters through action and dialogue
- Build atmosphere appropriate to the genre and tone
- Plant seeds for the conflicts to come
- Each choice should lead to genuinely different paths

OUTPUT FORMAT - CRITICAL:
Respond with ONLY a complete, valid JSON object. You MUST properly escape all special characters in string values:
- Newlines must be \\n (not literal line breaks)
- Quotes must be \\"
- Backslashes must be \\\\

{
  "chapterText": "The full chapter prose (900-1100 words). Use \\n for paragraph breaks, not literal newlines.",
  "choices": [{"label": "Choice 1 (5-15 words)"}, {"label": "Choice 2 (5-15 words)"}],
  "localSummary": "1-2 sentence chapter summary",
  "storySummaryShort": "2-3 sentence overall story summary",
  "charactersSummary": "Key characters introduced (names, roles, traits)",
  "settingSummary": "Setting and world details established",
  "conflictSummary": "Central conflict or tension introduced",
  "themeNotes": "Thematic elements being explored"
}

CRITICAL: 
- Write a FULL chapter of 900-1100 words
- Use \\n for paragraph breaks in chapterText, NOT literal newlines
- Ensure the JSON is valid and parseable
- Close all brackets and quotes properly`;
}

function buildRootChapterUserContent(options: CreateAdultStoryOptions, config: StoryConfig): string {
  const premise = options.customPrompt
    ? `Custom request: "${options.customPrompt}"`
    : `Genre: ${config.genre}, Tone: ${config.tone}`;

  return `Write Chapter 1 of this interactive story.

PREMISE:
${premise}

Create an immersive opening chapter that establishes the story world and hooks the reader. Remember to write 900-1100 words and end with meaningful choices.`;
}

function buildContinuationSystemPrompt(
  config: StoryConfig,
  bible: StoryBible,
  outline: OutlineChapter[],
  currentChapterIndex: number,
  targetNodeCount: number,
  stage: StoryStage,
  isForceEnding: boolean
): string {
  const chapter = outline[currentChapterIndex] || outline[outline.length - 1];
  const chaptersRemaining = targetNodeCount - currentChapterIndex;

  let endingInstructions = '';
  if (isForceEnding || stage === 'resolution') {
    endingInstructions = `
ENDING INSTRUCTIONS:
This is the final chapter. You MUST:
- Resolve the main conflict
- Provide closure for characters
- Create a satisfying ending
- Set "isEnding" to true
- Provide an EMPTY choices array: "choices": []`;
  } else if (chaptersRemaining <= 2) {
    endingInstructions = `
APPROACHING END:
Only ${chaptersRemaining} chapters remain. Begin steering toward resolution.`;
  }

  const choicesInstruction = isForceEnding || stage === 'resolution'
    ? '- This is the ENDING - no choices needed'
    : '- End with 2-3 meaningful choices for the reader';

  return `You are an expert interactive fiction author continuing an existing story.

STORY CONFIGURATION:
- Genre: ${config.genre}
- Tone: ${config.tone}
- Point of View: ${config.pov}
- Total Chapters: ${targetNodeCount}

STORY BIBLE (established facts):
Summary: ${bible.storySummaryShort}
Characters: ${bible.charactersSummary}
Setting: ${bible.settingSummary}
Conflict: ${bible.conflictSummary}
Themes: ${bible.themeNotes}

CHAPTER ASSIGNMENT:
- Chapter: ${chapter.title}
- Purpose: ${chapter.description}
- Story Stage: ${stage.toUpperCase().replace('_', ' ')}
- Progress: Chapter ${currentChapterIndex + 1} of ${targetNodeCount}

FULL STORY OUTLINE (for context):
${outline.map(ch => `${ch.title}: ${ch.description}`).join('\n')}
${endingInstructions}

${getContentGuidelines(config.explicitContentAllowed)}

CRITICAL RULES:
1. NEVER contradict established events, characters, or world details
2. NEVER rehash previous chapters - always move FORWARD
3. ALWAYS maintain character consistency
4. Cover THIS chapter's beat as outlined
5. Respect POV: ${config.pov}. ${getPovInstructions(config.pov)}

CHAPTER REQUIREMENTS:
- Write 900-1100 words of engaging prose
- This is a FULL CHAPTER - develop it thoroughly
- Cover the beat described in the chapter assignment
- Continue directly from the reader's choice
- Show consequences of the choice made
${choicesInstruction}

OUTPUT FORMAT - CRITICAL:
Respond with ONLY a complete, valid JSON object. You MUST properly escape all special characters in string values:
- Newlines must be \\n (not literal line breaks)
- Quotes must be \\"
- Backslashes must be \\\\

{
  "chapterText": "The full chapter prose (900-1100 words). Use \\n for paragraph breaks, not literal newlines.",
  "choices": [{"label": "Choice 1"}, {"label": "Choice 2"}],
  "localSummary": "1-2 sentence chapter summary",
  "updatedStorySummaryShort": "Updated 2-3 sentence story summary",
  "updatedCharactersSummary": "Updated character notes",
  "updatedSettingSummary": "Updated setting notes",
  "updatedConflictSummary": "Updated conflict status",
  "updatedThemeNotes": "Updated theme notes",
  "isEnding": ${isForceEnding || stage === 'resolution' ? 'true' : 'false'}
}

${isForceEnding || stage === 'resolution' ? 'For this ending, set "isEnding": true and "choices": []' : 'Set "isEnding": false unless this is a natural conclusion.'}

CRITICAL:
- Write a FULL chapter of 900-1100 words
- Use \\n for paragraph breaks in chapterText, NOT literal newlines
- Ensure the JSON is valid and parseable
- Close all brackets and quotes properly`;
}

function buildContinuationUserContent(
  recentNodes: StoryNode[],
  chosenLabel: string,
  userHint?: string | null
): string {
  const contextNodes = recentNodes.slice(-2);
  const recentContext = contextNodes
    .map((n, i) => `[Previous Chapter ${i + 1}]:\n${n.text.substring(0, 1500)}${n.text.length > 1500 ? '...' : ''}`)
    .join('\n\n');

  let content = `Continue the story based on the reader's choice.

RECENT STORY CONTEXT:
${recentContext}

THE READER CHOSE:
"${chosenLabel}"`;

  if (userHint) {
    content += `

USER HINT (optional guidance):
"${userHint}"`;
  }

  content += `

Write the next full chapter (900-1100 words), picking up immediately after the choice. Show the consequences of this decision and advance the plot according to the chapter outline.`;

  return content;
}

function buildChoices(labels: Array<{ label: string }>): StoryChoice[] {
  return labels.map((c) => ({
    choiceId: randomUUID(),
    label: c.label,
    targetNodeId: null,
  }));
}

function getS3Key(profileId: string, storyId: string): string {
  return `${STORY_ARCHIVE_PREFIX}${profileId}/${storyId}.json`;
}

export async function archiveCompletedStory(story: Story): Promise<string> {
  if (story.status !== 'completed') {
    throw new Error('Can only archive completed stories');
  }

  if (story.isArchived && story.contentS3Key) {
    console.log('[StoryEngine] Story already archived', { storyId: story.storyId });
    return story.contentS3Key;
  }

  const pathToEnd = await getPathToNode(story.storyId, story.activeNodeId);
  if (!pathToEnd.length) {
    throw new Error('No nodes found for story');
  }

  const chapters: ArchivedChapter[] = pathToEnd.map((node, index) => ({
    chapterIndex: node.chapterIndex,
    title: story.outline[node.chapterIndex]?.title || `Chapter ${node.chapterIndex + 1}`,
    nodeId: node.nodeId,
    text: node.text,
    choicesTaken: node.choiceLabelFromParent
      ? [{ choiceId: 'chosen', label: node.choiceLabelFromParent }]
      : [],
    localSummary: node.localSummary,
  }));

  const archivedStory: ArchivedStory = {
    metadata: {
      storyId: story.storyId,
      profileId: story.profileId,
      title: story.title,
      status: 'completed',
      targetLength: story.config.targetLength,
      targetNodeCount: story.targetNodeCount,
      createdAt: story.createdAt,
      completedAt: story.completedAt || new Date().toISOString(),
      genre: story.config.genre,
      tone: story.config.tone,
      pov: story.config.pov,
      ageBand: story.config.ageBand,
      readingLevelGRL: story.config.readingLevelGRL,
      explicitContentAllowed: story.config.explicitContentAllowed,
      outline: story.outline,
    },
    chapters,
  };

  const s3Key = getS3Key(story.profileId, story.storyId);

  await s3Client.send(new PutObjectCommand({
    Bucket: STORY_ARCHIVE_BUCKET,
    Key: s3Key,
    Body: JSON.stringify(archivedStory, null, 2),
    ContentType: 'application/json',
  }));

  console.log('[StoryEngine] Story archived to S3', { storyId: story.storyId, s3Key });

  await deleteStoryNodes(story.storyId);
  console.log('[StoryEngine] Story nodes purged from DynamoDB', { storyId: story.storyId });

  await updateStory(story.storyId, {
    isArchived: true,
    contentS3Key: s3Key,
    completedAt: story.completedAt || new Date().toISOString(),
  });

  return s3Key;
}

export async function getArchivedStory(storyId: string): Promise<ArchivedStory | null> {
  const story = await getStoryById(storyId);
  if (!story) return null;

  if (!story.isArchived || !story.contentS3Key) {
    return null;
  }

  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: STORY_ARCHIVE_BUCKET,
      Key: story.contentS3Key,
    }));

    const bodyString = await response.Body?.transformToString();
    if (!bodyString) return null;

    return JSON.parse(bodyString) as ArchivedStory;
  } catch (error) {
    console.error('[StoryEngine] Failed to get archived story', {
      storyId,
      s3Key: story.contentS3Key,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

export interface InitStoryResult {
  story: Story;
}

export async function initAdultStory(options: CreateAdultStoryOptions): Promise<InitStoryResult> {
  if (options.customPrompt && options.customPrompt.length > 500) {
    throw new Error('Custom prompt must be 500 characters or less');
  }

  const targetNodeCount = LENGTH_TO_NODE_COUNT[options.targetLength];

  const config: StoryConfig = {
    ageBand: 'adult',
    genre: options.genre || 'fantasy',
    tone: options.tone || 'light',
    pov: options.pov || 'third-person-limited',
    targetLength: options.targetLength,
    explicitContentAllowed: options.explicitContentAllowed,
  };

  const storyId = randomUUID();
  const placeholderTitle = options.title?.trim() || `New ${config.genre.charAt(0).toUpperCase() + config.genre.slice(1)} Story`;

  const emptyBible: StoryBible = {
    storySummaryShort: '',
    charactersSummary: '',
    settingSummary: '',
    conflictSummary: '',
    themeNotes: '',
  };

  const story = await repoCreateStory({
    storyId,
    profileId: options.profileId,
    title: placeholderTitle,
    status: 'creating',
    config,
    bible: emptyBible,
    outline: [],
    targetNodeCount,
    activeNodeId: '',
  });

  console.log('[StoryEngine] Story initialized', { storyId, profileId: options.profileId, status: 'creating' });

  return { story };
}

export async function generateAdultStoryContent(storyId: string, options: CreateAdultStoryOptions): Promise<CreateStoryResult> {
  const story = await getStoryById(storyId);
  if (!story) throw new Error('Story not found');
  if (story.status !== 'creating') throw new Error('Story is not in creating state');

  const targetNodeCount = story.targetNodeCount;
  const config = story.config;

  try {
    console.log('[StoryEngine] Generating outline', { storyId, profileId: options.profileId, targetNodeCount });

    const outlineSystemPrompt = buildOutlineSystemPrompt(config, targetNodeCount);
    const outlineUserContent = buildOutlineUserContent(options, config);

    const outlineResponse = await invokeBedrockJSON<OutlineGenerationResponse>(
      ADULT_STORY_MODEL_ID,
      outlineSystemPrompt,
      outlineUserContent,
      storyId,
      options.profileId
    );

    if (!validateOutlineResponse(outlineResponse)) {
      console.error('[StoryEngine] Invalid outline response', { storyId });
      throw new Error('AI outline response did not match expected schema');
    }

    const outline: OutlineChapter[] = outlineResponse.outline.slice(0, targetNodeCount);
    while (outline.length < targetNodeCount) {
      outline.push({
        chapterIndex: outline.length,
        title: `Chapter ${outline.length + 1}`,
        description: 'Continue the story.',
      });
    }
    outline.forEach((ch, i) => { ch.chapterIndex = i; });

    const title = options.title?.trim() || outlineResponse.suggestedTitle || `${config.genre.charAt(0).toUpperCase() + config.genre.slice(1)} Story`;

    console.log('[StoryEngine] Outline generated', { storyId, chapterCount: outline.length, title });

    await updateStory(storyId, { title, outline });

    const rootNodeId = randomUUID();
    const rootSystemPrompt = buildRootChapterSystemPrompt(config, outline, targetNodeCount);
    const rootUserContent = buildRootChapterUserContent(options, config);

    const rootResponse = await invokeBedrockJSON<RootChapterGenerationResponse>(
      ADULT_STORY_MODEL_ID,
      rootSystemPrompt,
      rootUserContent,
      storyId,
      options.profileId
    );

    if (!validateRootChapterResponse(rootResponse)) {
      console.error('[StoryEngine] Invalid root chapter response', { storyId });
      throw new Error('AI chapter response did not match expected schema');
    }

    const choices = buildChoices(rootResponse.choices);
    if (choices.length < 2) {
      throw new Error('AI did not generate enough choices');
    }

    const bible: StoryBible = {
      storySummaryShort: rootResponse.storySummaryShort,
      charactersSummary: rootResponse.charactersSummary,
      settingSummary: rootResponse.settingSummary,
      conflictSummary: rootResponse.conflictSummary,
      themeNotes: rootResponse.themeNotes,
    };

    const rootNode = await createStoryNode({
      storyId,
      nodeId: rootNodeId,
      parentNodeId: null,
      choiceLabelFromParent: null,
      chapterIndex: 0,
      depth: 0,
      text: rootResponse.chapterText,
      choices,
      localSummary: rootResponse.localSummary,
      isEnding: false,
    });

    const updatedStory = await updateStory(storyId, {
      status: 'in_progress',
      activeNodeId: rootNodeId,
      bible,
      generationError: null,
    });

    console.log('[StoryEngine] Story content generated', { storyId, profileId: options.profileId, genre: config.genre, targetNodeCount });

    return { story: updatedStory!, rootNode };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[StoryEngine] Story generation failed', { storyId, error: errorMessage });
    
    await updateStory(storyId, {
      status: 'failed',
      generationError: errorMessage,
    });
    
    throw error;
  }
}

export async function createAdultStory(options: CreateAdultStoryOptions): Promise<CreateStoryResult> {
  const { story } = await initAdultStory(options);
  return generateAdultStoryContent(story.storyId, options);
}

export interface InitContinueResult {
  story: Story;
}

export async function initContinueStory(options: ContinueAdultStoryOptions): Promise<InitContinueResult> {
  const story = await getStoryById(options.storyId);
  if (!story) throw new Error('Story not found');
  if (story.profileId !== options.profileId) throw new Error('Story does not belong to this profile');
  if (story.status === 'completed') throw new Error('Story is already completed');
  if (story.status === 'generating_chapter') throw new Error('Chapter generation already in progress');
  if (story.isArchived) throw new Error('Story is archived and cannot be continued');

  const currentNode = await getStoryNode(options.storyId, story.activeNodeId);
  if (!currentNode) throw new Error('Current node not found');

  const chosenChoice = currentNode.choices.find((c) => c.choiceId === options.choiceId);
  if (!chosenChoice) throw new Error('Invalid choice ID');

  const updatedStory = await updateStory(options.storyId, {
    status: 'generating_chapter',
    pendingChoiceId: options.choiceId,
    generationError: null,
  });

  console.log('[StoryEngine] Continue initialized', { storyId: options.storyId, choiceId: options.choiceId });

  return { story: updatedStory! };
}

export async function generateNextChapter(storyId: string, profileId: string, userHint?: string | null): Promise<ContinueStoryResult> {
  const story = await getStoryById(storyId);
  if (!story) throw new Error('Story not found');
  if (story.status !== 'generating_chapter') throw new Error('Story is not in generating_chapter state');
  if (!story.pendingChoiceId) throw new Error('No pending choice ID');

  const currentNode = await getStoryNode(storyId, story.activeNodeId);
  if (!currentNode) throw new Error('Current node not found');

  const chosenChoice = currentNode.choices.find((c) => c.choiceId === story.pendingChoiceId);
  if (!chosenChoice) throw new Error('Invalid pending choice ID');

  try {
    const pathToNode = await getPathToNode(storyId, story.activeNodeId);
    const newChapterIndex = currentNode.chapterIndex + 1;
    const newNodeDepth = currentNode.depth + 1;
    const isForceEnding = newChapterIndex >= story.targetNodeCount - 1;
    const stage = getStoryStage(story.config.targetLength, newChapterIndex);

    const systemPrompt = buildContinuationSystemPrompt(
      story.config,
      story.bible,
      story.outline,
      newChapterIndex,
      story.targetNodeCount,
      stage,
      isForceEnding
    );
    const userContent = buildContinuationUserContent(pathToNode, chosenChoice.label, userHint);

    const aiResponse = await invokeBedrockJSON<ChapterGenerationResponse>(
      ADULT_STORY_MODEL_ID,
      systemPrompt,
      userContent,
      storyId,
      profileId
    );

    if (!validateChapterResponse(aiResponse)) {
      console.error('[StoryEngine] Invalid chapter response', { storyId });
      throw new Error('AI response did not match expected schema');
    }

    const isEnding = isForceEnding || aiResponse.isEnding || stage === 'resolution';
    const choices = isEnding ? [] : buildChoices(aiResponse.choices);

    if (!isEnding && choices.length < 2) {
      throw new Error('AI did not generate enough choices for non-ending chapter');
    }

    const newNodeId = randomUUID();
    const newNode = await createStoryNode({
      storyId,
      nodeId: newNodeId,
      parentNodeId: currentNode.nodeId,
      choiceLabelFromParent: chosenChoice.label,
      chapterIndex: newChapterIndex,
      depth: newNodeDepth,
      text: aiResponse.chapterText,
      choices,
      localSummary: aiResponse.localSummary,
      isEnding,
    });

    const updatePayload: Parameters<typeof updateStory>[1] = {
      activeNodeId: newNodeId,
      status: isEnding ? 'completed' : 'in_progress',
      pendingChoiceId: null,
      generationError: null,
      bible: {
        storySummaryShort: aiResponse.updatedStorySummaryShort,
        charactersSummary: aiResponse.updatedCharactersSummary,
        settingSummary: aiResponse.updatedSettingSummary,
        conflictSummary: aiResponse.updatedConflictSummary,
        themeNotes: aiResponse.updatedThemeNotes,
      },
    };

    if (isEnding) {
      updatePayload.completedAt = new Date().toISOString();
    }

    const updatedStory = await updateStory(storyId, updatePayload);
    if (!updatedStory) throw new Error('Failed to update story');

    console.log('[StoryEngine] Chapter generated', { 
      storyId, 
      newNodeId, 
      chapterIndex: newChapterIndex,
      depth: newNodeDepth, 
      stage, 
      isEnding 
    });

    if (isEnding) {
      try {
        await archiveCompletedStory(updatedStory);
      } catch (archiveError) {
        console.error('[StoryEngine] Failed to archive completed story', {
          storyId,
          error: archiveError instanceof Error ? archiveError.message : 'Unknown error',
        });
      }
    }

    return { story: updatedStory, newNode };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[StoryEngine] Chapter generation failed', { storyId, error: errorMessage });
    
    await updateStory(storyId, {
      status: 'in_progress',
      pendingChoiceId: null,
      generationError: errorMessage,
    });
    
    throw error;
  }
}

export async function continueAdultStory(options: ContinueAdultStoryOptions): Promise<ContinueStoryResult> {
  await initContinueStory(options);
  return generateNextChapter(options.storyId, options.profileId, options.userHint);
}
