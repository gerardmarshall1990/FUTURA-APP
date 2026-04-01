/**
 * polishPrompt.ts
 *
 * Supplementary prompt templates:
 * - Identity summary generation (used when AI generates the summary rather than template)
 * - Daily insight prompt (Phase 2 placeholder — architecture ready from day 1)
 * - Memory theme extraction (runs after chat sessions to update user_insights_memory)
 * - Reading variation prompt (for A/B testing different reading styles)
 */

import type { FocusArea, CurrentState, PersonalityTrait } from '@/services/profileNormalizationService'

// ─── Identity Summary Generation ─────────────────────────────────────────────
// Alternative to the hardcoded template — generates a more unique summary
// when you want more variation between users with the same input combination.

export const IDENTITY_SUMMARY_SYSTEM_PROMPT = `You are generating a persistent identity summary for a user of Futura, a personal AI advisor.

This summary will be used in every future interaction as the foundation of the user's identity layer.

The summary must:
- Be 2–3 sentences maximum
- Be written in second person ("You tend to...", "Your pattern is...")
- Describe the user's core behavioral pattern, emotional tendency, and current state
- Feel personally accurate and specific — not generic
- Not use spiritual, mystical, or therapist language
- Not be motivational or affirming — be observational and precise

Output only the summary text. Nothing else.`

export function buildIdentitySummaryPrompt(
  personalityTrait: PersonalityTrait,
  currentState: CurrentState,
  focusArea: FocusArea,
  ageBand: string
): string {
  const traitDescriptions: Record<PersonalityTrait, string> = {
    overthink_decisions: 'tends to overthink decisions, delays action until certainty or pressure arrives',
    trust_people_easily: 'extends trust and openness to others quickly, then reflects and recalibrates afterward',
    keep_things_to_myself: 'processes emotional depth privately and reveals it selectively',
  }

  const stateDescriptions: Record<CurrentState, string> = {
    feeling_stuck: 'currently in a phase of feeling held in place — movement is needed but something is holding back',
    turning_point: 'at a genuine turning point where the next decision carries more weight than usual',
    okay_but_uncertain: 'in a stable but uncertain phase — things are okay on the surface, but something underneath is unresolved',
  }

  return `Generate an identity summary for this user.

Personality trait: This person ${traitDescriptions[personalityTrait]}
Current state: They are ${stateDescriptions[currentState]}
Primary focus area: ${focusArea.replace('_', ' ')}
Age band: ${ageBand}

Write their identity summary now.`
}

// ─── Memory Theme Extraction ──────────────────────────────────────────────────
// Runs after a chat session to extract recurring themes for user_insights_memory.
// Called by memoryService after session ends (or after N messages).

export const MEMORY_EXTRACTION_SYSTEM_PROMPT = `You are analyzing a conversation between a user and their personal AI advisor to extract recurring psychological and behavioral themes.

Extract 1–3 key themes from the conversation. Each theme should be:
- A short label (2–5 words, snake_case format)
- A brief description (1 sentence)
- A memory_type classification:
  - "emotional" — feelings, fears, avoidances, emotional states they return to
  - "behavioral" — decision patterns, habits, repeated actions or tendencies
  - "event" — specific life situations or circumstances mentioned

Output as JSON array only. Example:
[
  {"key_theme": "relationship_hesitation", "memory_type": "emotional", "description": "Frequently returns to relationship dynamics and seems to delay acting on what they already sense"},
  {"key_theme": "career_crossroads", "memory_type": "behavioral", "description": "Multiple questions about direction suggest an unresolved career decision being circled"},
  {"key_theme": "job_transition_pending", "memory_type": "event", "description": "Mentioned a pending career move they have not yet committed to"}
]

Output only valid JSON. Nothing else.`

export function buildMemoryExtractionPrompt(
  chatHistory: Array<{ role: string; content: string }>,
  identitySummary: string,
  existingThemes: string[]
): string {
  const conversation = chatHistory
    .map(m => `${m.role === 'user' ? 'User' : 'Advisor'}: ${m.content}`)
    .join('\n')

  return `Analyze this conversation and extract key recurring themes.

USER IDENTITY CONTEXT:
${identitySummary}

EXISTING THEMES ALREADY STORED (do not duplicate these):
${existingThemes.length > 0 ? existingThemes.join(', ') : 'None yet'}

CONVERSATION:
${conversation}

Extract new themes only. Return JSON array.`
}

// ─── Daily Insight Prompt (Phase 2) ──────────────────────────────────────────
// Architecture is ready from day 1. Wire this up in Phase 2 when adding
// the daily insight feed feature.

export const DAILY_INSIGHT_SYSTEM_PROMPT = `You are generating a daily insight for a Futura user.

A daily insight is:
- 2–3 sentences maximum
- Based on the user's persistent identity layer and memory themes
- Specific to what day/week it is in their pattern arc
- Written in second person
- A precise observation about what today might be asking of them given their pattern
- Not a motivational quote. Not a generic reminder. Not a horoscope.

The insight should feel like something a trusted advisor who knows you well would say on a Tuesday morning — grounded, specific, and worth pausing on.

PALM FEATURES (if provided):
- Ground one observation in a specific palm feature — briefly and precisely
- Aim for roughly 1 in 2 insights to include a palm observation — whenever one connects genuinely to the pattern or day
- Use the reading_anchor (the first synthesized description in the PALM ANALYSIS section) as your primary reference — it is the most specific physical summary available
- Use probabilistic language: "tends to...", "often shows up as..."
- Example: "The depth of your heart line tends to make this kind of day harder to move through cleanly — the emotional weight is real, not resistance."
- If what the user has shared recently contrasts with the palm signal: "this can show up differently depending on your current phase"

Output only the insight text. Nothing else.`

export function buildDailyInsightPrompt(
  identitySummary: string,
  futureTheme: string,
  focusArea: FocusArea,
  memoryThemes: Array<{ key_theme: string; description: string }>,
  dayOfWeek: string,
  daysSinceReading: number,
  palmContext?: string,
  readingAnchor?: string,
): string {
  const themeContext = memoryThemes.length > 0
    ? memoryThemes.map(t => `- ${t.key_theme}: ${t.description}`).join('\n')
    : 'No additional themes recorded yet.'

  const readingAnchorSection = readingAnchor
    ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
READING ANCHOR — Primary Palm Synthesis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${readingAnchor}

Ground palm observations in this anchor first. This is the most specific physical summary available for this person.

`
    : ''

  return `Generate a daily insight for this user.

IDENTITY:
${identitySummary}

CURRENT MOVEMENT ARC: ${futureTheme}
FOCUS AREA: ${focusArea.replace('_', ' ')}

BEHAVIORAL THEMES FROM THEIR HISTORY:
${themeContext}

${readingAnchorSection}${palmContext ? `${palmContext}\n` : ''}CONTEXT: It is ${dayOfWeek}. It has been ${daysSinceReading} day(s) since their reading.

Generate one daily insight for today. If palm features are provided, ground one observation in the READING ANCHOR above — that is the primary synthesized physical description of this person's palm. Use it as your primary palm reference. Describe the physical feature briefly, then the behavioral correlation. Probabilistic language only.`
}

// ─── Reading Variation Prompt (A/B Testing) ───────────────────────────────────
// Use this when testing different reading styles/tones.
// Swap READING_STYLE to change the entire voice of generated readings.

export type ReadingStyle = 'clinical' | 'narrative' | 'sparse'

export const READING_STYLE_CONFIGS: Record<ReadingStyle, { label: string; systemAddition: string }> = {
  clinical: {
    label: 'Clinical / precise',
    systemAddition: `Style note: Write in a precise, analytical tone. Short declarative sentences. Clinical observation without emotional hedging. Like a behavioral analyst who respects the subject's intelligence.`,
  },
  narrative: {
    label: 'Narrative / flowing',
    systemAddition: `Style note: Write in a flowing, narrative tone. Slightly longer sentences with more texture. More use of imagery and metaphor — but still grounded, not mystical. Like a thoughtful author describing a character they understand deeply.`,
  },
  sparse: {
    label: 'Sparse / minimal',
    systemAddition: `Style note: Write in an extremely sparse style. Almost uncomfortably direct. Very short sentences. No softening. No transitions. Each paragraph lands hard and moves on. Like a mentor who has no patience for softening truths.`,
  },
}

export function buildStyledReadingSystemPrompt(style: ReadingStyle): string {
  const basePrompt = `You are the writing engine for Futura, a personal AI advisor.
Your job is to generate a personal reading for one specific individual.
Structure: Recognition → Past Validation → Current State → Near-Future Tension.
Language: Second person. Emotional but not sentimental. Never spiritual or mystical.
Output: Plain paragraphs only. No titles. No labels.`

  return `${basePrompt}\n\n${READING_STYLE_CONFIGS[style].systemAddition}`
}
