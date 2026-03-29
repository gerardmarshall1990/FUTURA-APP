/**
 * lifecycleEngine.ts
 *
 * Lifecycle / FOMO / Reactivation Engine.
 * Manages user state transitions and generates triggers for:
 * - Free user conversion (FOMO)
 * - Paid user retention
 * - Inactive user reactivation
 * - Churn prevention
 */

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
)

// ─── User Lifecycle States ───────────────────────────────────────────────────

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
  const isUnlocked = user.unlock_status || isSubscribed
  const lastActive = user.last_active_at ? new Date(user.last_active_at) : new Date(user.created_at)
  const daysSinceActive = Math.floor((Date.now() - lastActive.getTime()) / 86400000)

  if (isSubscribed && daysSinceActive > 14) return 'at_risk_churn'
  if (isSubscribed && daysSinceActive > 3) return 'paid_inactive'
  if (isSubscribed || isUnlocked) return 'paid_active'
  return 'signed_up_unpaid'
}

// ─── Generate Triggers Based on State ────────────────────────────────────────

export async function generateLifecycleTriggers(userId: string): Promise<LifecycleTrigger[]> {
  const state = await getUserLifecycleState(userId)
  const triggers: LifecycleTrigger[] = []

  switch (state) {
    case 'signed_up_unpaid': {
      // FOMO: tease what they're missing
      const { data: reading } = await supabaseAdmin
        .from('readings')
        .select('teaser_text')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (reading) {
        triggers.push({
          user_id: userId,
          trigger_type: 'fomo_reading_preview',
          trigger_data: {
            headline: 'Your reading saw something you haven\'t unlocked yet.',
            subtext: 'The deeper layer of your palm reading is waiting.',
          },
          is_sent: false,
        })
      }

      triggers.push({
        user_id: userId,
        trigger_type: 'fomo_insight_tease',
        trigger_data: {
          headline: 'Your daily insight is ready — but only subscribers can see it.',
          subtext: 'Each day, your patterns reveal something new.',
        },
        is_sent: false,
      })
      break
    }

    case 'paid_inactive': {
      triggers.push({
        user_id: userId,
        trigger_type: 'reactivation_insight',
        trigger_data: {
          headline: 'Something shifted since you last checked in.',
          subtext: 'Your pattern has moved — a new daily insight is waiting.',
        },
        is_sent: false,
      })
      break
    }

    case 'at_risk_churn': {
      triggers.push({
        user_id: userId,
        trigger_type: 'churn_prevention_value',
        trigger_data: {
          headline: 'You\'ve asked 47 questions and uncovered 3 recurring patterns.',
          subtext: 'Your personal advisor remembers everything. Don\'t lose that.',
        },
        is_sent: false,
      })
      break
    }

    case 'paid_active': {
      triggers.push({
        user_id: userId,
        trigger_type: 'retention_daily_insight',
        trigger_data: {
          headline: 'New insight for today',
          subtext: 'Based on your patterns and what\'s building this week.',
        },
        is_sent: false,
      })
      break
    }
  }

  // Store triggers
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

// ─── Mark Trigger Sent ───────────────────────────────────────────────────────

export async function markTriggerSent(triggerId: string): Promise<void> {
  await supabaseAdmin
    .from('lifecycle_triggers')
    .update({ is_sent: true })
    .eq('id', triggerId)
}

// ─── Track Engagement Event ──────────────────────────────────────────────────

export async function trackEngagement(
  userId: string,
  eventType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await Promise.all([
    supabaseAdmin.from('engagement_events').insert({
      user_id: userId,
      event_type: eventType,
      metadata: metadata ?? {},
    }),
    supabaseAdmin.from('users').update({
      last_active_at: new Date().toISOString(),
    }).eq('id', userId),
  ])
}
