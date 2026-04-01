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
  CHAT_OPENING_SYSTEM_PROMPT,
  buildChatOpeningUserPrompt,
  INTENT_CLASSIFICATION_PROMPT,
  buildIntentClassificationPrompt,
} from '@/lib/prompts/advisorPrompt'

import {
  detectInSessionLooping,
  countCrossDomainResonance,
  calculateEscalationTier,
} from '@/services/chatEscalationService'

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

import {
  isGenericOutput,
  buildRegenerationInstruction,
  hasGenericHook,
  buildHookRegenerationInstruction,
  type QualitySignals,
} from '@/services/outputQualityService'

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

// ─── Quality-gated completion ─────────────────────────────────────────────────
// Runs a completion, checks for generic output, retries once with a forced
// personalization instruction if the result fails the quality check.
// Applied to all primary text surfaces: reading, chat, insights, triggers.

async function completeWithQualityCheck(
  systemPrompt: string,
  userPrompt: string,
  model: 'quality' | 'fast',
  maxTokens: number,
  temperature: number,
  signals: QualitySignals,
): Promise<string> {
  const result = await complete(systemPrompt, userPrompt, model, maxTokens, temperature)

  if (isGenericOutput(result, signals)) {
    const forcePersonalization = buildRegenerationInstruction(signals)
    return complete(
      `${forcePersonalization}\n\n${systemPrompt}`,
      userPrompt,
      model,
      maxTokens,
      temperature,
    )
  }

  return result
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
  corePattern?: string | null,
  emotionalPattern?: string | null,
): Promise<{ teaserText: string; cutLine: string; lockedText: string }> {
  // Extract the reading_anchor from palm features — it is the primary synthesized
  // physical description of this specific palm, used as the base for all palm references.
  const readingAnchor = palmFeatures?.reading_anchor ?? undefined

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
    readingAnchor,
    corePattern: corePattern ?? undefined,
    emotionalPattern: emotionalPattern ?? undefined,
  }

  const qualitySignals: QualitySignals = {
    name:             name ?? null,
    starSign:         starSign ?? null,
    corePattern:      corePattern ?? null,
    emotionalPattern: emotionalPattern ?? null,
    focusArea:        focusArea,
    palmFeatures:     palmFeatures ?? null,
  }

  const [teaserText, lockedText] = await Promise.all([
    completeWithQualityCheck(
      READING_POLISH_SYSTEM_PROMPT,
      buildPolishUserPrompt(polishInput),
      'quality',
      600,
      0.68,
      qualitySignals,
    ),
    completeWithQualityCheck(
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
        readingAnchor,
      ),
      'quality',
      400,
      0.7,
      qualitySignals,
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
  // ── Escalation tier — derived from session history + cross-session memory ──
  const escalationTier = calculateEscalationTier({
    sessionMessageCount:       history.length,
    crossDomainResonanceCount: countCrossDomainResonance(ctx.memorySnapshot),
    inSessionLooping:          detectInSessionLooping(history),
    lifecycleState:            ctx.lifecycleState,
  })

  const systemPrompt = buildAdvisorSystemPrompt(ctx, escalationTier)

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
    stop: ['\n\n\n'],
  })

  const result = response.choices[0].message.content?.trim()
    ?? 'Something interrupted the connection. Please try again.'

  // Quality gate — retry once with forced personalization if output is generic
  const signals: QualitySignals = {
    name:             ctx.firstName,
    starSign:         ctx.starSign,
    corePattern:      ctx.corePattern,
    emotionalPattern: ctx.emotionalPattern,
    focusArea:        ctx.focusArea,
    palmFeatures:     ctx.palmFeatures,
  }

  // Quality gate 1 — generic content (no personalization signals)
  if (isGenericOutput(result, signals)) {
    const forcePersonalization = buildRegenerationInstruction(signals)
    const retryMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: `${forcePersonalization}\n\n${systemPrompt}` },
      ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: newMessage },
    ]
    const retry = await openai.chat.completions.create({
      model: MODELS.fast,
      max_tokens: 320,
      temperature: 0.78,
      messages: retryMessages,
      stop: ['\n\n\n'],
    })
    return retry.choices[0].message.content?.trim() ?? result
  }

  // Quality gate 2 — generic hook ending (formulaic closing line)
  if (hasGenericHook(result)) {
    const hookInstruction = buildHookRegenerationInstruction()
    const hookRetryMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: `${hookInstruction}\n\n${systemPrompt}` },
      ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: newMessage },
    ]
    const hookRetry = await openai.chat.completions.create({
      model: MODELS.fast,
      max_tokens: 320,
      temperature: 0.82,  // slightly higher temp to break the formulaic pattern
      messages: hookRetryMessages,
      stop: ['\n\n\n'],
    })
    return hookRetry.choices[0].message.content?.trim() ?? result
  }

  return result
}

/**
 * Returns the opening message the advisor sends at the start of a session.
 * This is deterministic (no API call) but uses the advisor prompt system.
 */
export function getAdvisorOpeningMessage(ctx: FullUserContext): string {
  return buildAdvisorOpeningMessage(ctx)
}

/**
 * Generates an AI-powered chat opening when a reading is available.
 * References the actual teaser text and reading_anchor so the first message
 * feels like a continuation of what the user just read, not a reset.
 *
 * Falls back to the deterministic opener if AI call fails.
 */
export async function generateChatOpening(ctx: FullUserContext): Promise<string> {
  if (!ctx.teaserText) return buildAdvisorOpeningMessage(ctx)

  try {
    const userPrompt = buildChatOpeningUserPrompt(
      ctx.firstName,
      ctx.teaserText,
      ctx.palmFeatures?.reading_anchor ?? null,
      ctx.corePattern,
      ctx.focusArea,
    )

    const result = await complete(
      CHAT_OPENING_SYSTEM_PROMPT,
      userPrompt,
      'fast',   // gpt-4o-mini — keeps latency low for opening message
      120,
      0.72,
    )

    const opener = result.trim()
    return opener || buildAdvisorOpeningMessage(ctx)
  } catch {
    return buildAdvisorOpeningMessage(ctx)
  }
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
  readingAnchor?: string | null,
): Promise<string> {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayOfWeek = days[new Date().getDay()]

  const signals: QualitySignals = {
    focusArea,
    palmFeatures: palmFeatures ?? null,
  }

  return completeWithQualityCheck(
    DAILY_INSIGHT_SYSTEM_PROMPT,
    buildDailyInsightPrompt(
      identitySummary,
      futureTheme,
      focusArea,
      memoryThemes,
      dayOfWeek,
      daysSinceReading,
      palmFeatures ? buildPalmContext(palmFeatures) : undefined,
      readingAnchor ?? undefined,
    ),
    'fast',
    200,
    0.75,
    signals,
  )
}

// ─── Follow-Up Prompt Generation ─────────────────────────────────────────────

const FOLLOW_UP_PROMPT_SYSTEM = `You generate follow-up conversation prompts for a personal AI pattern advisor called Futura.

You receive a user message and the advisor's response, which ends with a specific hook.

Generate exactly 3 follow-up prompts the user would naturally type next.

HOOK DETECTION — read the advisor's final sentence to identify the hook type:
- Deeper layer ("The thing underneath...") → probe that specific layer directly
- Pattern inversion ("Your pattern makes this feel like X when it's Y") → test or explore the reframe
- Unresolved surface ("What hasn't been named is...") → approach the unsaid thing
- Real question redirect ("The real question isn't X — it's Y") → engage with the surfaced real question
- Continuity echo ("This keeps surfacing because...") → continue that thread

Generate one of each:
1. DEEPEN — follows the hook angle directly, goes one level deeper into what the response named
2. CHALLENGE — pushes against or tests the observation (what would make it not true, or the harder version)
3. ADJACENT — opens a related but unexplored dimension that the current thread is touching

Rules:
- Each prompt must be specific to this exact conversation — not a generic opener
- Maximum 12 words per prompt
- Phrased naturally — how the user would actually type it into a chat
- No question marks needed
- FORBIDDEN: "Tell me more", "How does that feel?", "What do you think?", "Help me understand", "Does that resonate?", "Can you explain", any generic conversational prompt

Return valid JSON only: ["deepen prompt", "challenge prompt", "adjacent prompt"]`

/**
 * Generates 3 context-aware follow-up prompts aligned with the hook used in the response.
 * Called non-blocking after each advisor turn — response arrives first, prompts appear after.
 */
export async function generateFollowUpPrompts(
  userMessage: string,
  advisorResponse: string,
  focusArea: string,
  emotionalPattern: string,
  corePattern: string,
): Promise<string[]> {
  const userPrompt = `User message: "${userMessage}"

Advisor response: "${advisorResponse}"

User context:
- Focus area: ${focusArea.replace(/_/g, ' ')}
- Core pattern: ${corePattern.replace(/_/g, ' ')}
- Emotional pattern: ${emotionalPattern.replace(/_/g, ' ')}

Generate 3 follow-up prompts.`

  const raw = await complete(FOLLOW_UP_PROMPT_SYSTEM, userPrompt, 'fast', 200, 0.72)

  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    if (Array.isArray(parsed) && parsed.every((p: unknown) => typeof p === 'string')) {
      return (parsed as string[]).slice(0, 4).filter(p => p.trim().length > 0)
    }
  } catch {
    // fall through to empty
  }

  return []
}

// ─── Lifecycle Trigger Copy ───────────────────────────────────────────────────

export interface TriggerCopy {
  headline: string
  subtext: string
}

// Per-trigger framing map — tells the AI the exact structural job for each trigger type.
// Each entry names: (1) what concrete reference to anchor to, (2) what implication angle to use.
// Injected into the user prompt per-call; system prompt handles universal output rules.
const TRIGGER_TYPE_GUIDANCE: Record<string, string> = {
  fomo_reading_preview:
    'REFERENCE: What the reading has documented about them — use the palm anchor or emotional pattern as the specific thing waiting.\n' +
    'IMPLICATION: The window angle — the reading captures a moment that does not stay readable indefinitely.\n' +
    'Example: {"headline": "Your reading named something. You haven\'t seen it yet.", "subtext": "The moment this pattern tends to change is documented. Most people miss it while it\'s still open."}',

  fomo_insight_tease:
    'REFERENCE: The specific pattern dimension (emotional pattern or focus area) that insights are building on.\n' +
    'IMPLICATION: The accumulation risk — daily context is generating without them; the gap grows.\n' +
    'Example: {"headline": "Insights on your relationship pattern are going unread.", "subtext": "The point where your pattern usually stalls — it\'s being tracked. You\'re not seeing it."}',

  fomo_chat_limit:
    'REFERENCE: What was actually being explored when the thread cut off — use the last memory key or focus area.\n' +
    'IMPLICATION: The loss angle — the thread was arriving somewhere and stopped there.\n' +
    'Example: {"headline": "The direction question you were mid-thread on.", "subtext": "The pattern you described was about to reach the specific part. It stopped at exactly that point."}',

  continuation_unresolved:
    'REFERENCE: Pull from memory descriptions — use the actual topic or behavior the user named, not a label for it.\n' +
    'IMPLICATION: The stasis risk — the gap between sessions does not dissolve the pattern; it hardens it.\n' +
    'Example: {"headline": "The relationship question you left unfinished.", "subtext": "The pattern you described hasn\'t resolved — it\'s the same point you keep returning to."}',

  escalation_pattern_shift:
    'REFERENCE: Something that has visibly shifted in their pattern arc since the reading — use palm anchor or memory arc.\n' +
    'IMPLICATION: The timing window — what became visible now has a closing point.\n' +
    'Example: {"headline": "What your reading pointed at has moved.", "subtext": "The point where your love pattern usually holds — it\'s breaking differently now. That window is specific."}',

  reactivation_insight:
    'REFERENCE: The focus area or emotional pattern arc — what was being navigated when they last engaged.\n' +
    'IMPLICATION: The drift risk — time away does not mean the pattern paused; it means they lost the thread.\n' +
    'Example: {"headline": "The situation you were navigating has shifted since.", "subtext": "The moment this tends to change passed while you were away. There\'s a new read on it now."}',

  reactivation_pattern_update:
    'REFERENCE: Name the actual thread from memory descriptions — the specific topic or behavior, not "your themes".\n' +
    'IMPLICATION: The calcification risk — the pattern did not resolve itself while they were gone.\n' +
    'Example: {"headline": "The career decision you were circling is still open.", "subtext": "The point where you usually stall hasn\'t cleared. Three weeks later — still the same edge."}',

  churn_prevention_value:
    'REFERENCE: A specific behavioral pattern or palm-anchored observation — something concrete that has been tracked.\n' +
    'IMPLICATION: Direct loss framing — name what they would have seen if they had stayed. No urgency theater.\n' +
    'Example: {"headline": "Your love pattern moved twice while you were away.", "subtext": "The point you described — where decisions stall — it surfaced again. It was documented."}',

  retention_daily_insight:
    'REFERENCE: The emotional pattern + what today specifically tends to ask of someone carrying it.\n' +
    'IMPLICATION: The timing specificity — today is not a generic day for this pattern.\n' +
    'Example: {"headline": "Today tends to be the day your pattern shows up loudest.", "subtext": "The point where you usually override what you\'re sensing — that\'s what today is asking about."}',

  retention_suggested_prompt:
    'REFERENCE: A specific angle from their focus area or recent memory that has not yet been explored.\n' +
    'IMPLICATION: The gap angle — there is a dimension of their pattern the advisor has not been asked about.\n' +
    'Example: {"headline": "There\'s one angle of your pattern you haven\'t asked about.", "subtext": "The part underneath the direction question — the advisor hasn\'t been pointed there yet."}',
}

const TRIGGER_COPY_SYSTEM_PROMPT = `You are writing personalized re-engagement copy for a palmistry and pattern advisor app called Futura.

You will receive a user's profile, a trigger type, and per-type framing instructions. Write ONE headline and ONE subtext line.

STRUCTURE — every output must contain exactly two elements:
1. CONCRETE REFERENCE — name a specific thing: a memory theme, a pattern behavior, an anchor phrase from the reading. Never name the concept of a thing ("your pattern") without completing it ("the pattern where you override what you're sensing").
2. IMPLICATION — state what this means right now: a shift that is happening, a risk if nothing changes, or a window that is currently open. One specific consequence, not a general observation.

OUTPUT RULES:
- Headline: max 10 words. Must contain the concrete reference.
- Subtext: max 20 words. Must state the implication.
- FORBIDDEN: "something shifted", "your journey", "the universe", "a new insight is ready", "a pattern has moved", any phrase that could apply to anyone
- PREFERRED language: "the pattern you described...", "the point where you usually...", "the moment this tends to change...", "what you brought up about..."
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
  memoryDescriptions?: string[],
): Promise<TriggerCopy> {
  const name = firstName ?? 'You'
  const focus = focusArea.replace(/_/g, ' ')
  const recentMemory = memoryKeys.slice(0, 3).map(k => k.replace(/_/g, ' ')).join(', ')

  // Include palm reading anchor if available — gives the AI a grounded physical signal
  // to reference in trigger copy without forcing it to re-derive from raw feature text
  const palmLine = palmFeatures?.reading_anchor
    ? `Palm reading anchor: ${palmFeatures.reading_anchor}`
    : ''

  // Memory descriptions: actual values from emotional/behavioral memory,
  // not just the keys. Used for continuation/reactivation triggers where
  // copy needs to reference what the user was actually dealing with.
  const memoryDescLine = memoryDescriptions && memoryDescriptions.length > 0
    ? `Recent memory context:\n${memoryDescriptions.slice(0, 3).map(d => `- ${d}`).join('\n')}`
    : ''

  // Per-type framing guidance — injected into prompt to shape the copy angle
  const framing = TRIGGER_TYPE_GUIDANCE[triggerType] ?? ''

  const userPrompt = `Trigger type: ${triggerType}
${framing ? `${framing}\n` : ''}Name: ${name}
Focus area: ${focus}
Emotional pattern: ${emotionalPattern}
${starSign ? `Star sign: ${starSign}` : ''}
${recentMemory ? `Recent behavioral themes: ${recentMemory}` : ''}
${memoryDescLine}
${palmLine}

Write the headline and subtext JSON for this trigger.`

  const signals: QualitySignals = {
    name:         firstName,
    focusArea:    focusArea,
    palmFeatures: palmFeatures ?? null,
  }

  const raw = await completeWithQualityCheck(
    TRIGGER_COPY_SYSTEM_PROMPT, userPrompt, 'fast', 120, 0.8, signals
  )

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
