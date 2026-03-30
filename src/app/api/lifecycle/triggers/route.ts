import { NextRequest, NextResponse } from 'next/server'
import { getPendingTriggers, generateLifecycleTriggers, markTriggerSent } from '@/services/lifecycleEngine'
import { assembleUserContext } from '@/services/profileOrchestrator'

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    let triggers = await getPendingTriggers(userId)

    // Regenerate if no pending triggers exist, or existing ones are stale (>24h old).
    // Prevents: (a) AI generation on every home load, (b) stale copy after days away.
    const areFresh = triggers.length > 0 &&
      triggers[0].created_at != null &&
      (Date.now() - new Date(triggers[0].created_at).getTime()) < 24 * 60 * 60 * 1000

    if (!areFresh) {
      const ctx = await assembleUserContext(userId)
      if (ctx) {
        triggers = await generateLifecycleTriggers(ctx)
      }
    }

    return NextResponse.json({ triggers })
  } catch (err) {
    console.error('[lifecycle/triggers]', err)
    return NextResponse.json({ error: 'Failed to get triggers' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { triggerId } = await req.json()
    if (!triggerId) {
      return NextResponse.json({ error: 'triggerId required' }, { status: 400 })
    }
    await markTriggerSent(triggerId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[lifecycle/triggers POST]', err)
    return NextResponse.json({ error: 'Failed to update trigger' }, { status: 500 })
  }
}
