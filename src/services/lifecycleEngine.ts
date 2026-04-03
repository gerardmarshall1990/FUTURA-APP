/**
 * lifecycleEngine.ts
 *
 * Lifecycle / FOMO / Reactivation Engine.
 * All trigger copy is AI-generated using the user's actual:
 * - firstName, focusArea, emotionalPattern, memorySnapshot
 * No hardcoded strings. Every trigger is specific to this person.
 */

import { getAdminClient } from '@/lib/supabase/admin'
import type { FullUserContext } from './profileOrchestrator'
import { generateTriggerCopy } from './aiService'

export type LifecycleState =
  | 'new_user'         // signed up < 48h, no chat activity yet
  | 'active_user'      // free user, has chat activity or account > 48h old
  | 'paid_user'        // paid, active (last 3 days)
  | 'paid_inactive'    // paid, dormant (3–14 days since last activity)
  | 'at_risk_churn'    // paid, at-risk (>14 days since last activity)
  | 'anonymous'        // no profile (should not reach AI calls)

export type TriggerType =
  | 'fomo_reading_preview'
  | 'fomo_insight_tease'
  | 'fomo_chat_limit'
  | 'continuation_unresolved'    // "this hasn't resolved yet"
  | 'escalation_pattern_shift'   // "this is becoming clearer"
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

// ─── Determine User State ─────────────────────────────────────────────────────
// State depends on: payment status, time since last activity, chat depth.

export async function getUserLifecycleState(userId: string): Promise<LifecycleState> {
  const [userResult, sessionCountResult] = await Promise.all([
    getAdminClient()
      .from('users')
      .select('unlock_status, subscription_status, last_active_at, created_at')
      .eq('id', userId)
      .single(),
    getAdminClient()
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
  ])

  const user = userResult.data
  if (!user) return 'anonymous'

  const chatDepth      = sessionCountResult.count ?? 0
  const isSubscribed   = user.subscription_status === 'active'
  const isUnlocked     = user.unlock_status || isSubscribed
  const lastActive     = user.last_active_at ? new Date(user.last_active_at) : new Date(user.created_at)
  const daysSince      = Math.floor((Date.now() - lastActive.getTime()) / 86_400_000)
  const hoursSinceJoin = user.created_at
    ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / 3_600_000)
    : 9999

  if (!isUnlocked) {
    // Free users: classify by age and chat depth
    if (hoursSinceJoin < 48 && chatDepth === 0) return 'new_user'
    return 'active_user'
  }

  // Paid users: classify by recency
  if (daysSince > 14) return 'at_risk_churn'
  if (daysSince > 3)  return 'paid_inactive'
  return 'paid_user'
}

// ─── Context helpers ──────────────────────────────────────────────────────────

function memoryKeys(ctx: FullUserContext): string[] {
  return [
    ...ctx.memorySnapshot.emotional,
    ...ctx.memorySnapshot.behavioral,
    ...ctx.memorySnapshot.event,
  ].map(m => m.key)
}

// Recent memory descriptions — used for continuation/re-engagement triggers
// where the copy needs to reference what the user was actually dealing with.
function memoryDescriptions(ctx: FullUserContext): string[] {
  return [
    ...ctx.memorySnapshot.emotional,
    ...ctx.memorySnapshot.behavioral,
  ]
    .slice(0, 3)
    .map(m => m.value)
}

function copyArgs(ctx: FullUserContext) {
  return {
    firstName:          ctx.firstName,
    focusArea:          ctx.focusArea,
    emotionalPattern:   ctx.emotionalPattern,
    memoryKeys:         memoryKeys(ctx),
    memoryDescriptions: memoryDescriptions(ctx),
    starSign:           ctx.starSign,
    palmFeatures:       ctx.palmFeatures,
  } as const
}

// ─── Generate AI-Written Triggers ────────────────────────────────────────────

export async function generateLifecycleTriggers(ctx: FullUserContext): Promise<LifecycleTrigger[]> {
  const args = copyArgs(ctx)
  const triggers: LifecycleTrigger[] = []
  const hasMemory = args.memoryKeys.length > 0

  switch (ctx.lifecycleState) {

    case 'new_user': {
      // New user — FOMO: they have a reading waiting, daily insights they haven't seen
      const [readingCopy, insightCopy] = await Promise.all([
        generateTriggerCopy('fomo_reading_preview', args.firstName, args.focusArea, args.emotionalPattern, args.memoryKeys, args.starSign, args.palmFeatures, args.memoryDescriptions),
        generateTriggerCopy('fomo_insight_tease',   args.firstName, args.focusArea, args.emotionalPattern, args.memoryKeys, args.starSign, args.palmFeatures, args.memoryDescriptions),
      ])
      triggers.push(
        { user_id: ctx.userId, trigger_type: 'fomo_reading_preview', trigger_data: { ...readingCopy, cta: 'See what your reading says', cta_href: '/reading' }, is_sent: false },
        { user_id: ctx.userId, trigger_type: 'fomo_insight_tease',   trigger_data: { ...insightCopy, cta: 'Get full access', cta_href: '/unlock' }, is_sent: false },
      )
      break
    }

    case 'active_user': {
      // Active free user — if they have chat history, a thread is unresolved.
      // If no memory yet, fall back to FOMO.
      if (hasMemory) {
        const copy = await generateTriggerCopy('continuation_unresolved', args.firstName, args.focusArea, args.emotionalPattern, args.memoryKeys, args.starSign, args.palmFeatures, args.memoryDescriptions)
        triggers.push({ user_id: ctx.userId, trigger_type: 'continuation_unresolved', trigger_data: { ...copy, cta: 'Continue the thread', cta_href: '/chat' }, is_sent: false })
      } else {
        const copy = await generateTriggerCopy('fomo_reading_preview', args.firstName, args.focusArea, args.emotionalPattern, args.memoryKeys, args.starSign, args.palmFeatures, args.memoryDescriptions)
        triggers.push({ user_id: ctx.userId, trigger_type: 'fomo_reading_preview', trigger_data: { ...copy, cta: 'Unlock full reading', cta_href: '/unlock' }, is_sent: false })
      }
      break
    }

    case 'paid_user': {
      // Active paid user — escalation (pattern developing) + today's insight
      const [escalationCopy, insightCopy] = await Promise.all([
        generateTriggerCopy('escalation_pattern_shift', args.firstName, args.focusArea, args.emotionalPattern, args.memoryKeys, args.starSign, args.palmFeatures, args.memoryDescriptions),
        generateTriggerCopy('retention_daily_insight',  args.firstName, args.focusArea, args.emotionalPattern, args.memoryKeys, args.starSign, args.palmFeatures, args.memoryDescriptions),
      ])
      triggers.push(
        { user_id: ctx.userId, trigger_type: 'escalation_pattern_shift', trigger_data: { ...escalationCopy, cta: 'See what shifted', cta_href: '/chat' }, is_sent: false },
        { user_id: ctx.userId, trigger_type: 'retention_daily_insight',  trigger_data: { ...insightCopy,    cta: "Read today's insight", cta_href: '/home' }, is_sent: false },
      )
      break
    }

    case 'paid_inactive': {
      // Paid but dormant — re-engagement. Reference what they left behind.
      const triggerType = hasMemory ? 'reactivation_pattern_update' : 'reactivation_insight'
      const copy = await generateTriggerCopy(triggerType, args.firstName, args.focusArea, args.emotionalPattern, args.memoryKeys, args.starSign, args.palmFeatures, args.memoryDescriptions)
      triggers.push({ user_id: ctx.userId, trigger_type: triggerType, trigger_data: { ...copy, cta: "See what's developed", cta_href: '/home' }, is_sent: false })
      break
    }

    case 'at_risk_churn': {
      // Long absence — churn prevention. Direct, not desperate.
      const copy = await generateTriggerCopy('churn_prevention_value', args.firstName, args.focusArea, args.emotionalPattern, args.memoryKeys, args.starSign, args.palmFeatures, args.memoryDescriptions)
      triggers.push({ user_id: ctx.userId, trigger_type: 'churn_prevention_value', trigger_data: { ...copy, cta: 'Continue with your advisor', cta_href: '/chat' }, is_sent: false })
      break
    }
  }

  if (triggers.length > 0) {
    await getAdminClient().from('lifecycle_triggers').insert(triggers)
  }

  return triggers
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export async function getPendingTriggers(userId: string): Promise<LifecycleTrigger[]> {
  const { data } = await getAdminClient()
    .from('lifecycle_triggers')
    .select('*')
    .eq('user_id', userId)
    .eq('is_sent', false)
    .order('created_at', { ascending: false })
    .limit(5)
  return data ?? []
}

export async function markTriggerSent(triggerId: string): Promise<void> {
  await getAdminClient()
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
    getAdminClient().from('engagement_events').insert({ user_id: userId, event_type: eventType, metadata: metadata ?? {} }),
    getAdminClient().from('users').update({ last_active_at: new Date().toISOString() }).eq('id', userId),
  ])
}
