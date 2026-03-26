import { NextRequest, NextResponse } from 'next/server'
import {
  createUnlockCheckoutSession,
  createSubscriptionCheckoutSession,
} from '@/services/stripeService'
import { trackEvent } from '@/services/analyticsService'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { userId, type, email } = await req.json()

    if (!userId || !type) {
      return NextResponse.json({ error: 'userId and type required' }, { status: 400 })
    }

    if (!['unlock', 'subscription'].includes(type)) {
      return NextResponse.json({ error: 'type must be unlock or subscription' }, { status: 400 })
    }

    const supabase = createClient()

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, unlock_status, subscription_status')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (type === 'unlock' && user.unlock_status) {
      return NextResponse.json({ error: 'Already unlocked' }, { status: 409 })
    }
    if (type === 'subscription' && user.subscription_status === 'active') {
      return NextResponse.json({ error: 'Already subscribed' }, { status: 409 })
    }

    const resolvedEmail = email ?? user.email ?? undefined

    const result = type === 'unlock'
      ? await createUnlockCheckoutSession(userId, resolvedEmail)
      : await createSubscriptionCheckoutSession(userId, resolvedEmail)

    await trackEvent(userId, type === 'unlock' ? 'unlock_paywall_viewed' : 'subscription_paywall_viewed', {
      checkout_session_id: result.sessionId,
    })

    return NextResponse.json({ url: result.url, sessionId: result.sessionId })
  } catch (err) {
    console.error('[unlock]', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
