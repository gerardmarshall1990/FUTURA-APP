/**
 * /api/unlock — POST
 *
 * Creates a Stripe Checkout session for:
 * - type: 'unlock'       → one-time reading unlock
 * - type: 'subscription' → monthly subscription
 *
 * Returns the Stripe-hosted checkout URL. Client redirects to it.
 */

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

    // Verify user exists
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, unlock_status, subscription_status')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent duplicate purchases
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

    // Track that user entered checkout
    await trackEvent(userId, type === 'unlock' ? 'unlock_paywall_viewed' : 'subscription_paywall_viewed', {
      checkout_session_id: result.sessionId,
    })

    return NextResponse.json({ url: result.url, sessionId: result.sessionId })

  } catch (err) {
    console.error('[unlock]', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}


// ─────────────────────────────────────────────────────────────────────────────
/**
 * /api/paywall/status — GET
 *
 * Returns the current paywall state for a user.
 * Used by the client to sync unlock/subscription state after returning
 * from Stripe Checkout (success URL includes session_id).
 *
 * Also used on app load to restore correct state without relying solely
 * on Zustand persistence (which can be stale if webhook fired while app was closed).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPaywallStatus } from '@/services/stripeService'

export async function GET_PAYWALL_STATUS(req: NextRequest) {
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
