/**
 * insightService.ts
 *
 * Daily Insight Engine — generates, stores, and retrieves
 * personalized daily insights for each user.
 */

import { createClient } from '@supabase/supabase-js'
import { generateDailyInsight } from './aiService'
import { assembleUserContext } from './profileOrchestrator'
import { getMemories } from './memoryService'
import type { FocusArea } from './profileNormalizationService'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DailyInsight {
  id: string
  user_id: string
  insight_text: string
  insight_date: string
  focus_area: string
  created_at: string
}

// ─── Get Today's Insight ─────────────────────────────────────────────────────

export async function getTodaysInsight(userId: string): Promise<DailyInsight | null> {
  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabaseAdmin
    .from('daily_insights')
    .select('*')
    .eq('user_id', userId)
    .eq('insight_date', today)
    .single()

  return data ?? null
}

// ─── Generate and Store Insight ──────────────────────────────────────────────

export async function generateAndStoreInsight(userId: string): Promise<DailyInsight | null> {
  // Check if already exists for today
  const existing = await getTodaysInsight(userId)
  if (existing) return existing

  const ctx = await assembleUserContext(userId)
  if (!ctx) return null

  // Calculate days since reading
  const { data: reading } = await supabaseAdmin
    .from('readings')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const daysSinceReading = reading
    ? Math.floor((Date.now() - new Date(reading.created_at).getTime()) / 86400000)
    : 0

  // Get memory themes for context
  const memories = await getMemories(userId, 'behavioral')
  const memoryThemes = memories.map(m => ({
    key_theme: m.key,
    description: m.value,
  }))

  // Get palm features from profile
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('palm_features_json')
    .eq('user_id', userId)
    .single()

  const insightText = await generateDailyInsight(
    ctx.identitySummary,
    ctx.futureTheme,
    ctx.focusArea as FocusArea,
    memoryThemes,
    daysSinceReading,
    profile?.palm_features_json ?? null,
  )

  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabaseAdmin
    .from('daily_insights')
    .insert({
      user_id: userId,
      insight_text: insightText,
      insight_date: today,
      focus_area: ctx.focusArea,
    })
    .select()
    .single()

  return data ?? null
}

// ─── Get Recent Insights ─────────────────────────────────────────────────────

export async function getRecentInsights(userId: string, limit = 7): Promise<DailyInsight[]> {
  const { data } = await supabaseAdmin
    .from('daily_insights')
    .select('*')
    .eq('user_id', userId)
    .order('insight_date', { ascending: false })
    .limit(limit)

  return data ?? []
}
