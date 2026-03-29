import { NextRequest, NextResponse } from 'next/server'
import { assembleUserContext } from '@/services/profileOrchestrator'
import { getUserLifecycleState } from '@/services/lifecycleEngine'
import { generateSuggestedPrompts } from '@/services/suggestedPrompts'

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const [ctx, lifecycleState] = await Promise.all([
      assembleUserContext(userId),
      getUserLifecycleState(userId),
    ])

    if (!ctx) {
      return NextResponse.json({ error: 'User context not found' }, { status: 404 })
    }

    const prompts = generateSuggestedPrompts(ctx, lifecycleState)

    return NextResponse.json({ prompts })
  } catch (err) {
    console.error('[prompts/suggested]', err)
    return NextResponse.json({ error: 'Failed to generate prompts' }, { status: 500 })
  }
}
