export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { selectReadingBlocks } from '@/services/readingBlockService'
import { composeReading } from '@/services/readingCompositionService'
import { polishReading } from '@/services/aiService'
import { trackEngagementEvent } from '@/services/analyticsService'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const supabase = getAdminClient()

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found — complete onboarding first' }, { status: 404 })
    }

    const blocks = selectReadingBlocks(
      {
        corePattern:      profile.core_pattern,
        emotionalPattern: profile.emotional_pattern,
        decisionPattern:  profile.decision_pattern,
        futureTheme:      profile.future_theme,
        identitySummary:  profile.identity_summary,
      },
      profile.focus_area,
      profile.current_state,
      profile.personality_trait,
      userId
    )

    const composed = composeReading(blocks)

    const polished = await polishReading(
      composed.teaserRaw,
      composed.lockedRaw,
      composed.cutLine,
      profile.identity_summary,
      profile.focus_area,
      profile.future_theme,
      profile.palm_features_json ?? null,
      profile.first_name ?? null,
      profile.belief_system ?? null,
      profile.star_sign ?? null,
      profile.core_pattern ?? null,
      profile.emotional_pattern ?? null,
    )

    const fullText = [polished.teaserText, polished.cutLine, polished.lockedText]
      .filter(Boolean)
      .join('\n\n')

    const { data: reading, error: readingError } = await supabase
      .from('readings')
      .insert({
        user_id:     userId,
        profile_id:  profile.id,
        teaser_text: polished.teaserText,
        cut_line:    polished.cutLine,
        locked_text: polished.lockedText,
        full_text:   fullText,
      })
      .select()
      .single()

    if (readingError) throw readingError

    // Write to analytics_events (PostHog log) and engagement_events (funnel queries) in parallel
    await Promise.all([
      supabase.from('analytics_events').insert({
        user_id:    userId,
        event_name: 'reading_generated',
        properties: {
          focus_area:        profile.focus_area,
          current_state:     profile.current_state,
          personality_trait: profile.personality_trait,
          core_pattern:      profile.core_pattern,
          reading_id:        reading.id,
        },
      }),
      trackEngagementEvent(userId, 'reading_generated', { focusArea: profile.focus_area }, {
        current_state:     profile.current_state,
        personality_trait: profile.personality_trait,
        core_pattern:      profile.core_pattern,
        reading_id:        reading.id,
      }),
    ])

    return NextResponse.json({ reading })
  } catch (err) {
    console.error('[reading/generate]', err)
    return NextResponse.json({ error: 'Failed to generate reading. Please try again.' }, { status: 500 })
  }
}
