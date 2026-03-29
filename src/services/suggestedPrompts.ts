/**
 * suggestedPrompts.ts
 *
 * Generates personalized suggested prompts for the chat interface.
 * These are contextual conversation starters based on user identity,
 * memories, current state, and lifecycle position.
 */

import type { FullUserContext } from './profileOrchestrator'
import type { LifecycleState } from './lifecycleEngine'

export interface SuggestedPrompt {
  text: string
  category: 'pattern' | 'timing' | 'relationship' | 'decision' | 'reactivation'
}

// ─── Focus-Based Prompts ─────────────────────────────────────────────────────

const FOCUS_PROMPTS: Record<string, SuggestedPrompt[]> = {
  love: [
    { text: 'What does my palm say about my love life right now?', category: 'pattern' },
    { text: 'Am I holding onto something I should let go of?', category: 'relationship' },
    { text: 'What pattern keeps showing up in my relationships?', category: 'pattern' },
    { text: 'Is someone important about to enter my life?', category: 'timing' },
  ],
  money: [
    { text: 'What does my palm reveal about financial timing?', category: 'timing' },
    { text: 'Should I take the risk I\'ve been thinking about?', category: 'decision' },
    { text: 'What money pattern am I repeating without realizing?', category: 'pattern' },
    { text: 'Is now the right time to make a big move?', category: 'timing' },
  ],
  life_direction: [
    { text: 'What direction is my life actually heading?', category: 'pattern' },
    { text: 'Am I on the right path or avoiding the real one?', category: 'decision' },
    { text: 'What\'s the one thing I keep avoiding?', category: 'pattern' },
    { text: 'What shift is coming that I can\'t see yet?', category: 'timing' },
  ],
}

// ─── State-Based Prompts ─────────────────────────────────────────────────────

const STATE_PROMPTS: Record<string, SuggestedPrompt[]> = {
  feeling_stuck: [
    { text: 'Why do I feel so stuck right now?', category: 'pattern' },
    { text: 'What\'s actually holding me back?', category: 'decision' },
  ],
  turning_point: [
    { text: 'How do I know which direction to choose?', category: 'decision' },
    { text: 'What happens if I wait too long?', category: 'timing' },
  ],
  okay_but_uncertain: [
    { text: 'Why can\'t I shake this feeling of uncertainty?', category: 'pattern' },
    { text: 'What\'s building beneath the surface?', category: 'timing' },
  ],
}

// ─── Reactivation Prompts ────────────────────────────────────────────────────

const REACTIVATION_PROMPTS: SuggestedPrompt[] = [
  { text: 'Has anything changed in my patterns since last time?', category: 'reactivation' },
  { text: 'What did my reading predict — and did it happen?', category: 'reactivation' },
  { text: 'What should I be paying attention to this week?', category: 'timing' },
]

// ─── Main Generator ──────────────────────────────────────────────────────────

export function generateSuggestedPrompts(
  ctx: FullUserContext,
  lifecycleState: LifecycleState,
  maxPrompts = 4
): SuggestedPrompt[] {
  const prompts: SuggestedPrompt[] = []

  // Add name-personalized prompt if available
  if (ctx.firstName) {
    prompts.push({
      text: `What is happening in ${ctx.firstName}'s life right now?`,
      category: 'pattern',
    })
  }

  // Add star-sign specific if available
  if (ctx.starSign) {
    prompts.push({
      text: `What does being a ${ctx.starSign} mean for this moment?`,
      category: 'pattern',
    })
  }

  // Add reactivation prompts for inactive users
  if (lifecycleState === 'paid_inactive' || lifecycleState === 'at_risk_churn') {
    prompts.push(...REACTIVATION_PROMPTS.slice(0, 2))
  }

  // Add focus-based prompts
  const focusPrompts = FOCUS_PROMPTS[ctx.focusArea] ?? FOCUS_PROMPTS.life_direction
  prompts.push(...focusPrompts)

  // Add state-based prompts
  const statePrompts = STATE_PROMPTS[ctx.currentState] ?? []
  prompts.push(...statePrompts)

  // Add memory-based prompts
  const emotionalMemories = ctx.memorySnapshot.emotional
  if (emotionalMemories.length > 0) {
    const latestEmotion = emotionalMemories[0]
    prompts.push({
      text: `You mentioned ${latestEmotion.value.replace(/_/g, ' ')} — has that shifted?`,
      category: 'pattern',
    })
  }

  // Dedupe and limit
  const seen = new Set<string>()
  const unique = prompts.filter(p => {
    if (seen.has(p.text)) return false
    seen.add(p.text)
    return true
  })

  return unique.slice(0, maxPrompts)
}
