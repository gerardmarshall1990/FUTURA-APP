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

    if (triggers.length === 0) {
      // Need full context to generate personalized triggers
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
