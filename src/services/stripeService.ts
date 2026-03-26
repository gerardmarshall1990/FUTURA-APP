import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
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

export interface PaywallStatus {
  canChat: boolean
  canViewFullReading: boolean
  remainingMessages: number
  isUnlocked: boolean
  isSubscribed: boolean
  reason?: 'no_messages' | 'not_unlocked' | 'subscription_lapsed'
}

// ─── Customer Management ──────────────────────────────────────────────────────

export async function getOrCreateStripeCustomer(userId: string, email?: string): Promise<string> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('stripe_customer_id, email')
    .eq('id', userId)
    .single()

  if (user?.stripe_customer_id) return user.stripe_customer_id

  const customer = await stripe.customers.create({
    email: email ?? user?.email ?? undefined,
    metadata: { futura_user_id: userId },
  })

  await supabaseAdmin.from('users').update({ stripe_customer_id: customer.id }).eq('id', userId)

  return customer.id
}

// ─── Checkout Sessions ────────────────────────────────────────────────────────

export async function createUnlockCheckoutSession(
  userId: string,
  email?: string
): Promise<CheckoutSessionResult> {
  const customerId = await getOrCreateStripeCustomer(userId, email)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: process.env.STRIPE_UNLOCK_PRICE_ID!, quantity: 1 }],
    metadata: { futura_user_id: userId, type: 'unlock' },
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
    line_items: [{ price: process.env.STRIPE_SUBSCRIPTION_PRICE_ID!, quantity: 1 }],
    metadata: { futura_user_id: userId, type: 'subscription' },
    subscription_data: { metadata: { futura_user_id: userId }, trial_period_days: 0 },
    allow_promotion_codes: true,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/chat?subscribed=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/unlock?cancelled=true`,
  })

  return { url: session.url!, sessionId: session.id }
}

// ─── Webhook Parsing ──────────────────────────────────────────────────────────

export async function parseStripeWebhook(
  rawBody: string,
  signature: string
): Promise<WebhookResult | null> {
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${(err as Error).message}`)
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.futura_user_id
      const type   = session.metadata?.type
      if (!userId) return null
      if (type === 'unlock' && session.payment_status === 'paid') {
        return { userId, type: 'unlock', amount: (session.amount_total ?? 0) / 100, stripeCustomerId: session.customer as string, metadata: { session_id: session.id } }
      }
      return null
    }
    case 'customer.subscription.created': {
      const sub = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.futura_user_id ?? await getCustomerUserId(sub.customer as string)
      if (!userId) return null
      return { userId, type: 'subscription_started', amount: getSubscriptionAmount(sub), stripeCustomerId: sub.customer as string }
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      if (invoice.billing_reason !== 'subscription_cycle') return null
      const userId = await getCustomerUserId(invoice.customer as string)
      if (!userId) return null
      return { userId, type: 'subscription_renewed', amount: (invoice.amount_paid ?? 0) / 100, stripeCustomerId: invoice.customer as string }
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.futura_user_id ?? await getCustomerUserId(sub.customer as string)
      if (!userId) return null
      return { userId, type: 'subscription_cancelled', amount: 0, stripeCustomerId: sub.customer as string }
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const userId = await getCustomerUserId(invoice.customer as string)
      if (!userId) return null
      return { userId, type: 'payment_failed', amount: 0, stripeCustomerId: invoice.customer as string }
    }
    default:
      return null
  }
}

// ─── Database Sync ────────────────────────────────────────────────────────────

export async function applyWebhookResult(result: WebhookResult): Promise<void> {
  switch (result.type) {
    case 'unlock':
      await supabaseAdmin.rpc('handle_unlock_purchase', { p_user_id: result.userId, p_amount: result.amount, p_metadata: { source: 'stripe', ...result.metadata } })
      break
    case 'subscription_started':
      if (result.stripeCustomerId) {
        await supabaseAdmin.from('users').update({ stripe_customer_id: result.stripeCustomerId }).eq('id', result.userId)
      }
      await supabaseAdmin.rpc('handle_subscription_started', { p_user_id: result.userId, p_amount: result.amount, p_metadata: { source: 'stripe' } })
      break
    case 'subscription_renewed':
      await supabaseAdmin.from('users').update({ subscription_status: 'active' }).eq('id', result.userId)
      await supabaseAdmin.from('monetization_events').insert({ user_id: result.userId, event_type: 'subscription_renewed', event_value: result.amount, metadata: { source: 'stripe' } })
      break
    case 'subscription_cancelled':
      await supabaseAdmin.rpc('handle_subscription_cancelled', { p_user_id: result.userId })
      break
    case 'payment_failed':
      await supabaseAdmin.from('users').update({ subscription_status: 'past_due' }).eq('id', result.userId)
      await supabaseAdmin.from('monetization_events').insert({ user_id: result.userId, event_type: 'payment_failed', event_value: 0, metadata: { source: 'stripe' } })
      break
  }
}

// ─── Paywall Status ───────────────────────────────────────────────────────────

export async function getPaywallStatus(userId: string): Promise<PaywallStatus> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('unlock_status, subscription_status, remaining_chat_messages')
    .eq('id', userId)
    .single()

  if (!user) {
    return { canChat: false, canViewFullReading: false, remainingMessages: 0, isUnlocked: false, isSubscribed: false, reason: 'not_unlocked' }
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

// ─── Paywall Trigger Logic ────────────────────────────────────────────────────

const HIGH_INTENT_PATTERNS = [
  /tell me more/i, /what happens next/i, /what should i do/i, /is this about my/i,
  /when (is|will) this/i, /go deeper/i, /more detail/i, /explain (more|further|this)/i,
  /what does (this|that) mean/i, /how (do|can|should) i/i, /what('s| is) (coming|next|ahead)/i,
  /be more specific/i, /deeper (reading|insight|guidance)/i,
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

// ─── Memory Service ───────────────────────────────────────────────────────────

export async function writeMemoryTheme(
  userId: string,
  keyTheme: string,
  description: string,
  source: 'onboarding' | 'chat' | 'reading'
): Promise<void> {
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
    { key_theme: `focus_${focusArea}`, description: `User's primary focus area is ${focusArea.replace('_', ' ')}`, source: 'onboarding' as const },
    { key_theme: `trait_${personalityTrait}`, description: `User identifies with: ${personalityTrait.replace(/_/g, ' ')}`, source: 'onboarding' as const },
    { key_theme: `state_${currentState}`, description: `User's current state: ${currentState.replace(/_/g, ' ')}`, source: 'onboarding' as const },
  ]

  await Promise.all(themes.map(t => writeMemoryTheme(userId, t.key_theme, t.description, t.source)))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getCustomerUserId(stripeCustomerId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from('users').select('id').eq('stripe_customer_id', stripeCustomerId).single()
  return data?.id ?? null
}

function getSubscriptionAmount(subscription: Stripe.Subscription): number {
  const item = subscription.items.data[0]
  return item ? (item.price.unit_amount ?? 0) / 100 : 0
}
