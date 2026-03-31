/**
 * insightService.ts
 *
 * Daily Insight Engine.
 * Uses assembleUserContext() — no separate profile/palm/memory fetches.
 */

import { getAdminClient } from '@/lib/supabase/admin'
import { generateDailyInsight } from './aiService'
import { assembleUserContext, assemblePromptContext } from './profileOrchestrator'
import type { FocusArea } from './profileNormalizationService'

export interface DailyInsight {
  id: string
  user_id: string
  insight_text: string
  insight_date: string
  focus_area: string
  created_at: string
}

export async function getTodaysInsight(userId: string): Promise<DailyInsight | null> {
  const today = new Date().toISOString().split('T')[0]
  const { data } = await getAdminClient()
    .from('daily_insights')
    .select('*')
    .eq('user_id', userId)
    .eq('insight_date', today)
    .single()
  return data ?? null
}

export async function generateAndStoreInsight(userId: string): Promise<DailyInsight | null> {
  const existing = await getTodaysInsight(userId)
  if (existing) return existing

  // Single unified context call — includes identity, palm, memory, lifecycle
  const ctx = await assembleUserContext(userId)
  if (!ctx) return null

  // Days since reading (still needs a direct fetch — not in ctx)
  const { data: reading } = await getAdminClient()
    .from('readings')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const daysSinceReading = reading
    ? Math.floor((Date.now() - new Date(reading.created_at).getTime()) / 86400000)
    : 0

  // All memory types flow into insight — not just behavioral
  const allMemoryThemes = [
    ...ctx.memorySnapshot.behavioral,
    ...ctx.memorySnapshot.emotional,
    ...ctx.memorySnapshot.event,
  ].map(m => ({ key_theme: m.key, description: m.value }))

  const insightText = await generateDailyInsight(
    ctx.identitySummary,
    ctx.futureTheme,
    ctx.focusArea as FocusArea,
    allMemoryThemes,
    daysSinceReading,
    ctx.palmFeatures,
  )

  const today = new Date().toISOString().split('T')[0]
  const { data } = await getAdminClient()
    .from('daily_insights')
    .insert({ user_id: userId, insight_text: insightText, insight_date: today, focus_area: ctx.focusArea })
    .select()
    .single()

  return data ?? null
}

export async function getRecentInsights(userId: string, limit = 7): Promise<DailyInsight[]> {
  const { data } = await getAdminClient()
    .from('daily_insights')
    .select('*')
    .eq('user_id', userId)
    .order('insight_date', { ascending: false })
    .limit(limit)
  return data ?? []
}
