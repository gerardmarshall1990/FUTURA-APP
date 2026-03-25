/**
 * stripeService.ts (complete)
 *
 * Full Stripe integration for Futura.
 * Covers: one-time unlock, subscription, webhook processing,
 * customer management, and subscription status sync.
 *
 * Price IDs come from env vars — set these up in your Stripe dashboard:
 *   STRIPE_UNLOCK_PRICE_ID       — one-time payment product ($4.99 or $7.99)
 *   STRIPE_SUBSCRIPTION_PRICE_ID — monthly subscription ($9.99 or $14.99)
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// ─── Clients ──────────────────────────────────────────────────────────────────

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Types ────────────────────────────────────────────────────────────────────

export type CheckoutType = 'unlock' | 'subscription'

export interface CheckoutSessionResult {
  url: string
  sessionId: string
}

export interface WebhookResult {
  userId: string
  type: 'unlock' | 'subscription_started' | 'subscription_cancelled' | 'subscription_renewed' | 'payment_failed'
  amount: number
  stripeCustomerId?: string
  metadata?: Record<string, string>
}

// ─── Customer Management ──────────────────────────────────────────────────────

/**
 * Get or create a Stripe customer for a user.
 * Stores stripe_customer_id in users table for future lookups.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email?: string
): Promise<string> {
  // Check if user already has a Stripe customer ID
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('stripe_customer_id, email')
    .eq('id', userId)
    .single()

  if (user?.stripe_customer_id) {
    return user.stripe_customer_id
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: email ?? user?.email ?? undefined,
    metadata: { futura_user_id: userId },
  })

  // Store customer ID
  await supabaseAdmin
    .from('users')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId)

  return customer.id
}

// ─── Checkout Session Builders ────────────────────────────────────────────────

export async function createUnlockCheckoutSession(
  userId: string,
  email?: string
): Promise<CheckoutSessionResult> {
  const customerId = await getOrCreateStripeCustomer(userId, email)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: process.env.STRIPE_UNLOCK_PRICE_ID!,
        quantity: 1,
      },
    ],
    metadata: {
      futura_user_id: userId,
      type: 'unlock',
    },
    // Allow promo codes for future marketing campaigns
    allow_promotion_codes: true,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/full-reading?unlocked=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/unlock?cancelled=true`,
  })

  return { url: session.url!, sessionId: session.id }
}

export async function createSubscriptionCheckoutSession(
  userId: string,
  email?: string
): Promise<CheckoutSessionResult> {
  const customerId = await getOrCreateStripeCustomer(userId, email)

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: process.env.STRIPE_SUBSCRIPTION_PRICE_ID!,
        quantity: 1,
      },
    ],
    metadata: {
      futura_user_id: userId,
      type: 'subscription',
    },
    subscription_data: {
      metadata: { futura_user_id: userId },
      trial_period_days: 0, // No trial in MVP — add later for growth
    },
    allow_promotion_codes: true,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/chat?subscribed=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/unlock?cancelled=true`,
  })

  return { url: session.url!, sessionId: session.id }
}

// ─── Webhook Parser ───────────────────────────────────────────────────────────

/**
 * Validates and parses a Stripe webhook event.
 * Returns a normalized WebhookResult or null if the event isn't one we handle.
 */
export async function parseStripeWebhook(
  rawBody: string,
  signature: string
): Promise<WebhookResult | null> {
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${(err as Error).message}`)
  }

  switch (event.type) {

    // ── One-time unlock purchase ─────────────────────────────────────────────
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.futura_user_id
      const type = session.metadata?.type

      if (!userId) return null

      if (type === 'unlock' && session.payment_status === 'paid') {
        return {
          userId,
          type: 'unlock',
          amount: (session.amount_total ?? 0) / 100,
          stripeCustomerId: session.customer as string,
          metadata: { session_id: session.id },
        }
      }

      // Subscription checkout completed — subscription.created handles the actual activation
      if (type === 'subscription') {
        return null // Let customer.subscription.created handle it
      }

      return null
    }

    // ── Subscription created (first payment) ────────────────────────────────
    case 'customer.subscription.created': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.futura_user_id

      if (!userId) {
        // Try to look up via customer ID
        const customer = await getCustomerUserId(subscription.customer as string)
        if (!customer) return null

        return {
          userId: customer,
          type: 'subscription_started',
          amount: getSubscriptionAmount(subscription),
          stripeCustomerId: subscription.customer as string,
        }
      }

      return {
        userId,
        type: 'subscription_started',
        amount: getSubscriptionAmount(subscription),
        stripeCustomerId: subscription.customer as string,
      }
    }

    // ── Subscription renewed ─────────────────────────────────────────────────
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      if (invoice.billing_reason !== 'subscription_cycle') return null

      const userId = await getCustomerUserId(invoice.customer as string)
      if (!userId) return null

      return {
        userId,
        type: 'subscription_renewed',
        amount: (invoice.amount_paid ?? 0) / 100,
        stripeCustomerId: invoice.customer as string,
      }
    }

    // ── Subscription cancelled ───────────────────────────────────────────────
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.futura_user_id
        ?? await getCustomerUserId(subscription.customer as string)

      if (!userId) return null

      return {
        userId,
        type: 'subscription_cancelled',
        amount: 0,
        stripeCustomerId: subscription.customer as string,
      }
    }

    // ── Payment failed ────────────────────────────────────────────────────────
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const userId = await getCustomerUserId(invoice.customer as string)
      if (!userId) return null

      return {
        userId,
        type: 'payment_failed',
        amount: 0,
        stripeCustomerId: invoice.customer as string,
      }
    }

    default:
      return null
  }
}

// ─── Database Sync ────────────────────────────────────────────────────────────

/**
 * Apply a webhook result to the database.
 * Uses Supabase RPC functions defined in the schema for atomicity.
 */
export async function applyWebhookResult(result: WebhookResult): Promise<void> {
  switch (result.type) {

    case 'unlock':
      await supabaseAdmin.rpc('handle_unlock_purchase', {
        p_user_id: result.userId,
        p_amount: result.amount,
        p_metadata: {
          source: 'stripe',
          ...result.metadata,
        },
      })
      break

    case 'subscription_started':
      // Update stripe_customer_id if we have it
      if (result.stripeCustomerId) {
        await supabaseAdmin
          .from('users')
          .update({ stripe_customer_id: result.stripeCustomerId })
          .eq('id', result.userId)
      }
      await supabaseAdmin.rpc('handle_subscription_started', {
        p_user_id: result.userId,
        p_amount: result.amount,
        p_metadata: { source: 'stripe', stripe_customer_id: result.stripeCustomerId },
      })
      break

    case 'subscription_renewed':
      // Re-confirm subscription is active (in case of past_due recovery)
      await supabaseAdmin
        .from('users')
        .update({ subscription_status: 'active' })
        .eq('id', result.userId)
      await supabaseAdmin.from('monetization_events').insert({
        user_id: result.userId,
        event_type: 'subscription_renewed',
        event_value: result.amount,
        metadata: { source: 'stripe' },
      })
      break

    case 'subscription_cancelled':
      await supabaseAdmin.rpc('handle_subscription_cancelled', {
        p_user_id: result.userId,
      })
      break

    case 'payment_failed':
      await supabaseAdmin
        .from('users')
        .update({ subscription_status: 'past_due' })
        .eq('id', result.userId)
      await supabaseAdmin.from('monetization_events').insert({
        user_id: result.userId,
        event_type: 'payment_failed',
        event_value: 0,
        metadata: { source: 'stripe' },
      })
      break
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getCustomerUserId(stripeCustomerId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('stripe_customer_id', stripeCustomerId)
    .single()
  return data?.id ?? null
}

function getSubscriptionAmount(subscription: Stripe.Subscription): number {
  const item = subscription.items.data[0]
  return item ? (item.price.unit_amount ?? 0) / 100 : 0
}

// ─── Paywall Gate (server-side) ───────────────────────────────────────────────

export interface PaywallStatus {
  canChat: boolean
  canViewFullReading: boolean
  remainingMessages: number
  isUnlocked: boolean
  isSubscribed: boolean
  reason?: 'no_messages' | 'not_unlocked' | 'subscription_lapsed'
}

export async function getPaywallStatus(userId: string): Promise<PaywallStatus> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('unlock_status, subscription_status, remaining_chat_messages')
    .eq('id', userId)
    .single()

  if (!user) {
    return {
      canChat: false,
      canViewFullReading: false,
      remainingMessages: 0,
      isUnlocked: false,
      isSubscribed: false,
      reason: 'not_unlocked',
    }
  }

  const isSubscribed = user.subscription_status === 'active'
  const isUnlocked   = user.unlock_status || isSubscribed
  const remaining    = isSubscribed ? 999 : user.remaining_chat_messages

  return {
    canChat: remaining > 0,
    canViewFullReading: isUnlocked,
    remainingMessages: remaining,
    isUnlocked,
    isSubscribed,
    reason: remaining <= 0 ? 'no_messages' : undefined,
  }
}
