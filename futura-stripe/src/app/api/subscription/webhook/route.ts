/**
 * /api/subscription/webhook — POST
 *
 * Production-ready Stripe webhook handler.
 *
 * IMPORTANT: This route must receive the raw request body — NOT parsed JSON.
 * In Next.js App Router you need to disable body parsing for this route.
 * Add this to next.config.ts:
 *
 *   export const config = { api: { bodyParser: false } }
 *
 * For App Router, rawBody is available via req.text() — already handled below.
 *
 * Setup checklist:
 * 1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
 * 2. Run: stripe listen --forward-to localhost:3000/api/subscription/webhook
 * 3. Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET in .env.local
 * 4. In production: add the endpoint in Stripe Dashboard → Webhooks
 *    Events to listen for:
 *      - checkout.session.completed
 *      - customer.subscription.created
 *      - customer.subscription.deleted
 *      - invoice.payment_succeeded
 *      - invoice.payment_failed
 */

import { NextRequest, NextResponse } from 'next/server'
import { parseStripeWebhook, applyWebhookResult } from '@/services/stripeService'
import { trackEvent } from '@/services/analyticsService'

// Disable Next.js body parsing — Stripe needs the raw body for signature verification
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const rawBody  = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    console.error('[webhook] Missing stripe-signature header')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let result

  try {
    result = await parseStripeWebhook(rawBody, signature)
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err)
    // Return 400 so Stripe retries — don't return 200 on failure
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Not an event we handle — acknowledge receipt so Stripe doesn't retry
  if (!result) {
    return NextResponse.json({ received: true })
  }

  try {
    // Apply DB changes atomically
    await applyWebhookResult(result)

    // Fire analytics event (non-blocking — don't fail webhook on analytics error)
    trackEvent(result.userId, webhookTypeToAnalyticsEvent(result.type), {
      amount: result.amount,
      source: 'stripe',
    }).catch(err => console.error('[webhook analytics]', err))

    console.log(`[webhook] ✓ ${result.type} for user ${result.userId}`)
    return NextResponse.json({ received: true })

  } catch (err) {
    console.error(`[webhook] Failed to apply ${result.type}:`, err)
    // Return 500 so Stripe retries — important for reliability
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

function webhookTypeToAnalyticsEvent(type: string): string {
  const map: Record<string, string> = {
    unlock:                 'unlock_purchased',
    subscription_started:   'subscription_started',
    subscription_renewed:   'subscription_renewed',
    subscription_cancelled: 'subscription_cancelled',
    payment_failed:         'payment_failed',
  }
  return map[type] ?? type
}
