/**
 * lifecycleEngine.ts
 *
 * Lifecycle / FOMO / Reactivation Engine.
 * Trigger copy is personalized using FullUserContext — name, focus area,
 * star sign, belief system, and memory are all used in headlines and subtext.
 */

import { createClient } from '@supabase/supabase-js'
import type { FullUserContext } from './profileOrchestrator'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
)

export type LifecycleState =
  | 'anonymous'
  | 'signed_up_unpaid'
  | 'paid_active'
  | 'paid_inactive'
  | 'at_risk_churn'

export type TriggerType =
  | 'fomo_reading_preview'
  | 'fomo_insight_tease'
  | 'fomo_chat_limit'
  | 'reactivation_insight'
  | 'reactivation_pattern_update'
  | 'churn_prevention_value'
  | 'retention_daily_insight'
  | 'retention_suggested_prompt'

export interface LifecycleTrigger {
  id?: string
  user_id: string
  trigger_type: TriggerType
  trigger_data: Record<string, unknown>
  is_sent: boolean
  created_at?: string
}

// ─── Determine User State ────────────────────────────────────────────────────

export async function getUserLifecycleState(userId: string): Promise<LifecycleState> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('unlock_status, subscription_status, last_active_at, created_at')
    .eq('id', userId)
    .single()

  if (!user) return 'anonymous'

  const isSubscribed = user.subscription_status === 'active'
  const isUnlocked   = user.unlock_status || isSubscribed
  const lastActive   = user.last_active_at ? new Date(user.last_active_at) : new Date(user.created_at)
  const daysSince    = Math.floor((Date.now() - lastActive.getTime()) / 86400000)

  if (isSubscribed && daysSince > 14) return 'at_risk_churn'
  if (isSubscribed && daysSince > 3)  return 'paid_inactive'
  if (isSubscribed || isUnlocked)     return 'paid_active'
  return 'signed_up_unpaid'
}

// ─── Personalized trigger copy ────────────────────────────────────────────────

function buildFomoTriggers(ctx: FullUserContext): LifecycleTrigger[] {
  const name     = ctx.firstName ?? 'You'
  const focus    = ctx.focusArea.replace(/_/g, ' ')
  const sign     = ctx.starSign
  const pattern  = ctx.corePattern.replace(/_/g, ' ')

  const triggers: LifecycleTrigger[] = []

  // Reading preview — references their specific focus and pattern
  triggers.push({
    user_id: ctx.userId,
    trigger_type: 'fomo_reading_preview',
    trigger_data: {
      headline: `${name}, your reading has a deeper layer you haven't seen yet.`,
      subtext: sign
        ? `The section on your ${focus} and what your ${sign} placement means right now is locked.`
        : `The section on your ${focus} — and what it reveals about your ${pattern} pattern — is locked.`,
      cta: 'Unlock full reading',
      cta_href: '/unlock',
    },
    is_sent: false,
  })

  // Insight tease — references their focus area specifically
  triggers.push({
    user_id: ctx.userId,
    trigger_type: 'fomo_insight_tease',
    trigger_data: {
      headline: `Today's insight about your ${focus} is ready.`,
      subtext: `Subscribers get a fresh daily insight based on your patterns. Yours is waiting.`,
      cta: 'Get full access',
      cta_href: '/unlock',
    },
    is_sent: false,
  })

  return triggers
}

function buildReactivationTriggers(ctx: FullUserContext): LifecycleTrigger[] {
  const name  = ctx.firstName ?? 'You'
  const focus = ctx.focusArea.replace(/_/g, ' ')

  // Pull the most recent emotional or behavioral memory for personalization
  const latestMemory = [
    ...ctx.memorySnapshot.emotional,
    ...ctx.memorySnapshot.behavioral,
  ].sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))[0]

  const memoryHint = latestMemory
    ? `The pattern around "${latestMemory.value.replace(/_/g, ' ')}" has likely shifted.`
    : `Your ${focus} pattern has likely moved since your last check-in.`

  return [{
    user_id: ctx.userId,
    trigger_type: 'reactivation_insight',
    trigger_data: {
      headline: `${name}, something has shifted since you last checked in.`,
      subtext: memoryHint,
      cta: 'See today\'s insight',
      cta_href: '/chat',
    },
    is_sent: false,
  }]
}

function buildChurnTriggers(ctx: FullUserContext): LifecycleTrigger[] {
  const name = ctx.firstName ?? 'You'

  // Count actual chat messages from memory — memory count is a real signal
  const memoryCount = [
    ...ctx.memorySnapshot.behavioral,
    ...ctx.memorySnapshot.emotional,
    ...ctx.memorySnapshot.event,
  ].length

  const patternWord = memoryCount > 3
    ? `${memoryCount} behavioral patterns`
    : `patterns specific to you`

  return [{
    user_id: ctx.userId,
    trigger_type: 'churn_prevention_value',
    trigger_data: {
      headline: `${name}, your advisor has built up ${patternWord} about you.`,
      subtext: `That context disappears if you leave. Your palm reading, identity profile, and conversation history are stored here.`,
      cta: 'Continue with your advisor',
      cta_href: '/chat',
    },
    is_sent: false,
  }]
}

function buildRetentionTriggers(ctx: FullUserContext): LifecycleTrigger[] {
  const focus = ctx.focusArea.replace(/_/g, ' ')

  return [{
    user_id: ctx.userId,
    trigger_type: 'retention_daily_insight',
    trigger_data: {
      headline: `Today's insight is ready.`,
      subtext: `Based on your ${focus} patterns and what your palm revealed about what's building.`,
      cta: 'Read today\'s insight',
      cta_href: '/home',
    },
    is_sent: false,
  }]
}

// ─── Generate Triggers ────────────────────────────────────────────────────────

export async function generateLifecycleTriggers(ctx: FullUserContext): Promise<LifecycleTrigger[]> {
  let triggers: LifecycleTrigger[] = []

  switch (ctx.lifecycleState) {
    case 'signed_up_unpaid':
      triggers = buildFomoTriggers(ctx)
      break
    case 'paid_inactive':
      triggers = buildReactivationTriggers(ctx)
      break
    case 'at_risk_churn':
      triggers = buildChurnTriggers(ctx)
      break
    case 'paid_active':
      triggers = buildRetentionTriggers(ctx)
      break
  }

  if (triggers.length > 0) {
    await supabaseAdmin.from('lifecycle_triggers').insert(triggers)
  }

  return triggers
}

// ─── Get Pending Triggers ────────────────────────────────────────────────────

export async function getPendingTriggers(userId: string): Promise<LifecycleTrigger[]> {
  const { data } = await supabaseAdmin
    .from('lifecycle_triggers')
    .select('*')
    .eq('user_id', userId)
    .eq('is_sent', false)
    .order('created_at', { ascending: false })
    .limit(5)
  return data ?? []
}

export async function markTriggerSent(triggerId: string): Promise<void> {
  await supabaseAdmin
    .from('lifecycle_triggers')
    .update({ is_sent: true })
    .eq('id', triggerId)
}

export async function trackEngagement(
  userId: string,
  eventType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await Promise.all([
    supabaseAdmin.from('engagement_events').insert({ user_id: userId, event_type: eventType, metadata: metadata ?? {} }),
    supabaseAdmin.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', userId),
  ])
}
