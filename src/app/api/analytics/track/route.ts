import { NextRequest, NextResponse } from 'next/server'
import { trackEvent } from '@/services/analyticsService'

export async function POST(req: NextRequest) {
  try {
    const { userId, eventName, properties } = await req.json()

    if (!eventName) {
      return NextResponse.json({ error: 'eventName required' }, { status: 400 })
    }

    await trackEvent(userId ?? null, eventName, properties)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[analytics/track]', err)
    return NextResponse.json({ ok: true }) // Never 500 for analytics
  }
}
