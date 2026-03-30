/**
 * profileOrchestrator.ts
 *
 * Single source of truth for all user context.
 * Every AI call — chat, insights, triggers — must go through here.
 *
 * assembleUserContext()   → fetches and assembles FullUserContext
 * assemblePromptContext() → renders FullUserContext into a prompt-injectable string
 */

import { createClient } from '@supabase/supabase-js'
import { getMemorySnapshot, buildMemoryContext, type MemorySnapshot } from './memoryService'
import { buildBeliefTone } from './profileNormalizationService'
import { getUserLifecycleState, type LifecycleState } from './lifecycleEngine'
import { buildPalmContext, type PalmFeatures } from './palmAnalysisService'
import { interpretPalmFeatures, buildPalmTraitContext, type PalmTraits } from './palmInterpretationService'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FullUserContext {
  userId: string

  // Identity
  firstName: string | null
  starSign: string | null
  lifePathNumber: number | null
  beliefSystem: string | null
  beliefTone: string
  ageBand: string

  // Behavioral profile
  focusArea: string
  currentState: string
  personalityTrait: string
  corePattern: string
  emotionalPattern: string
  decisionPattern: string
  futureTheme: string
  identitySummary: string

  // Palm — raw features + derived behavioral signals
  palmFeatures: PalmFeatures | null
  palmTraits: PalmTraits | null    // Interpreted from structured signals; null if no structured data

  // Memory
  memorySnapshot: MemorySnapshot
  memoryContext: string

  // Reading
  teaserText: string | null
  lockedText: string | null

  // Access
  isUnlocked: boolean
  isSubscribed: boolean
  remainingMessages: number

  // Lifecycle
  lifecycleState: LifecycleState
}

// ─── Assemble Full Context ────────────────────────────────────────────────────

export async function assembleUserContext(userId: string): Promise<FullUserContext | null> {
  const [
    { data: profile },
    { data: user },
    { data: reading },
    memorySnapshot,
    lifecycleState,
  ] = await Promise.all([
    supabaseAdmin.from('user_profiles').select('*').eq('user_id', userId).single(),
    supabaseAdmin
      .from('users')
      .select('unlock_status, subscription_status, remaining_chat_messages')
      .eq('id', userId)
      .single(),
    supabaseAdmin
      .from('readings')
      .select('teaser_text, locked_text')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    getMemorySnapshot(userId),
    getUserLifecycleState(userId),
  ])

  if (!profile) return null

  const isSubscribed = user?.subscription_status === 'active'
  const isUnlocked = user?.unlock_status || isSubscribed
  const remainingMessages = isSubscribed ? 999 : (user?.remaining_chat_messages ?? 0)

  return {
    userId,
    firstName: profile.first_name ?? null,
    starSign: profile.star_sign ?? null,
    lifePathNumber: profile.life_path_number ?? null,
    beliefSystem: profile.belief_system ?? null,
    beliefTone: buildBeliefTone(profile.belief_system ?? undefined),
    ageBand: profile.age_band,
    focusArea: profile.focus_area,
    currentState: profile.current_state,
    personalityTrait: profile.personality_trait,
    corePattern: profile.core_pattern,
    emotionalPattern: profile.emotional_pattern,
    decisionPattern: profile.decision_pattern,
    futureTheme: profile.future_theme,
    identitySummary: profile.identity_summary,
    palmFeatures: profile.palm_features_json ?? null,
    palmTraits: profile.palm_features_json
      ? interpretPalmFeatures(profile.palm_features_json)
      : null,
    memorySnapshot,
    memoryContext: buildMemoryContext(memorySnapshot),
    teaserText: reading?.teaser_text ?? null,
    lockedText: isUnlocked ? (reading?.locked_text ?? null) : null,
    isUnlocked,
    isSubscribed,
    remainingMessages,
    lifecycleState,
  }
}

// ─── Unified Prompt Context String ───────────────────────────────────────────
// This is what gets injected into every AI call.
// No AI call should build its own context — it must use this.

export function assemblePromptContext(ctx: FullUserContext): string {
  const lines: (string | null)[] = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `IDENTITY`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ctx.firstName        ? `Name: ${ctx.firstName}`                              : null,
    ctx.starSign         ? `Star sign: ${ctx.starSign}`                          : null,
    ctx.lifePathNumber   ? `Life path number: ${ctx.lifePathNumber}`             : null,
    ctx.beliefSystem     ? `Belief system: ${ctx.beliefSystem}`                  : null,
    `Age band: ${ctx.ageBand}`,
    `Focus area: ${ctx.focusArea.replace(/_/g, ' ')}`,
    `Current state: ${ctx.currentState.replace(/_/g, ' ')}`,
    `Core behavioral pattern: ${ctx.corePattern}`,
    `Emotional tendency: ${ctx.emotionalPattern}`,
    `Decision pattern: ${ctx.decisionPattern}`,
    `Current movement arc: ${ctx.futureTheme}`,
    ``,
    `Identity summary:`,
    ctx.identitySummary,
    ``,
    `LANGUAGE TONE:`,
    ctx.beliefTone,
  ]

  const sections: string[] = [lines.filter(Boolean).join('\n')]

  // Palm — raw observed features (physical identity layer)
  // Positioned immediately after identity so all downstream context inherits it
  if (ctx.palmFeatures) {
    sections.push(buildPalmContext(ctx.palmFeatures))
  }

  // Palm — interpreted behavioral signals (derived from structured fields)
  // Separate section so AI gets both "what was observed" and "what it tends to mean"
  if (ctx.palmTraits) {
    const traitContext = buildPalmTraitContext(ctx.palmTraits)
    if (traitContext) sections.push(traitContext)
  }

  // Persistent memory — behavioral history from past sessions
  if (ctx.memoryContext) {
    sections.push(ctx.memoryContext)
  }

  // Lifecycle — where they are in the product journey
  sections.push(
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nLIFECYCLE STATE: ${ctx.lifecycleState.replace(/_/g, ' ')}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
  )

  return sections.join('\n\n')
}
