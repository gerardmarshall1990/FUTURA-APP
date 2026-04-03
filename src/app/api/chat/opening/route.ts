import { NextRequest, NextResponse } from 'next/server'
import { assembleUserContext } from '@/services/profileOrchestrator'
import { generateChatOpening } from '@/services/aiService'

const FALLBACK = "Your reading pointed somewhere specific. What's the part you've been sitting with?"

const EMPTY = { message: FALLBACK, name: null, focusArea: null, emotionalPattern: null }

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  try {
    const ctx = await assembleUserContext(userId)
    if (!ctx) return NextResponse.json(EMPTY)

    // generateChatOpening: AI-generated when teaserText exists (references reading + palm anchor),
    // falls back to deterministic pattern × focusArea opener when no reading is available yet.
    const message = await generateChatOpening(ctx)

    return NextResponse.json({
      message,
      name:             ctx.firstName,
      focusArea:        ctx.focusArea,
      emotionalPattern: ctx.emotionalPattern,
    })
  } catch (err) {
    console.error('[chat/opening]', err)
    return NextResponse.json(EMPTY)
  }
}
