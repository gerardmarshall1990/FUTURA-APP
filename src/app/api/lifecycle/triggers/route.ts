import { NextRequest, NextResponse } from 'next/server'
import { getPendingTriggers, generateLifecycleTriggers, markTriggerSent } from '@/services/lifecycleEngine'

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    let triggers = await getPendingTriggers(userId)

    // If no pending triggers, generate new ones
    if (triggers.length === 0) {
      triggers = await generateLifecycleTriggers(userId)
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
