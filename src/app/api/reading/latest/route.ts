import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  try {
    const supabase = createClient()

    const [{ data: user }, { data: reading }] = await Promise.all([
      supabase.from('users').select('unlock_status, subscription_status').eq('id', userId).single(),
      supabase
        .from('readings')
        .select('id, teaser_text, cut_line, locked_text, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
    ])

    if (!reading) return NextResponse.json({ error: 'No reading found' }, { status: 404 })

    const isUnlocked = user?.unlock_status || user?.subscription_status === 'active'

    return NextResponse.json({
      id: reading.id,
      teaserText: reading.teaser_text,
      cutLine: reading.cut_line,
      lockedText: isUnlocked ? reading.locked_text : null,
      isUnlocked,
    })
  } catch (err) {
    console.error('[reading/latest]', err)
    return NextResponse.json({ error: 'Failed to fetch reading' }, { status: 500 })
  }
}
