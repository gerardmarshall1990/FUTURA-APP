import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { trackEvent } from '@/services/analyticsService'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
)

// Events that represent meaningful user engagement.
// These update last_active_at so lifecycle state stays accurate.
const ENGAGEMENT_EVENTS = new Set([
  'chat_message_sent',
  'teaser_viewed',
  'full_reading_viewed',
  'home_visited',
  'chat_started',
])

export async function POST(req: NextRequest) {
  try {
    const { userId, eventName, properties } = await req.json()

    if (!eventName) {
      return NextResponse.json({ error: 'eventName required' }, { status: 400 })
    }

    // Write analytics event
    await trackEvent(userId ?? null, eventName, properties)

    // Update last_active_at for engagement events — non-blocking
    // This is what drives lifecycle state (paid_active / paid_inactive / at_risk_churn)
    if (userId && ENGAGEMENT_EVENTS.has(eventName)) {
      void supabaseAdmin
        .from('users')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', userId)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[analytics/track]', err)
    return NextResponse.json({ ok: true }) // Never 500 for analytics
  }
}
