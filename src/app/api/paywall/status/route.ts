import { NextRequest, NextResponse } from 'next/server'
import { getPaywallStatus } from '@/services/stripeService'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  try {
    const status = await getPaywallStatus(userId)
    return NextResponse.json(status)
  } catch (err) {
    console.error('[paywall/status]', err)
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 })
  }
}
