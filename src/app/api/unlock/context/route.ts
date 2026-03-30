import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// 72-hour hold window from reading creation
const HOLD_HOURS = 72

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  try {
    const [{ data: profile }, { data: reading }] = await Promise.all([
      supabaseAdmin
        .from('user_profiles')
        .select('first_name, focus_area, emotional_pattern, palm_features_json')
        .eq('user_id', userId)
        .single(),
      supabaseAdmin
        .from('readings')
        .select('cut_line, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
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
    })
  } catch (err) {
    console.error('[unlock/context]', err)
    return NextResponse.json({
      firstName: null, focusArea: null, emotionalPattern: null,
      cutLine: null, readingCreatedAt: null, expiresAt: null,
      hoursRemaining: null, palmReadingAnchor: null,
    })
  }
}
