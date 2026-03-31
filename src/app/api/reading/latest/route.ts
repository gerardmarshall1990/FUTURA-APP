import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { isAdminUser } from '@/lib/adminBypass'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  try {
    const supabase = getAdminClient()

    const [{ data: user }, { data: reading }, { data: profile }] = await Promise.all([
      supabase
        .from('users')
        .select('unlock_status, subscription_status')
        .eq('id', userId)
        .single(),
      supabase
        .from('readings')
        .select('id, teaser_text, cut_line, locked_text, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('user_profiles')
        .select('first_name, focus_area')
        .eq('user_id', userId)
        .single(),
    ])

    if (!reading) return NextResponse.json({ error: 'No reading found' }, { status: 404 })

    const isUnlocked = isAdminUser(userId) || user?.unlock_status || user?.subscription_status === 'active'

    // 72-hour expiry window from reading creation
    const expiresAt = reading.created_at
      ? new Date(new Date(reading.created_at).getTime() + 72 * 60 * 60 * 1000).toISOString()
      : null
    const hoursRemaining = expiresAt
      ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 3_600_000))
      : null

    return NextResponse.json({
      id:             reading.id,
      teaserText:     reading.teaser_text,
      cutLine:        reading.cut_line,
      lockedText:     isUnlocked ? reading.locked_text : null,
      isUnlocked,
      firstName:      profile?.first_name  ?? null,
      focusArea:      profile?.focus_area  ?? null,
      hoursRemaining,
    })
  } catch (err) {
    console.error('[reading/latest]', err)
    return NextResponse.json({ error: 'Failed to fetch reading' }, { status: 500 })
  }
}
