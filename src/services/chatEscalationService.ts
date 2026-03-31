/**
 * chatEscalationService.ts
 *
 * Calculates session escalation tier for the chat advisor.
 * Tier drives tone, directness, and hook sharpness — not content.
 *
 * Tier 1 — OBSERVATIONAL: early engagement, first pass at a topic
 * Tier 2 — DIRECT: recurring theme, returning user, mid-depth session
 * Tier 3 — CONFRONTING: looping pattern, avoidance reflected in real time
 *
 * All computation is deterministic — no AI call, no latency.
 */

import type { ChatMessage } from './aiService'
import type { MemorySnapshot } from './memoryService'
import type { LifecycleState } from './lifecycleEngine'

export type EscalationTier = 1 | 2 | 3

export interface EscalationSignals {
  sessionMessageCount: number         // total turns in current session (user + assistant)
  crossDomainResonanceCount: number   // themes present in BOTH behavioral and emotional memory
  inSessionLooping: boolean           // same theme recurring across 3+ user messages this session
  lifecycleState: LifecycleState
}

// Common words that appear in any conversation — excluded from looping detection
const STOPWORDS = new Set([
  'that', 'this', 'with', 'have', 'from', 'they', 'will', 'been', 'more',
  'when', 'what', 'your', 'just', 'into', 'some', 'about', 'also', 'like',
  'really', 'think', 'know', 'feel', 'want', 'need', 'always', 'never',
  'every', 'dont', 'cant', 'dont', 'there', 'their', 'then', 'than',
  'even', 'much', 'very', 'because', 'which', 'over', 'again', 'same',
  'keep', 'kept', 'still', 'going', 'doing', 'trying', 'being',
])

/**
 * Detects whether the user is looping on the same theme in the current session.
 * Looks for the same meaningful word (4+ chars, non-stopword) appearing
 * in 3 or more distinct user messages.
 */
export function detectInSessionLooping(history: ChatMessage[]): boolean {
  const userMessages = history
    .filter(m => m.role === 'user')
    .map(m => m.content.toLowerCase().replace(/[^a-z\s]/g, ''))

  if (userMessages.length < 3) return false

  // Map each word to how many distinct messages it appears in
  const wordMessageCount = new Map<string, number>()
  for (const msg of userMessages) {
    const msgWords = msg.split(/\s+/).filter(w => w.length >= 4 && !STOPWORDS.has(w))
    // Dedupe within this message before counting
    const seen = new Set<string>()
    for (const word of msgWords) {
      if (!seen.has(word)) {
        seen.add(word)
        wordMessageCount.set(word, (wordMessageCount.get(word) ?? 0) + 1)
      }
    }
  }

  // Looping = any single meaningful word in 3+ user messages
  return Array.from(wordMessageCount.values()).some(count => count >= 3)
}

/**
 * Counts cross-domain resonance: themes present in both behavioral and emotional memory.
 * These are the highest unresolved signals — enacted AND felt simultaneously.
 */
export function countCrossDomainResonance(snapshot: MemorySnapshot): number {
  const behavioralKeys = new Set(snapshot.behavioral.map(m => m.key))
  return snapshot.emotional.filter(m => behavioralKeys.has(m.key)).length
}

/**
 * Calculates the escalation tier for the current chat turn.
 *
 * Scoring:
 *   +1 — session depth ≥ 6 turns (mid-session, enough signal to go deeper)
 *   +1 — session depth ≥ 14 turns (deep session, sustained engagement)
 *   +1 — cross-domain resonance exists (same theme in behavioral + emotional memory)
 *   +1 — in-session looping detected (same word/theme in 3+ user messages)
 *   +1 — lifecycle is paid_inactive or at_risk_churn (returning with unresolved material)
 *
 * Tier mapping:
 *   score 0   → Tier 1 (observational)
 *   score 1–2 → Tier 2 (direct)
 *   score 3+  → Tier 3 (confronting)
 */
export function calculateEscalationTier(signals: EscalationSignals): EscalationTier {
  let score = 0

  if (signals.sessionMessageCount >= 6)  score += 1
  if (signals.sessionMessageCount >= 14) score += 1
  if (signals.crossDomainResonanceCount > 0) score += 1
  if (signals.inSessionLooping) score += 1
  if (
    signals.lifecycleState === 'paid_inactive' ||
    signals.lifecycleState === 'at_risk_churn'
  ) score += 1

  if (score === 0) return 1
  if (score <= 2) return 2
  return 3
}

/**
 * Builds the escalation guidance section injected into the advisor system prompt.
 * This adjusts tone, directness, and hook usage — not the content or identity context.
 */
export function buildEscalationGuidance(tier: EscalationTier): string {
  if (tier === 1) {
    return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESCALATION LEVEL: OBSERVATIONAL (Tier 1)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This person is in early engagement. Let insight land without pressure.

TONE: Curious, precise, neutral — observing, not directing
APPROACH: Name what you see without pushing for recognition. Surface the pattern; let them decide how much to engage with it.
HOOKS: Use where genuine (~50% of responses). Prefer gentler structures: deeper layer, adjacent angle. Avoid the confronting structures (real question redirect, continuity echo) unless they arise very naturally.`
  }

  if (tier === 2) {
    return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESCALATION LEVEL: DIRECT (Tier 2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This person has engaged deeply this session, or has returned to a theme that has come up before. Name the pattern clearly.

TONE: Direct, confident, precise — like an advisor who has been watching this pattern long enough to name it plainly
APPROACH: Don't wait for them to connect the dots. Help them see the connection. If this theme has appeared before, you can note it naturally: "This is the same pull, from a different angle."
HOOKS: Use with confidence (~65% of responses). All five structures are available. Pattern inversion and real question redirect are particularly effective here.`
  }

  // Tier 3
  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESCALATION LEVEL: CONFRONTING (Tier 3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This person is looping — returning to the same theme, asking the same question in different forms, or circling without landing. The loop is the pattern. Name it.

TONE: Direct, unflinching, precise — never harsh or accusatory. Recognition, not criticism.
APPROACH: You may name what is happening in real time: "This is the same movement again." or "We keep arriving at this point from different directions." Reflect the behavior as it occurs. The meta-level observation is available: not just what the pattern is, but that the avoidance of it is happening right now in this conversation.
HOOKS: Use frequently (~80% of responses). Prefer: real question redirect ("The real question isn't X — it's Y") and unresolved surface ("What hasn't been named is..."). These are the most effective structures for breaking a loop.
IMPORTANT: Never shame. The frame is: "I'm naming this because it's useful, not because it's a problem." Precision without judgment.`
}
