import { NextRequest, NextResponse } from 'next/server'
import { trackEvent, trackEngagementEvent } from '@/services/analyticsService'
import { getAdminClient } from '@/lib/supabase/admin'

// Events that update last_active_at — drives lifecycle state accuracy.
const ACTIVITY_EVENTS = new Set([
  'app_opened',
  'reading_viewed',
  'cut_reached',
  'chat_started',
  'message_sent',
  'chat_message_sent',  // legacy
  'teaser_viewed',      // legacy
  'full_reading_viewed',
  'insight_viewed',
  'trigger_clicked',
  'home_visited',
])

// Funnel events written to engagement_events for SQL funnel queries.
// Includes userId, lifecycleState, focusArea, source, timestamp.
const FUNNEL_EVENTS = new Set([
  'onboarding_started',
  'onboarding_completed',
  'palm_scan_started',
  'palm_scan_completed',
  'reading_generated',
  'reading_viewed',
  'cut_reached',
  'paywall_viewed',
  'unlock_clicked',
  'unlock_completed',
  'chat_started',
  'message_sent',
  'paywall_triggered_chat',
  'app_opened',
  'trigger_clicked',
  'insight_viewed',
])

export async function POST(req: NextRequest) {
  try {
    const { userId, eventName, properties } = await req.json()

    if (!eventName) {
      return NextResponse.json({ error: 'eventName required' }, { status: 400 })
    }

    const uid = userId ?? null

    // Write to analytics_events (PostHog-style log)
    await trackEvent(uid, eventName, properties)

    // Write to engagement_events for funnel SQL queries
    if (FUNNEL_EVENTS.has(eventName)) {
      void trackEngagementEvent(
        uid,
        eventName,
        {
          lifecycleState: properties?.lifecycleState as string ?? null,
          focusArea:      properties?.focusArea      as string ?? null,
          source:         properties?.source         as string ?? null,
        },
        // session_id + everything else that isn't a top-level context field
        Object.fromEntries(
          Object.entries(properties ?? {}).filter(([k]) => !['lifecycleState','focusArea','source'].includes(k))
        ),
      )
    }

    // Update last_active_at for engagement events
    if (uid && ACTIVITY_EVENTS.has(eventName)) {
      void getAdminClient()
        .from('users')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', uid)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[analytics/track]', err)
    return NextResponse.json({ ok: true }) // Never 500 for analytics
  }
}
