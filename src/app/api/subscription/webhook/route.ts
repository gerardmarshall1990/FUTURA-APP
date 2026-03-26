import { NextRequest, NextResponse } from 'next/server'
import { parseStripeWebhook, applyWebhookResult } from '@/services/stripeService'
import { trackEvent } from '@/services/analyticsService'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const rawBody   = await req.text()
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
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (!result) {
    return NextResponse.json({ received: true })
  }

  try {
    await applyWebhookResult(result)

    trackEvent(result.userId, webhookTypeToAnalyticsEvent(result.type), {
      amount: result.amount,
      source: 'stripe',
    }).catch(err => console.error('[webhook analytics]', err))

    console.log(`[webhook] ✓ ${result.type} for user ${result.userId}`)
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error(`[webhook] Failed to apply ${result.type}:`, err)
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
