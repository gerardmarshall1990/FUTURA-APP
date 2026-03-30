/**
 * lifecycleEngine.ts
 *
 * Lifecycle / FOMO / Reactivation Engine.
 * All trigger copy is AI-generated using the user's actual:
 * - firstName, focusArea, emotionalPattern, memorySnapshot
 * No hardcoded strings. Every trigger is specific to this person.
 */

import { createClient } from '@supabase/supabase-js'
import type { FullUserContext } from './profileOrchestrator'
import { generateTriggerCopy } from './aiService'

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

// ─── Context helpers ──────────────────────────────────────────────────────────

function memoryKeys(ctx: FullUserContext): string[] {
  return [
    ...ctx.memorySnapshot.emotional,
    ...ctx.memorySnapshot.behavioral,
    ...ctx.memorySnapshot.event,
  ].map(m => m.key)
}

function copyArgs(ctx: FullUserContext) {
  return {
    firstName:       ctx.firstName,
    focusArea:       ctx.focusArea,
    emotionalPattern: ctx.emotionalPattern,
    memoryKeys:      memoryKeys(ctx),
    starSign:        ctx.starSign,
  } as const
}

// ─── Generate AI-Written Triggers ────────────────────────────────────────────

export async function generateLifecycleTriggers(ctx: FullUserContext): Promise<LifecycleTrigger[]> {
  const args = copyArgs(ctx)
  const triggers: LifecycleTrigger[] = []

  switch (ctx.lifecycleState) {

    case 'signed_up_unpaid': {
      // Generate two FOMO triggers in parallel
      const [readingCopy, insightCopy] = await Promise.all([
        generateTriggerCopy('fomo_reading_preview', args.firstName, args.focusArea, args.emotionalPattern, args.memoryKeys, args.starSign),
        generateTriggerCopy('fomo_insight_tease',   args.firstName, args.focusArea, args.emotionalPattern, args.memoryKeys, args.starSign),
      ])

      triggers.push(
        {
          user_id: ctx.userId,
          trigger_type: 'fomo_reading_preview',
          trigger_data: { ...readingCopy, cta: 'Unlock full reading', cta_href: '/unlock' },
          is_sent: false,
        },
        {
          user_id: ctx.userId,
          trigger_type: 'fomo_insight_tease',
          trigger_data: { ...insightCopy, cta: 'Get full access', cta_href: '/unlock' },
          is_sent: false,
        }
      )
      break
    }

    case 'paid_inactive': {
      const copy = await generateTriggerCopy(
        'reactivation_insight',
        args.firstName, args.focusArea, args.emotionalPattern, args.memoryKeys, args.starSign
      )
      triggers.push({
        user_id: ctx.userId,
        trigger_type: 'reactivation_insight',
        trigger_data: { ...copy, cta: "See today's insight", cta_href: '/home' },
        is_sent: false,
      })
      break
    }

    case 'at_risk_churn': {
      const copy = await generateTriggerCopy(
        'churn_prevention_value',
        args.firstName, args.focusArea, args.emotionalPattern, args.memoryKeys, args.starSign
      )
      triggers.push({
        user_id: ctx.userId,
        trigger_type: 'churn_prevention_value',
        trigger_data: { ...copy, cta: 'Continue with your advisor', cta_href: '/chat' },
        is_sent: false,
      })
      break
    }

    case 'paid_active': {
      const copy = await generateTriggerCopy(
        'retention_daily_insight',
        args.firstName, args.focusArea, args.emotionalPattern, args.memoryKeys, args.starSign
      )
      triggers.push({
        user_id: ctx.userId,
        trigger_type: 'retention_daily_insight',
        trigger_data: { ...copy, cta: "Read today's insight", cta_href: '/home' },
        is_sent: false,
      })
      break
    }
  }

  if (triggers.length > 0) {
    await supabaseAdmin.from('lifecycle_triggers').insert(triggers)
  }

  return triggers
}

// ─── Utilities ────────────────────────────────────────────────────────────────

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
