import { NextRequest, NextResponse } from 'next/server'
import { assembleUserContext } from '@/services/profileOrchestrator'
import { buildAdvisorOpeningMessage } from '@/lib/prompts/advisorPrompt'

const FALLBACK = "I've reviewed your reading. What would you like to explore?"

const EMPTY = { message: FALLBACK, name: null, focusArea: null, emotionalPattern: null }

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  try {
    const ctx = await assembleUserContext(userId)
    if (!ctx) return NextResponse.json(EMPTY)

    return NextResponse.json({
      message:          buildAdvisorOpeningMessage(ctx),
      name:             ctx.firstName,
      focusArea:        ctx.focusArea,
      emotionalPattern: ctx.emotionalPattern,
    })
  } catch (err) {
    console.error('[chat/opening]', err)
    return NextResponse.json(EMPTY)
  }
}
