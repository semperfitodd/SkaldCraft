import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { randomUUID } from 'crypto';
import * as yaml from 'js-yaml';
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
  OutlineGenerationResponse,
  RootChapterGenerationResponse,
  ChapterGenerationResponse,
  ReadingPurpose,
} from './models';
import {
  createStory as repoCreateStory,
  createStoryNode,
  getStoryById,
  getStoryNode,
  updateStory,
  getPathToNode,
} from './repository';
import {
  ELEMENTARY_MAX_GRADE,
  ELEMENTARY_MAX_AGE,
  ELEMENTARY_GRL_LEVELS,
} from './constants';

const CHILD_STORY_HAIKU_MODEL_ID = process.env.CHILD_STORY_HAIKU_MODEL_ID!;
const CHILD_STORY_SONNET_MODEL_ID = process.env.CHILD_STORY_SONNET_MODEL_ID!;
const STORY_ARCHIVE_BUCKET = process.env.STORY_ARCHIVE_BUCKET!;
const STORY_ARCHIVE_PREFIX = process.env.STORY_ARCHIVE_PREFIX || 'stories/';

export const LENGTH_TO_NODE_COUNT: Record<StoryLength, number> = {
  short: 5,
  medium: 25,
  long: 50,
};

export type StoryStage = 'setup' | 'rising_action' | 'complication' | 'climax' | 'resolution';

const BEAT_MAPS: Record<StoryLength, StoryStage[]> = {
  short: ['setup', 'rising_action', 'complication', 'climax', 'resolution'],
  medium: [
    'setup', 'setup', 'setup', 'setup', 'setup',
    'rising_action', 'rising_action', 'rising_action', 'rising_action', 'rising_action',
    'rising_action', 'rising_action', 'rising_action',
    'complication', 'complication', 'complication', 'complication', 'complication',
    'climax', 'climax', 'climax', 'climax',
    'resolution', 'resolution', 'resolution',
  ],
  long: [
    'setup', 'setup', 'setup', 'setup', 'setup', 'setup', 'setup', 'setup', 'setup', 'setup',
    'rising_action', 'rising_action', 'rising_action', 'rising_action', 'rising_action',
    'rising_action', 'rising_action', 'rising_action', 'rising_action', 'rising_action',
    'rising_action', 'rising_action', 'rising_action', 'rising_action', 'rising_action',
    'complication', 'complication', 'complication', 'complication', 'complication',
    'complication', 'complication', 'complication', 'complication', 'complication',
    'climax', 'climax', 'climax', 'climax', 'climax',
    'climax', 'climax', 'climax', 'climax', 'climax',
    'resolution', 'resolution', 'resolution', 'resolution', 'resolution',
  ],
};

const STAGE_DESCRIPTIONS: Record<StoryStage, string> = {
  setup: 'Introduce the main characters, establish the setting, and present the initial situation. Hook the reader with an engaging opening.',
  rising_action: 'Build the story naturally. Develop character relationships and move the plot forward with meaningful events.',
  complication: 'Introduce a challenge or obstacle. This should feel like a turning point appropriate for the age group.',
  climax: 'The exciting moment of the story. Characters face their challenge and make important decisions.',
  resolution: 'Resolve the story positively. Provide a satisfying, age-appropriate conclusion.',
};

// Child story types
export interface CreateChildStoryOptions {
  profileId: string;
  userEmail: string;
  readingPurpose: ReadingPurpose;
  readingLevel?: string | null;
  gradeLevel?: number | null;
  age?: number | null;
  title?: string | null;
  genre?: StoryGenre | null;
  tone?: StoryTone | null;
  pov?: StoryPOV | null;
  targetLength: StoryLength;
  customPrompt?: string | null;
}

export interface ContinueChildStoryOptions {
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

export interface InitStoryResult {
  story: Story;
}

export interface InitContinueResult {
  story: Story;
}

const bedrockClient = new BedrockRuntimeClient({});

export function getStoryStage(targetLength: StoryLength, nodeIndex: number): StoryStage {
  const beats = BEAT_MAPS[targetLength];
  return nodeIndex >= beats.length ? 'resolution' : beats[nodeIndex];
}

export function getChildModelId(options: CreateChildStoryOptions): string {
  if (options.gradeLevel !== null && options.gradeLevel !== undefined) {
    return options.gradeLevel <= ELEMENTARY_MAX_GRADE ? CHILD_STORY_HAIKU_MODEL_ID : CHILD_STORY_SONNET_MODEL_ID;
  }
  
  if (options.age !== null && options.age !== undefined) {
    return options.age <= ELEMENTARY_MAX_AGE ? CHILD_STORY_HAIKU_MODEL_ID : CHILD_STORY_SONNET_MODEL_ID;
  }
  
  if (options.readingLevel) {
    const level = options.readingLevel.toUpperCase();
    return ELEMENTARY_GRL_LEVELS.includes(level as any) ? CHILD_STORY_HAIKU_MODEL_ID : CHILD_STORY_SONNET_MODEL_ID;
  }
  
  return CHILD_STORY_HAIKU_MODEL_ID;
}

function getChildAgeBand(options: CreateChildStoryOptions): string {
  if (options.gradeLevel !== null && options.gradeLevel !== undefined) {
    if (options.gradeLevel < 0) return 'prek';
    if (options.gradeLevel <= 2) return 'early-elementary';
    if (options.gradeLevel <= 5) return 'upper-elementary';
    if (options.gradeLevel <= 8) return 'middle-school';
    return 'teen';
  }
  
  if (options.age !== null && options.age !== undefined) {
    if (options.age < 5) return 'prek';
    if (options.age <= 7) return 'early-elementary';
    if (options.age <= 11) return 'upper-elementary';
    if (options.age <= 14) return 'middle-school';
    return 'teen';
  }
  
  // Default to early-elementary for safety
  return 'early-elementary';
}

function getChildContentGuidelines(ageBand: string, readingPurpose: ReadingPurpose): string {
  const baseGuidelines = `CHILD-SAFE CONTENT GUIDELINES (STRICTLY ENFORCED):
- NO explicit content of any kind
- NO graphic violence, gore, or disturbing imagery
- NO scary/nightmare content (especially for bedtime stories)
- NO self-harm, abuse, or bullying themes
- NO hate speech, slurs, or discriminatory content
- NO mature romantic or intimate content
- Keep all content age-appropriate and positive
- Focus on friendship, growth, problem-solving, and positive values`;

  if (readingPurpose === 'bedtime') {
    return baseGuidelines + `

BEDTIME STORY REQUIREMENTS:
- Calm, soothing tone throughout
- LOW conflict and tension - no scary or stressful situations
- Gentle, reassuring narrative
- Positive, peaceful endings
- Avoid chase scenes, danger, or high-stakes drama
- Focus on comfort, safety, and gentle adventure`;
  }

  if (readingPurpose === 'school') {
    return baseGuidelines + `

SCHOOL/EDUCATIONAL FOCUS:
- Clear, structured narrative
- Educational themes woven naturally into story
- Positive role models and good decision-making
- Age-appropriate vocabulary with context clues
- Opportunities for learning and growth`;
  }

  // 'fun' purpose
  return baseGuidelines + `

FUN/ENTERTAINMENT FOCUS:
- Playful, engaging tone
- Age-appropriate humor and adventure
- Exciting but not scary situations
- Positive messages about friendship and courage`;
}

function getChildVocabularyGuidance(ageBand: string): string {
  switch (ageBand) {
    case 'prek':
      return `VOCABULARY (Pre-K):
- Very simple words (3-5 letters mostly)
- Short sentences (5-8 words)
- Repetition for emphasis
- Concrete, familiar concepts only`;
    
    case 'early-elementary':
      return `VOCABULARY (Early Elementary K-2):
- Simple, common words
- Short to medium sentences (6-10 words)
- Introduce new words with context
- Concrete concepts with some abstract ideas`;
    
    case 'upper-elementary':
      return `VOCABULARY (Upper Elementary 3-5):
- Age-appropriate vocabulary
- Medium sentences (8-15 words)
- Can include some challenging words with context
- Mix of concrete and abstract concepts`;
    
    case 'middle-school':
      return `VOCABULARY (Middle School):
- More sophisticated vocabulary
- Varied sentence structure
- Complex ideas and themes
- Can include figurative language`;
    
    case 'teen':
      return `VOCABULARY (Teen):
- Advanced vocabulary appropriate for young adults
- Complex sentence structures
- Nuanced themes and ideas
- Literary devices and deeper meaning`;
    
    default:
      return `VOCABULARY (Elementary):
- Age-appropriate, clear language
- Varied but accessible sentence structure
- Context clues for new words`;
  }
}

function getChildChapterLength(ageBand: string): string {
  switch (ageBand) {
    case 'prek':
      return '200-400 words';
    case 'early-elementary':
      return '300-500 words';
    case 'upper-elementary':
      return '400-700 words';
    case 'middle-school':
      return '500-800 words';
    case 'teen':
      return '600-900 words';
    default:
      return '400-600 words';
  }
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
    message.includes('503') ||
    message.includes('502') ||
    message.includes('timeout') ||
    message.includes('econnreset') ||
    name.includes('throttling') ||
    name.includes('serviceunavailable')
  );
}

const MAX_TOKENS = 2800;

async function invokeBedrockYAML<T>(
  modelId: string,
  systemPrompt: string,
  userContent: string,
  storyId: string,
  profileId: string,
  maxRetries = 2
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const backoffMs = attempt > 0 ? Math.min(500 + Math.random() * 1000, 1500) : 0;
    if (backoffMs > 0) {
      console.log('[ChildStoryEngine] Retrying after backoff', { storyId, profileId, attempt, backoffMs: Math.round(backoffMs) });
      await sleep(backoffMs);
    }

    console.log('[ChildStoryEngine] Invoking Bedrock', { modelId, storyId, profileId, attempt });

    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: MAX_TOKENS,
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
      console.error('[ChildStoryEngine] Bedrock invocation failed', {
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

    console.log('[ChildStoryEngine] Bedrock response', {
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

    let yamlStr = textContent.trim();
    
    // Strip markdown code fences if present
    if (yamlStr.startsWith('```yaml') || yamlStr.startsWith('```yml')) {
      yamlStr = yamlStr.slice(yamlStr.indexOf('\n') + 1);
    } else if (yamlStr.startsWith('```')) {
      yamlStr = yamlStr.slice(3);
    }
    if (yamlStr.endsWith('```')) {
      yamlStr = yamlStr.slice(0, -3);
    }
    yamlStr = yamlStr.trim();
    
    // Handle case where model adds preamble text before YAML
    const yamlPatterns = [/^[a-zA-Z_]+:/, /^-\s+/];
    let yamlStart = 0;
    for (const pattern of yamlPatterns) {
      const match = yamlStr.match(pattern);
      if (match && match.index !== undefined) {
        yamlStart = match.index;
        break;
      }
    }
    
    if (yamlStart > 0) {
      console.log('[ChildStoryEngine] Stripping preamble text before YAML', { 
        storyId, 
        preambleLength: yamlStart,
        preamble: yamlStr.substring(0, Math.min(yamlStart, 100))
      });
      yamlStr = yamlStr.substring(yamlStart);
    }

    try {
      const parsed = yaml.load(yamlStr);
      return parsed as T;
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error';
      
      console.error('[ChildStoryEngine] YAML parse failed', { 
        storyId, 
        profileId, 
        attempt,
        parseError: errorMessage,
        textLength: yamlStr.length,
        textPreview: yamlStr.substring(0, 300),
        textEnd: yamlStr.substring(Math.max(0, yamlStr.length - 100)),
      });
      lastError = new Error(`Failed to parse AI response as YAML: ${errorMessage}`);
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

function buildChildOutlineSystemPrompt(
  config: StoryConfig,
  targetNodeCount: number,
  ageBand: string,
  readingPurpose: ReadingPurpose
): string {
  const chapterLength = getChildChapterLength(ageBand);
  
  return `You are an expert children's story planner creating a chapter-by-chapter outline for an interactive fiction story for children.

STORY CONFIGURATION:
- Age Band: ${ageBand}
- Reading Purpose: ${readingPurpose}
- Genre: ${config.genre}
- Tone: ${config.tone}
- Point of View: ${config.pov}
- Total Chapters: ${targetNodeCount}
- Chapter Length: ${chapterLength}

${getChildContentGuidelines(ageBand, readingPurpose)}

${getChildVocabularyGuidance(ageBand)}

OUTLINE REQUIREMENTS:
- Create exactly ${targetNodeCount} chapters
- Each chapter should be age-appropriate and engaging for children
- Follow story structure appropriate for young readers: beginning → middle → satisfying end
- Chapters should build naturally with clear progression
- Each chapter description should be 1-2 sentences
- Titles should be simple, clear, and exciting for kids
- Ensure positive messages and appropriate content throughout

OUTPUT FORMAT - CRITICAL:
Respond with ONLY valid YAML. NO explanatory text, preamble, or commentary.
Use the pipe | character for multiline strings (no escaping needed).

Example format:

outline:
  - chapterIndex: 1
    title: "Chapter 1: The Beginning"
    description: "What happens in this chapter."
  - chapterIndex: 2
    title: "Chapter 2: The Adventure Continues"
    description: "What happens in this chapter."
suggestedTitle: "A fun, age-appropriate title for the story"

CRITICAL:
- Start immediately with YAML (no preamble)
- Include exactly ${targetNodeCount} chapters
- Use proper YAML syntax with 2-space indentation
- Use quotes around titles and descriptions`;
}

function buildChildOutlineUserContent(options: CreateChildStoryOptions, config: StoryConfig): string {
  const premise = options.customPrompt
    ? `Custom request: "${options.customPrompt}"`
    : `Genre: ${config.genre}, Tone: ${config.tone}${options.title ? `, Working title: "${options.title}"` : ''}`;

  return `Create a detailed chapter outline for this children's story:

PREMISE:
${premise}

READING PURPOSE: ${options.readingPurpose}

Generate an age-appropriate outline with clear chapter titles and story beats. The outline should create an engaging narrative that's perfect for children, with positive themes and a satisfying conclusion.`;
}

function buildChildRootChapterSystemPrompt(
  config: StoryConfig,
  outline: OutlineChapter[],
  targetNodeCount: number,
  ageBand: string,
  readingPurpose: ReadingPurpose
): string {
  const chapter = outline[0];
  const chapterLength = getChildChapterLength(ageBand);
  
  return `You are an expert children's story author writing Chapter 1 of a new interactive story for young readers.

STORY CONFIGURATION:
- Age Band: ${ageBand}
- Reading Purpose: ${readingPurpose}
- Genre: ${config.genre}
- Tone: ${config.tone}
- Point of View: ${config.pov}
- Total Chapters: ${targetNodeCount}
- Chapter Length: ${chapterLength}

CHAPTER ASSIGNMENT:
- Chapter: ${chapter.title}
- Purpose: ${chapter.description}
- Story Stage: BEGINNING

FULL STORY OUTLINE (for context):
${outline.map(ch => `${ch.title}: ${ch.description}`).join('\n')}

${getChildContentGuidelines(ageBand, readingPurpose)}

${getChildVocabularyGuidance(ageBand)}

CHAPTER REQUIREMENTS:
- Write ${chapterLength} of engaging, age-appropriate prose
- This is a FULL CHAPTER for children - make it complete and satisfying
- Use simple, clear language appropriate for the age band
- Create a warm, inviting opening that draws young readers in
- Introduce characters and setting in a way children can easily understand
- End at a fun decision point with 2-3 simple, clear choices
- POV: ${config.pov}. ${getPovInstructions(config.pov)}

WRITING GUIDELINES FOR CHILDREN:
- Use vivid but simple descriptions
- Include sensory details kids can relate to
- Keep sentences clear and not too long
- Use dialogue to make characters come alive
- Make sure the story feels safe and positive
- Each choice should be easy for kids to understand

OUTPUT FORMAT - CRITICAL:
Respond with ONLY valid YAML. NO explanatory text, preamble, or commentary.
Use the pipe | character for multiline text (no escaping needed).

Example format:

chapterText: |
  The full chapter prose (${chapterLength}).
  
  Use natural paragraph breaks.
  
  "Quotes work naturally without escaping."
choices:
  - label: "Choice 1 (simple, 5-10 words)"
  - label: "Choice 2 (simple, 5-10 words)"
localSummary: "1-2 sentence chapter summary"
storySummaryShort: "2-3 sentence overall story summary"
charactersSummary: "Key characters introduced (names, roles, traits)"
settingSummary: "Setting and world details established"
conflictSummary: "Central problem or challenge introduced"
themeNotes: "Positive themes being explored"

CRITICAL: 
- Start immediately with YAML (no preamble)
- Write a FULL chapter of ${chapterLength}
- Use proper YAML syntax with 2-space indentation
- Use pipe | for chapterText multiline content`;
}

function buildChildRootChapterUserContent(options: CreateChildStoryOptions, config: StoryConfig): string {
  const premise = options.customPrompt
    ? `Custom request: "${options.customPrompt}"`
    : `Genre: ${config.genre}, Tone: ${config.tone}`;

  return `Write Chapter 1 of this interactive children's story.

PREMISE:
${premise}

READING PURPOSE: ${options.readingPurpose}

Create an engaging opening chapter that's perfect for young readers. Make it age-appropriate, fun, and end with clear choices kids can easily understand.`;
}

function buildChildContinuationSystemPrompt(
  config: StoryConfig,
  bible: StoryBible,
  outline: OutlineChapter[],
  currentChapterIndex: number,
  targetNodeCount: number,
  stage: StoryStage,
  isForceEnding: boolean,
  ageBand: string,
  readingPurpose: ReadingPurpose
): string {
  const chapter = outline[currentChapterIndex] || outline[outline.length - 1];
  const chaptersRemaining = targetNodeCount - currentChapterIndex;
  const chapterLength = getChildChapterLength(ageBand);

  let endingInstructions = '';
  if (isForceEnding || stage === 'resolution') {
    endingInstructions = `
ENDING INSTRUCTIONS:
This is the final chapter. You MUST:
- Resolve the story in a satisfying, age-appropriate way
- Provide a happy or positive ending
- Make sure all young readers feel good about the conclusion
- Set "isEnding" to true
- Provide an EMPTY choices array: "choices": []`;
  } else if (chaptersRemaining <= 2) {
    endingInstructions = `
APPROACHING END:
Only ${chaptersRemaining} chapters remain. Begin steering toward a positive resolution.`;
  }

  const choicesInstruction = isForceEnding || stage === 'resolution'
    ? '- This is the ENDING - no choices needed'
    : '- End with 2-3 simple, clear choices for young readers';

  return `You are an expert children's story author continuing an interactive story for young readers.

STORY CONFIGURATION:
- Age Band: ${ageBand}
- Reading Purpose: ${readingPurpose}
- Genre: ${config.genre}
- Tone: ${config.tone}
- Point of View: ${config.pov}
- Total Chapters: ${targetNodeCount}
- Chapter Length: ${chapterLength}

STORY BIBLE (established facts):
Summary: ${bible.storySummaryShort}
Characters: ${bible.charactersSummary}
Setting: ${bible.settingSummary}
Challenge: ${bible.conflictSummary}
Themes: ${bible.themeNotes}

CHAPTER ASSIGNMENT:
- Chapter: ${chapter.title}
- Purpose: ${chapter.description}
- Story Stage: ${stage.toUpperCase().replace('_', ' ')}
- Progress: Chapter ${currentChapterIndex + 1} of ${targetNodeCount}

STORY OUTLINE (relevant context):
${(() => {
  const start = Math.max(0, currentChapterIndex - 2);
  const end = Math.min(outline.length, currentChapterIndex + 3);
  return outline
    .slice(start, end)
    .map(ch => `${ch.title}: ${ch.description}`)
    .join('\n');
})()}
${endingInstructions}

${getChildContentGuidelines(ageBand, readingPurpose)}

${getChildVocabularyGuidance(ageBand)}

CRITICAL RULES:
1. NEVER contradict what happened before in the story
2. NEVER repeat previous chapters - always move FORWARD
3. Keep characters consistent with how they've been portrayed
4. Cover THIS chapter's purpose as outlined
5. Respect POV: ${config.pov}. ${getPovInstructions(config.pov)}
6. Keep everything age-appropriate and positive

CHAPTER REQUIREMENTS:
- Write ${chapterLength} of engaging, age-appropriate prose
- This is a FULL CHAPTER for children - develop it thoroughly
- Continue naturally from the reader's choice
- Show what happens because of the choice they made
${choicesInstruction}

OUTPUT FORMAT - CRITICAL:
Respond with ONLY valid YAML. NO explanatory text, preamble, or commentary.
Use the pipe | character for multiline text (no escaping needed).

Example format:

chapterText: |
  The full chapter prose (${chapterLength}).
  
  Use natural paragraph breaks.
  
  "Quotes work naturally without escaping."
choices:
  - label: "Choice 1"
  - label: "Choice 2"
localSummary: "1-2 sentence chapter summary"
updatedStorySummaryShort: "Updated 2-3 sentence story summary"
updatedCharactersSummary: "Updated character notes"
updatedSettingSummary: "Updated setting notes"
updatedConflictSummary: "Updated challenge/problem status"
updatedThemeNotes: "Updated theme notes"
isEnding: ${isForceEnding || stage === 'resolution' ? 'true' : 'false'}

${isForceEnding || stage === 'resolution' ? 'For this ending, set isEnding: true and use empty choices: []' : 'Set isEnding: false unless this is a natural conclusion.'}

CRITICAL:
- Start immediately with YAML (no preamble)
- Write a FULL chapter of ${chapterLength}
- Use proper YAML syntax with 2-space indentation
- Use pipe | for chapterText multiline content`;
}

const MAX_CONTEXT_CHARS = 900;

function buildChildContinuationUserContent(
  recentNodes: StoryNode[],
  chosenLabel: string,
  userHint?: string | null
): string {
  const contextNodes = recentNodes.slice(-2);
  const recentContext = contextNodes
    .map((n, i) => `[Previous Chapter ${i + 1}]:\n${n.text.substring(0, MAX_CONTEXT_CHARS)}${n.text.length > MAX_CONTEXT_CHARS ? '...' : ''}`)
    .join('\n\n');

  let content = `Continue the children's story based on the reader's choice.

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

Write the next full chapter, picking up right after the choice. Show what happens because of this decision and keep the story moving forward in an age-appropriate way.`;

  return content;
}

function buildChoices(labels: Array<{ label: string }>): StoryChoice[] {
  return labels.map((c) => ({
    choiceId: randomUUID(),
    label: c.label,
    targetNodeId: null,
  }));
}

// Story engine functions
export async function initChildStory(options: CreateChildStoryOptions): Promise<InitStoryResult> {
  if (options.customPrompt && options.customPrompt.length > 500) {
    throw new Error('Custom prompt must be 500 characters or less');
  }

  const targetNodeCount = LENGTH_TO_NODE_COUNT[options.targetLength];
  const ageBand = getChildAgeBand(options);

  const config: StoryConfig = {
    ageBand: ageBand as any,
    genre: options.genre || 'adventure',
    tone: options.tone || 'light',
    pov: options.pov || 'third-person-limited',
    targetLength: options.targetLength,
    explicitContentAllowed: false, // Always false for children
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

  console.log('[ChildStoryEngine] Story initialized', { 
    storyId, 
    profileId: options.profileId, 
    status: 'creating',
    ageBand,
    readingPurpose: options.readingPurpose,
  });

  return { story };
}

export async function generateChildStoryContent(
  storyId: string, 
  options: CreateChildStoryOptions
): Promise<CreateStoryResult> {
  const story = await getStoryById(storyId);
  if (!story) throw new Error('Story not found');
  if (story.status !== 'creating') throw new Error('Story is not in creating state');

  const targetNodeCount = story.targetNodeCount;
  const config = story.config;
  const ageBand = getChildAgeBand(options);
  const childModelId = getChildModelId(options);

  try {
    console.log('[ChildStoryEngine] Generating outline', { 
      storyId, 
      profileId: options.profileId, 
      targetNodeCount,
      ageBand,
      readingPurpose: options.readingPurpose,
      modelId: childModelId,
    });

    const outlineSystemPrompt = buildChildOutlineSystemPrompt(
      config, 
      targetNodeCount, 
      ageBand, 
      options.readingPurpose
    );
    const outlineUserContent = buildChildOutlineUserContent(options, config);

    const t0Outline = Date.now();
    const outlineResponse = await invokeBedrockYAML<OutlineGenerationResponse>(
      childModelId,
      outlineSystemPrompt,
      outlineUserContent,
      storyId,
      options.profileId
    );
    console.log('[ChildStoryEngine] Bedrock outline latency (ms)', { storyId, latencyMs: Date.now() - t0Outline });

    if (!validateOutlineResponse(outlineResponse)) {
      console.error('[ChildStoryEngine] Invalid outline response', { storyId });
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

    console.log('[ChildStoryEngine] Outline generated', { storyId, chapterCount: outline.length, title });

    await updateStory(storyId, { title, outline });

    const rootNodeId = randomUUID();
    const rootSystemPrompt = buildChildRootChapterSystemPrompt(
      config, 
      outline, 
      targetNodeCount, 
      ageBand, 
      options.readingPurpose
    );
    const rootUserContent = buildChildRootChapterUserContent(options, config);

    const t0Root = Date.now();
    const rootResponse = await invokeBedrockYAML<RootChapterGenerationResponse>(
      childModelId,
      rootSystemPrompt,
      rootUserContent,
      storyId,
      options.profileId
    );
    console.log('[ChildStoryEngine] Bedrock root chapter latency (ms)', { storyId, latencyMs: Date.now() - t0Root });

    if (!validateRootChapterResponse(rootResponse)) {
      console.error('[ChildStoryEngine] Invalid root chapter response', { storyId });
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

    // Parallelize root node creation and story update
    const [rootNode, updatedStory] = await Promise.all([
      createStoryNode({
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
      }),
      updateStory(storyId, {
        status: 'in_progress',
        activeNodeId: rootNodeId,
        bible,
        generationError: null,
      })
    ]);

    console.log('[ChildStoryEngine] Story content generated', { 
      storyId, 
      profileId: options.profileId, 
      genre: config.genre, 
      targetNodeCount,
      ageBand,
      readingPurpose: options.readingPurpose,
    });

    return { story: updatedStory!, rootNode };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ChildStoryEngine] Story generation failed', { storyId, error: errorMessage });
    
    await updateStory(storyId, {
      status: 'failed',
      generationError: errorMessage,
    });
    
    throw error;
  }
}

export async function createChildStory(options: CreateChildStoryOptions): Promise<CreateStoryResult> {
  const { story } = await initChildStory(options);
  return generateChildStoryContent(story.storyId, options);
}

export async function initContinueChildStory(options: ContinueChildStoryOptions): Promise<InitContinueResult> {
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

  console.log('[ChildStoryEngine] Continue initialized', { storyId: options.storyId, choiceId: options.choiceId });

  return { story: updatedStory! };
}

export async function generateNextChildChapter(
  storyId: string, 
  profileId: string, 
  options: CreateChildStoryOptions,
  userHint?: string | null
): Promise<ContinueStoryResult> {
  // Parallelize initial data fetching
  const [story, currentNode] = await Promise.all([
    getStoryById(storyId),
    (async () => {
      const s = await getStoryById(storyId);
      if (!s) return null;
      return getStoryNode(storyId, s.activeNodeId);
    })()
  ]);

  if (!story) throw new Error('Story not found');
  if (story.status !== 'generating_chapter') throw new Error('Story is not in generating_chapter state');
  if (!story.pendingChoiceId) throw new Error('No pending choice ID');
  if (!currentNode) throw new Error('Current node not found');

  const chosenChoice = currentNode.choices.find((c) => c.choiceId === story.pendingChoiceId);
  if (!chosenChoice) throw new Error('Invalid pending choice ID');

  const ageBand = getChildAgeBand(options);
  const childModelId = getChildModelId(options);

  try {
    const pathToNode = await getPathToNode(storyId, story.activeNodeId);
    const newChapterIndex = currentNode.chapterIndex + 1;
    const newNodeDepth = currentNode.depth + 1;
    const isForceEnding = newChapterIndex >= story.targetNodeCount - 1;
    const stage = getStoryStage(story.config.targetLength, newChapterIndex);

    const systemPrompt = buildChildContinuationSystemPrompt(
      story.config,
      story.bible,
      story.outline,
      newChapterIndex,
      story.targetNodeCount,
      stage,
      isForceEnding,
      ageBand,
      options.readingPurpose
    );
    const userContent = buildChildContinuationUserContent(pathToNode, chosenChoice.label, userHint);

    const t0Chapter = Date.now();
    const aiResponse = await invokeBedrockYAML<ChapterGenerationResponse>(
      childModelId,
      systemPrompt,
      userContent,
      storyId,
      profileId
    );
    console.log('[ChildStoryEngine] Bedrock chapter latency (ms)', { storyId, latencyMs: Date.now() - t0Chapter });

    if (!validateChapterResponse(aiResponse)) {
      console.error('[ChildStoryEngine] Invalid chapter response', { storyId });
      throw new Error('AI response did not match expected schema');
    }

    const isEnding = isForceEnding || aiResponse.isEnding || stage === 'resolution';
    const choices = isEnding ? [] : buildChoices(aiResponse.choices);

    if (!isEnding && choices.length < 2) {
      throw new Error('AI did not generate enough choices for non-ending chapter');
    }

    const newNodeId = randomUUID();
    
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

    // Parallelize node creation and story update
    const [newNode, updatedStory] = await Promise.all([
      createStoryNode({
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
      }),
      updateStory(storyId, updatePayload)
    ]);

    if (!updatedStory) throw new Error('Failed to update story');

    console.log('[ChildStoryEngine] Chapter generated', { 
      storyId, 
      newNodeId, 
      chapterIndex: newChapterIndex,
      depth: newNodeDepth, 
      stage, 
      isEnding,
      ageBand,
      readingPurpose: options.readingPurpose,
    });

    return { story: updatedStory, newNode };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ChildStoryEngine] Chapter generation failed', { storyId, error: errorMessage });
    
    await updateStory(storyId, {
      status: 'in_progress',
      pendingChoiceId: null,
      generationError: errorMessage,
    });
    
    throw error;
  }
}

export async function continueChildStory(
  options: ContinueChildStoryOptions,
  createOptions: CreateChildStoryOptions
): Promise<ContinueStoryResult> {
  await initContinueChildStory(options);
  return generateNextChildChapter(options.storyId, options.profileId, createOptions, options.userHint);
}
