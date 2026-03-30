/**
 * outputQualityService.ts
 *
 * Output quality enforcement.
 * Detects AI outputs that are too generic and lack personalization signals.
 * Applied as a one-retry post-processor on all primary AI text surfaces:
 *   - polishReading() — teaser and locked layers
 *   - sendAdvisorMessage() — chat responses
 *   - generateDailyInsight() — daily insights
 *   - generateTriggerCopy() — lifecycle trigger copy
 */

import type { PalmFeatures } from './palmAnalysisService'

export interface QualitySignals {
  name?: string | null
  starSign?: string | null
  corePattern?: string | null
  emotionalPattern?: string | null
  focusArea?: string | null
  palmFeatures?: PalmFeatures | null
}

// Phrases that indicate the model ignored user-specific context entirely
const GENERIC_PHRASES = [
  'trust the journey',
  'trust the process',
  'the universe has',
  'the universe is',
  "you've got this",
  'many people feel',
  'many people experience',
  "it's natural to feel",
  "it's completely normal",
  'exciting times ahead',
  'your true potential',
  'everything happens for a reason',
  'the stars align',
  'you are enough',
  'believe in yourself',
  'follow your heart',
  'stay positive',
  'on your journey',
  'trust yourself',
  'you will find your way',
]

// Palm terms that confirm the model referenced physical palm features
const PALM_TERMS = [
  'heart line',
  'head line',
  'life line',
  'fate line',
  'hand shape',
  'mount of',
  'thumb angle',
  'finger length',
  'line clarity',
  'line depth',
]

/**
 * Returns true if the output text is generic and lacks personalization signals.
 * A generic output either contains forbidden phrases or fails to reference
 * any of the available identity anchors.
 */
export function isGenericOutput(text: string, signals: QualitySignals): boolean {
  const lower = text.toLowerCase()

  // Immediate fail on any forbidden generic phrase
  for (const phrase of GENERIC_PHRASES) {
    if (lower.includes(phrase)) return true
  }

  // If no signals are available, we can't assess personalization — pass it
  const hasAnySignal = !!(
    signals.name ||
    signals.starSign ||
    signals.corePattern ||
    signals.palmFeatures
  )
  if (!hasAnySignal) return false

  // At least one signal must appear in the output
  const hasPersonalization =
    (signals.name ? lower.includes(signals.name.toLowerCase()) : false) ||
    (signals.starSign ? lower.includes(signals.starSign.toLowerCase()) : false) ||
    (signals.corePattern ? lower.includes(signals.corePattern.replace(/_/g, ' ')) : false) ||
    (signals.emotionalPattern ? lower.includes(signals.emotionalPattern.replace(/_/g, ' ')) : false) ||
    (signals.palmFeatures ? PALM_TERMS.some(t => lower.includes(t)) : false)

  return !hasPersonalization
}

/**
 * Builds a regeneration instruction to prepend to the system prompt.
 * Forces the model to reference specific identity anchors on the retry.
 */
export function buildRegenerationInstruction(signals: QualitySignals): string {
  const anchors: string[] = []

  if (signals.name) {
    anchors.push(`the person's name "${signals.name}"`)
  }
  if (signals.starSign) {
    anchors.push(`their ${signals.starSign} star sign`)
  }
  if (signals.corePattern) {
    anchors.push(`their "${signals.corePattern.replace(/_/g, ' ')}" behavioral pattern`)
  }
  if (signals.palmFeatures) {
    const palmDetail = signals.palmFeatures.heart_line.split('—')[0].trim()
    anchors.push(`a specific palm feature (e.g. "${palmDetail}")`)
  }

  return `CRITICAL REGENERATION REQUIRED: The previous response was too generic — it could apply to any person.
This response MUST specifically reference at least one of: ${anchors.join(', ')}.
ABSOLUTELY FORBIDDEN: "trust the journey", "trust the process", "the universe", "many people feel", "you've got this", "your true potential", "believe in yourself", generic affirmations, motivational phrases.
Write only about THIS specific person. Be precise. Be direct. No filler.`
}
