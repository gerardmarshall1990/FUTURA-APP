import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'

// 72-hour hold window from reading creation
const HOLD_HOURS = 72

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  try {
    const [
      { data: profile },
      { data: reading },
      { count: paywallViews },
    ] = await Promise.all([
      getAdminClient()
        .from('user_profiles')
        .select('first_name, focus_area, emotional_pattern, palm_features_json')
        .eq('user_id', userId)
        .single(),
      getAdminClient()
        .from('readings')
        .select('cut_line, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      // Count previous paywall views — drives tone escalation tier
      // Queried BEFORE the current visit event is fired by the client,
      // so 0 = first time, 1 = second time, 2+ = repeat
      getAdminClient()
        .from('engagement_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('event_type', 'paywall_viewed'),
    ])

    const expiresAt = reading?.created_at
      ? new Date(new Date(reading.created_at).getTime() + HOLD_HOURS * 60 * 60 * 1000).toISOString()
      : null

    const hoursRemaining = expiresAt
      ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 3_600_000))
      : null

    // Extract reading_anchor from palm features — the synthesized physical summary
    const palmFeatures = profile?.palm_features_json as { reading_anchor?: string } | null
    const palmReadingAnchor = palmFeatures?.reading_anchor ?? null

    return NextResponse.json({
      firstName:         profile?.first_name         ?? null,
      focusArea:         profile?.focus_area          ?? null,
      emotionalPattern:  profile?.emotional_pattern   ?? null,
      cutLine:           reading?.cut_line             ?? null,
      readingCreatedAt:  reading?.created_at           ?? null,
      expiresAt,
      hoursRemaining,
      palmReadingAnchor,
      exposureCount:     paywallViews ?? 0,
    })
  } catch (err) {
    console.error('[unlock/context]', err)
    return NextResponse.json({
      firstName: null, focusArea: null, emotionalPattern: null,
      cutLine: null, readingCreatedAt: null, expiresAt: null,
      hoursRemaining: null, palmReadingAnchor: null, exposureCount: 0,
    })
  }
}
