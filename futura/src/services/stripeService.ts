/**
 * paywallTriggerService
 *
 * Detects high-intent messages that should trigger the upgrade modal,
 * even before the user runs out of free messages.
 */

const HIGH_INTENT_PATTERNS = [
  /tell me more/i,
  /what happens next/i,
  /what should i do/i,
  /is this about my/i,
  /when (is|will) this/i,
  /go deeper/i,
  /more detail/i,
  /explain (more|further|this)/i,
  /what does (this|that) mean/i,
  /how (do|can|should) i/i,
  /what('s| is) (coming|next|ahead)/i,
  /be more specific/i,
  /deeper (reading|insight|guidance)/i,
]

export function isHighIntentMessage(message: string): boolean {
  return HIGH_INTENT_PATTERNS.some(pattern => pattern.test(message))
}

export function shouldTriggerPaywall(
  remainingMessages: number,
  message: string,
  isUnlocked: boolean,
  isSubscribed: boolean
): boolean {
  if (isSubscribed) return false
  if (remainingMessages <= 0) return true
  if (!isUnlocked && isHighIntentMessage(message)) return true
  return false
}

// ─── Memory Service ──────────────────────────────────────────────────────────

/**
 * memoryService
 *
 * Writes lightweight memory themes from chat and reading interactions.
 * Simple in MVP — grows into the foundation for daily insights in Phase 2.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function writeMemoryTheme(
  userId: string,
  keyTheme: string,
  description: string,
  source: 'onboarding' | 'chat' | 'reading'
): Promise<void> {
  // Upsert — don't duplicate themes, just update description
  await supabaseAdmin
    .from('user_insights_memory')
    .upsert(
      { user_id: userId, key_theme: keyTheme, description, source },
      { onConflict: 'user_id,key_theme', ignoreDuplicates: false }
    )
}

export async function seedMemoryFromOnboarding(
  userId: string,
  focusArea: string,
  personalityTrait: string,
  currentState: string
): Promise<void> {
  const themes = [
    {
      key_theme: `focus_${focusArea}`,
      description: `User's primary focus area is ${focusArea.replace('_', ' ')}`,
      source: 'onboarding' as const,
    },
    {
      key_theme: `trait_${personalityTrait}`,
      description: `User identifies with: ${personalityTrait.replace(/_/g, ' ')}`,
      source: 'onboarding' as const,
    },
    {
      key_theme: `state_${currentState}`,
      description: `User's current state: ${currentState.replace(/_/g, ' ')}`,
      source: 'onboarding' as const,
    },
  ]

  await Promise.all(
    themes.map(t =>
      writeMemoryTheme(userId, t.key_theme, t.description, t.source)
    )
  )
}

// ─── Stripe Service ──────────────────────────────────────────────────────────

/**
 * stripeService
 *
 * Creates Stripe Checkout sessions for one-time unlock and subscription.
 * Webhook handling is in the route handler — this service only creates sessions.
 */

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export async function createUnlockCheckoutSession(
  userId: string,
  userEmail?: string
): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: userEmail,
    line_items: [
      {
        price: process.env.STRIPE_UNLOCK_PRICE_ID!,
        quantity: 1,
      },
    ],
    metadata: { userId, type: 'unlock' },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/full-reading?unlocked=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/unlock?cancelled=true`,
  })

  return session.url!
}

export async function createSubscriptionCheckoutSession(
  userId: string,
  userEmail?: string
): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: userEmail,
    line_items: [
      {
        price: process.env.STRIPE_SUBSCRIPTION_PRICE_ID!,
        quantity: 1,
      },
    ],
    metadata: { userId, type: 'subscription' },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/chat?subscribed=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/chat?cancelled=true`,
  })

  return session.url!
}

export async function handleStripeWebhook(
  body: string,
  signature: string
): Promise<{ userId: string; type: string; amount: number } | null> {
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    throw new Error('Invalid Stripe webhook signature')
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.userId
    const type = session.metadata?.type

    if (!userId || !type) return null

    const amount = (session.amount_total ?? 0) / 100

    return { userId, type, amount }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    // Look up user by stripe_customer_id
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('stripe_customer_id', subscription.customer as string)
      .single()

    if (user) {
      return { userId: user.id, type: 'subscription_cancelled', amount: 0 }
    }
  }

  return null
}
