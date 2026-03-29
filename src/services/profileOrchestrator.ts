/**
 * profileOrchestrator.ts
 *
 * The Profile Orchestrator — assembles the complete user context
 * from database profile + persistent memories for prompt injection.
 * Every AI call goes through this to get the full picture.
 */

import { createClient } from '@supabase/supabase-js'
import { getMemorySnapshot, buildMemoryContext, type MemorySnapshot } from './memoryService'
import { buildBeliefTone } from './profileNormalizationService'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FullUserContext {
  userId: string
  firstName: string | null
  starSign: string | null
  lifePathNumber: number | null
  beliefSystem: string | null
  beliefTone: string
  focusArea: string
  currentState: string
  personalityTrait: string
  ageBand: string
  corePattern: string
  emotionalPattern: string
  decisionPattern: string
  futureTheme: string
  identitySummary: string
  memorySnapshot: MemorySnapshot
  memoryContext: string
  teaserText: string | null
  lockedText: string | null
  isUnlocked: boolean
  isSubscribed: boolean
}

// ─── Main Orchestration ──────────────────────────────────────────────────────

export async function assembleUserContext(userId: string): Promise<FullUserContext | null> {
  const [
    { data: profile },
    { data: user },
    { data: reading },
    memorySnapshot,
  ] = await Promise.all([
    supabaseAdmin.from('user_profiles').select('*').eq('user_id', userId).single(),
    supabaseAdmin.from('users').select('unlock_status, subscription_status').eq('id', userId).single(),
    supabaseAdmin
      .from('readings')
      .select('teaser_text, locked_text')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    getMemorySnapshot(userId),
  ])

  if (!profile) return null

  const isSubscribed = user?.subscription_status === 'active'
  const isUnlocked = user?.unlock_status || isSubscribed

  return {
    userId,
    firstName: profile.first_name ?? null,
    starSign: profile.star_sign ?? null,
    lifePathNumber: profile.life_path_number ?? null,
    beliefSystem: profile.belief_system ?? null,
    beliefTone: buildBeliefTone(profile.belief_system ?? undefined),
    focusArea: profile.focus_area,
    currentState: profile.current_state,
    personalityTrait: profile.personality_trait,
    ageBand: profile.age_band,
    corePattern: profile.core_pattern,
    emotionalPattern: profile.emotional_pattern,
    decisionPattern: profile.decision_pattern,
    futureTheme: profile.future_theme,
    identitySummary: profile.identity_summary,
    memorySnapshot,
    memoryContext: buildMemoryContext(memorySnapshot),
    teaserText: reading?.teaser_text ?? null,
    lockedText: isUnlocked ? (reading?.locked_text ?? null) : null,
    isUnlocked,
    isSubscribed,
  }
}

// ─── Prompt Assembly ─────────────────────────────────────────────────────────

export function assemblePromptContext(ctx: FullUserContext): string {
  const lines = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `USER CONTEXT (assembled by Profile Orchestrator)`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    ctx.firstName ? `Name: ${ctx.firstName}` : null,
    ctx.starSign ? `Star Sign: ${ctx.starSign}` : null,
    ctx.lifePathNumber ? `Life Path Number: ${ctx.lifePathNumber}` : null,
    ctx.beliefSystem ? `Belief System: ${ctx.beliefSystem}` : null,
    `Focus: ${ctx.focusArea.replace('_', ' ')}`,
    `Current State: ${ctx.currentState.replace(/_/g, ' ')}`,
    `Core Pattern: ${ctx.corePattern}`,
    `Emotional Pattern: ${ctx.emotionalPattern}`,
    `Decision Pattern: ${ctx.decisionPattern}`,
    `Future Theme: ${ctx.futureTheme}`,
    ``,
    `Identity Summary:`,
    ctx.identitySummary,
    ``,
    `LANGUAGE TONE:`,
    ctx.beliefTone,
  ].filter(Boolean).join('\n')

  if (ctx.memoryContext) {
    return `${lines}\n\n${ctx.memoryContext}`
  }

  return lines
}
