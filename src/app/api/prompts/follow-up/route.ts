import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { generateFollowUpPrompts } from '@/services/aiService'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
)

export async function POST(req: NextRequest) {
  try {
    const { userId, userMessage, advisorResponse } = await req.json()

    if (!userId || !userMessage?.trim() || !advisorResponse?.trim()) {
      return NextResponse.json({ prompts: [] })
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('focus_area, emotional_pattern, core_pattern')
      .eq('user_id', userId)
      .single()

    if (!profile) return NextResponse.json({ prompts: [] })

    const prompts = await generateFollowUpPrompts(
      userMessage,
      advisorResponse,
      profile.focus_area ?? 'life_direction',
      profile.emotional_pattern ?? '',
      profile.core_pattern ?? '',
    )

    return NextResponse.json({ prompts })
  } catch (err) {
    console.error('[prompts/follow-up]', err)
    return NextResponse.json({ prompts: [] })
  }
}
