/**
 * aiService.ts
 *
 * The complete AI service layer for Futura.
 * All OpenAI calls live here — one import path, one place to tune models,
 * swap providers, or add streaming without touching business logic.
 *
 * Services:
 * - generateReading()       — full reading pipeline (blocks + polish)
 * - polishTeaser()          — polish teaser section only
 * - polishLocked()          — polish locked/deeper section only
 * - generateIdentitySummary() — AI-generated identity summary (vs template)
 * - sendAdvisorMessage()    — chat advisor turn
 * - extractMemoryThemes()   — post-session memory extraction
 * - generateDailyInsight()  — Phase 2 daily insight generation
 * - classifyMessageIntent() — high-intent paywall classification
 */

import OpenAI from 'openai'
import {
  READING_SYSTEM_PROMPT,
  READING_POLISH_SYSTEM_PROMPT,
  LOCKED_POLISH_SYSTEM_PROMPT,
  buildReadingUserPrompt,
  buildPolishUserPrompt,
  buildLockedPolishUserPrompt,
  type ReadingPromptInput,
  type PolishPromptInput,
} from '@/lib/prompts/readingPrompt'

import {
  buildAdvisorSystemPrompt,
  buildAdvisorOpeningMessage,
  INTENT_CLASSIFICATION_PROMPT,
  buildIntentClassificationPrompt,
} from '@/lib/prompts/advisorPrompt'

import type { FullUserContext } from '@/services/profileOrchestrator'
import type { PalmFeatures } from '@/services/palmAnalysisService'
import { buildPalmContext } from '@/services/palmAnalysisService'

import {
  IDENTITY_SUMMARY_SYSTEM_PROMPT,
  buildIdentitySummaryPrompt,
  MEMORY_EXTRACTION_SYSTEM_PROMPT,
  buildMemoryExtractionPrompt,
  DAILY_INSIGHT_SYSTEM_PROMPT,
  buildDailyInsightPrompt,
  type ReadingStyle,
  buildStyledReadingSystemPrompt,
} from '@/lib/prompts/polishPrompt'

import type {
  FocusArea,
  CurrentState,
  PersonalityTrait,
} from '@/services/profileNormalizationService'

// ─── Client ───────────────────────────────────────────────────────────────────

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'placeholder',
})

// ─── Model config ─────────────────────────────────────────────────────────────

const MODELS = {
  quality: 'gpt-4o',           // Reading generation, polish — quality matters
  fast: 'gpt-4o-mini',         // Chat turns, intent classification — cost & speed
} as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function complete(
  systemPrompt: string,
  userPrompt: string,
  model: 'quality' | 'fast',
  maxTokens: number,
  temperature = 0.72
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: MODELS[model],
    max_tokens: maxTokens,
    temperature,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
  })

  return response.choices[0].message.content?.trim() ?? ''
}

// ─── Reading Services ─────────────────────────────────────────────────────────

/**
 * Polish teaser and locked text in parallel.
 * This is the main pipeline called by readingCompositionService.
 */
export async function polishReading(
  teaserRaw: string,
  lockedRaw: string,
  cutLine: string,
  identitySummary: string,
  focusArea: FocusArea,
  futureTheme: string,
  palmFeatures?: PalmFeatures | null,
  name?: string | null,
  beliefSystem?: string | null,
  starSign?: string | null,
): Promise<{ teaserText: string; cutLine: string; lockedText: string }> {
  const polishInput: PolishPromptInput = {
    teaserRaw,
    cutLine,
    lockedRaw,
    identitySummary,
    focusArea,
    name: name ?? undefined,
    beliefSystem: beliefSystem ?? undefined,
    starSign: starSign ?? undefined,
    palmContext: palmFeatures ? buildPalmContext(palmFeatures) : undefined,
  }

  const [teaserText, lockedText] = await Promise.all([
    complete(
      READING_POLISH_SYSTEM_PROMPT,
      buildPolishUserPrompt(polishInput),
      'quality',
      600,
      0.68
    ),
    complete(
      LOCKED_POLISH_SYSTEM_PROMPT,
      buildLockedPolishUserPrompt(
        lockedRaw,
        identitySummary,
        focusArea,
        futureTheme,
        palmFeatures ? buildPalmContext(palmFeatures) : undefined,
        name ?? undefined,
        beliefSystem ?? undefined,
        starSign ?? undefined,
      ),
      'quality',
      400,
      0.7
    ),
  ])

  return {
    teaserText: teaserText || teaserRaw,
    cutLine,
    lockedText: lockedText || lockedRaw,
  }
}

/**
 * Full AI reading generation — used when you want the AI to write the entire
 * reading from the profile rather than using the block system.
 * Keep this as an alternative path for experimentation (A/B test vs blocks).
 */
export async function generateFullReading(
  input: ReadingPromptInput,
  style: ReadingStyle = 'clinical'
): Promise<{ teaserText: string; cutLine: string; lockedText: string }> {
  const systemPrompt = style === 'clinical'
    ? READING_SYSTEM_PROMPT
    : buildStyledReadingSystemPrompt(style)

  const raw = await complete(
    systemPrompt,
    buildReadingUserPrompt(input),
    'quality',
    800,
    0.75
  )

  // Split on double newline — first 4 paras are teaser, rest is locked
  const paragraphs = raw.split('\n\n').filter(Boolean)
  const teaserParagraphs = paragraphs.slice(0, 4)
  const lockedParagraphs = paragraphs.slice(4)

  const cutLine = `How you respond to this moment will shape what unfolds over the next few months...`

  return {
    teaserText: teaserParagraphs.join('\n\n'),
    cutLine,
    lockedText: lockedParagraphs.join('\n\n') || (paragraphs[paragraphs.length - 1] ?? ''),
  }
}

// ─── Identity Services ────────────────────────────────────────────────────────

/**
 * AI-generated identity summary — more unique than template version.
 * Use for premium users or when you want higher variation.
 */
export async function generateIdentitySummary(
  personalityTrait: PersonalityTrait,
  currentState: CurrentState,
  focusArea: FocusArea,
  ageBand: string
): Promise<string> {
  return complete(
    IDENTITY_SUMMARY_SYSTEM_PROMPT,
    buildIdentitySummaryPrompt(personalityTrait, currentState, focusArea, ageBand),
    'fast',
    180,
    0.65
  )
}

// ─── Chat Advisor Services ────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Main advisor chat turn.
 * Injects full identity context into system prompt every time.
 * History is passed in and managed by caller.
 */
export async function sendAdvisorMessage(
  ctx: FullUserContext,
  history: ChatMessage[],
  newMessage: string,
): Promise<string> {
  const systemPrompt = buildAdvisorSystemPrompt(ctx)

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: newMessage },
  ]

  const response = await openai.chat.completions.create({
    model: MODELS.fast,
    max_tokens: 320,
    temperature: 0.78,
    messages,
    // Prevent runaway responses
    stop: ['\n\n\n'],
  })

  return response.choices[0].message.content?.trim()
    ?? 'Something interrupted the connection. Please try again.'
}

/**
 * Returns the opening message the advisor sends at the start of a session.
 * This is deterministic (no API call) but uses the advisor prompt system.
 */
export function getAdvisorOpeningMessage(ctx: FullUserContext): string {
  return buildAdvisorOpeningMessage(ctx)
}

// ─── Memory Services ──────────────────────────────────────────────────────────

export interface MemoryTheme {
  key_theme: string
  memory_type?: 'emotional' | 'behavioral' | 'event'
  description: string
}

/**
 * Extracts behavioral themes from a completed chat session.
 * Run this after a session ends (e.g. after 5+ messages, or on session close).
 * Results are stored in user_insights_memory for future personalization.
 */
export async function extractMemoryThemes(
  chatHistory: ChatMessage[],
  identitySummary: string,
  existingThemes: string[]
): Promise<MemoryTheme[]> {
  if (chatHistory.length < 4) return [] // Not enough signal yet

  const raw = await complete(
    MEMORY_EXTRACTION_SYSTEM_PROMPT,
    buildMemoryExtractionPrompt(chatHistory, identitySummary, existingThemes),
    'fast',
    300,
    0.4 // Low temperature for consistent JSON output
  )

  try {
    // Strip any markdown fences if present
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    if (!Array.isArray(parsed)) return []
    const VALID_TYPES = new Set(['emotional', 'behavioral', 'event'])
    return parsed
      .filter(
        (t: unknown) =>
          t &&
          typeof t === 'object' &&
          'key_theme' in (t as object) &&
          'description' in (t as object)
      )
      .map((t: unknown) => {
        const theme = t as Record<string, unknown>
        return {
          key_theme: theme.key_theme as string,
          memory_type: VALID_TYPES.has(theme.memory_type as string)
            ? (theme.memory_type as MemoryTheme['memory_type'])
            : 'behavioral',
          description: theme.description as string,
        }
      }) as MemoryTheme[]
  } catch {
    return []
  }
}

// ─── Intent Classification ────────────────────────────────────────────────────

/**
 * Server-side intent classification — more accurate than regex.
 * Use this for high-stakes paywall decisions.
 * Regex version in paywallTriggerService is the fast path.
 */
export async function classifyMessageIntent(
  message: string,
  focusArea: FocusArea
): Promise<'high_intent' | 'standard' | 'off_topic'> {
  const raw = await complete(
    INTENT_CLASSIFICATION_PROMPT,
    buildIntentClassificationPrompt(message, focusArea),
    'fast',
    10,
    0.0 // Deterministic
  )

  const result = raw.trim().toLowerCase()
  if (result === 'high_intent') return 'high_intent'
  if (result === 'off_topic') return 'off_topic'
  return 'standard'
}

// ─── Daily Insight (Phase 2) ──────────────────────────────────────────────────

/**
 * Generates a daily insight for a user.
 * Call this from a cron job or on-demand when user opens the app.
 * Architecture is in place — wire up the UI in Phase 2.
 */
export async function generateDailyInsight(
  identitySummary: string,
  futureTheme: string,
  focusArea: FocusArea,
  memoryThemes: MemoryTheme[],
  daysSinceReading: number,
  palmFeatures?: PalmFeatures | null,
): Promise<string> {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayOfWeek = days[new Date().getDay()]

  return complete(
    DAILY_INSIGHT_SYSTEM_PROMPT,
    buildDailyInsightPrompt(
      identitySummary,
      futureTheme,
      focusArea,
      memoryThemes,
      dayOfWeek,
      daysSinceReading,
      palmFeatures ? buildPalmContext(palmFeatures) : undefined,
    ),
    'fast',
    200,
    0.75
  )
}

// ─── Lifecycle Trigger Copy ───────────────────────────────────────────────────

export interface TriggerCopy {
  headline: string
  subtext: string
}

const TRIGGER_COPY_SYSTEM_PROMPT = `You are writing personalized re-engagement copy for a palmistry and pattern advisor app called Futura.

You will receive a user's profile and a trigger type. Write ONE headline and ONE subtext line.

Rules:
- Headline: max 10 words. Specific. References something real about this person.
- Subtext: max 20 words. Explains what they're missing or what has shifted. Specific to their focus and emotional pattern.
- Never generic. Never "your journey". Never "the universe". Never motivational.
- Never "Something shifted" alone — always complete it: "Something shifted in your [specific pattern]"
- Tone: direct, personal, slightly urgent. Like a trusted advisor leaving a note.
- Return valid JSON only: {"headline": "...", "subtext": "..."}`

export async function generateTriggerCopy(
  triggerType: string,
  firstName: string | null,
  focusArea: string,
  emotionalPattern: string,
  memoryKeys: string[],
  starSign: string | null,
  palmFeatures?: PalmFeatures | null,
): Promise<TriggerCopy> {
  const name = firstName ?? 'You'
  const focus = focusArea.replace(/_/g, ' ')
  const recentMemory = memoryKeys.slice(0, 3).map(k => k.replace(/_/g, ' ')).join(', ')

  // Include palm reading anchor if available — gives the AI a grounded physical signal
  // to reference in trigger copy without forcing it to re-derive from raw feature text
  const palmLine = palmFeatures?.reading_anchor
    ? `Palm reading anchor: ${palmFeatures.reading_anchor}`
    : ''

  const userPrompt = `Trigger type: ${triggerType}
Name: ${name}
Focus area: ${focus}
Emotional pattern: ${emotionalPattern}
${starSign ? `Star sign: ${starSign}` : ''}
${recentMemory ? `Recent behavioral themes: ${recentMemory}` : ''}
${palmLine}

Write the headline and subtext JSON for this trigger.`

  const raw = await complete(TRIGGER_COPY_SYSTEM_PROMPT, userPrompt, 'fast', 120, 0.8)

  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean) as TriggerCopy
    if (parsed.headline && parsed.subtext) return parsed
  } catch {
    // fall through to fallback
  }

  // Fallback — still uses user data, just templated
  return {
    headline: `${name}, your ${focus} pattern has moved.`,
    subtext: `A new insight based on your ${emotionalPattern} is ready.`,
  }
}
