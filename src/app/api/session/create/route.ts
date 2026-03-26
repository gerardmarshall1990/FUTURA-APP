import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()

    const { data: authData, error: authError } = await supabase.auth.signInAnonymously()
    if (authError) throw authError

    const guestId = authData.user?.id
    if (!guestId) throw new Error('No guest ID returned')

    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert({ guest_id: guestId }, { onConflict: 'guest_id' })
      .select()
      .single()

    if (userError) throw userError

    return NextResponse.json({ userId: user.id, guestId })
  } catch (err) {
    console.error('[session/create]', err)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
