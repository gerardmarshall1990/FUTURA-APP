/**
 * ANALYTICS WIRING GUIDE
 * ──────────────────────
 * Add these calls to each screen. Import useAnalytics + EVENT_NAMES.
 * Each screen has page view + key interaction events.
 */

// ─── Landing Page ─────────────────────────────────────────────────────────────
/*
useEffect(() => { page('Landing') }, [])
onClick CTA: track(EVENT_NAMES.ONBOARDING_STARTED)
*/

// ─── Onboarding — Palm Upload ─────────────────────────────────────────────────
/*
useEffect(() => { page('Palm Upload') }, [])
on file selected:  track(EVENT_NAMES.PALM_UPLOADED, { method: 'camera' | 'upload' })
on skip:           track(EVENT_NAMES.PALM_SKIPPED)
*/

// ─── Onboarding — Each Question ───────────────────────────────────────────────
/*
on option selected: track(EVENT_NAMES.QUESTION_ANSWERED, {
  question_id: 'focusArea' | 'currentState' | 'personalityTrait' | 'ageBand',
  answer: selectedValue,
  step: stepNumber,
})
on final submit:  track(EVENT_NAMES.ONBOARDING_COMPLETED, {
  focus_area: store.focusArea,
  current_state: store.currentState,
  personality_trait: store.personalityTrait,
  age_band: store.ageBand,
})
*/

// ─── Reading Page ─────────────────────────────────────────────────────────────
/*
useEffect(() => {
  page('Reading')
  track(EVENT_NAMES.TEASER_VIEWED, { focus_area: profile.focusArea })
}, [])
on scroll past 80%: track(EVENT_NAMES.TEASER_SCROLLED, { depth: '80%' })
on unlock CTA click: track(EVENT_NAMES.UNLOCK_PAYWALL_VIEWED)
*/

// ─── Unlock Page ──────────────────────────────────────────────────────────────
/*
useEffect(() => { page('Unlock') }, [])
on plan toggle:    track('plan_selected', { plan: selected })
on purchase click: track(EVENT_NAMES.UNLOCK_PAYWALL_VIEWED, { plan: selected })
(conversion tracked server-side via webhook)
*/

// ─── Full Reading Page ────────────────────────────────────────────────────────
/*
useEffect(() => {
  page('Full Reading')
  track(EVENT_NAMES.FULL_READING_VIEWED)
}, [])
*/

// ─── Chat Page ────────────────────────────────────────────────────────────────
/*
useEffect(() => {
  page('Chat')
  track(EVENT_NAMES.CHAT_STARTED, { is_unlocked: isUnlocked })
}, [])
on message sent:      track(EVENT_NAMES.CHAT_MESSAGE_SENT, { remaining: remainingMessages })
on paywall triggered: track(EVENT_NAMES.CHAT_PAYWALL_HIT, { message_count: history.length })
on upgrade modal:     track(EVENT_NAMES.UPGRADE_MODAL_SHOWN)
on modal dismissed:   track(EVENT_NAMES.UPGRADE_MODAL_DISMISSED)
*/

export {}


/**
 * STRIPE SETUP GUIDE
 * ──────────────────
 * Step-by-step to get Stripe working end-to-end in local dev and production.
 */

/*
──────────────────────────────────────────────────────────────────────────────
1. STRIPE DASHBOARD SETUP
──────────────────────────────────────────────────────────────────────────────

a. Create a Stripe account at stripe.com

b. In Test mode, create two Products:

   Product 1: "Futura Reading Unlock"
   - Type: One-time
   - Price: $4.99 (or $7.99)
   - Copy the Price ID → STRIPE_UNLOCK_PRICE_ID

   Product 2: "Futura Monthly Guidance"
   - Type: Recurring / Monthly
   - Price: $9.99 (or $14.99)
   - Copy the Price ID → STRIPE_SUBSCRIPTION_PRICE_ID

c. Get your API keys:
   - Publishable key → NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
   - Secret key → STRIPE_SECRET_KEY

──────────────────────────────────────────────────────────────────────────────
2. LOCAL WEBHOOK SETUP (Stripe CLI)
──────────────────────────────────────────────────────────────────────────────

Install Stripe CLI:
  brew install stripe/stripe-cli/stripe

Login:
  stripe login

Forward webhooks to local server:
  stripe listen --forward-to localhost:3000/api/subscription/webhook

Copy the webhook signing secret that appears:
  → STRIPE_WEBHOOK_SECRET=whsec_...

Keep this terminal window open while developing.

Test a purchase flow:
  stripe trigger checkout.session.completed

──────────────────────────────────────────────────────────────────────────────
3. PRODUCTION WEBHOOK SETUP
──────────────────────────────────────────────────────────────────────────────

In Stripe Dashboard → Developers → Webhooks:

a. Add endpoint:
   URL: https://your-domain.com/api/subscription/webhook
   Version: Latest

b. Select events:
   ✓ checkout.session.completed
   ✓ customer.subscription.created
   ✓ customer.subscription.deleted
   ✓ invoice.payment_succeeded
   ✓ invoice.payment_failed

c. Copy signing secret → STRIPE_WEBHOOK_SECRET (prod env var)

──────────────────────────────────────────────────────────────────────────────
4. ENV VARS SUMMARY
──────────────────────────────────────────────────────────────────────────────

# .env.local
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_UNLOCK_PRICE_ID=price_...
STRIPE_SUBSCRIPTION_PRICE_ID=price_...

# Production (.env.production or Vercel dashboard)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (different from test)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_UNLOCK_PRICE_ID=price_... (live mode price)
STRIPE_SUBSCRIPTION_PRICE_ID=price_... (live mode price)

──────────────────────────────────────────────────────────────────────────────
5. POSTHOG SETUP
──────────────────────────────────────────────────────────────────────────────

a. Create account at posthog.com (free tier is generous)

b. Create a new project → copy the API key

c. Add to env:
   NEXT_PUBLIC_POSTHOG_KEY=phc_...
   NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

d. Key funnels to set up in PostHog:
   - Onboarding funnel: app_opened → onboarding_started → onboarding_completed
   - Conversion funnel: teaser_viewed → unlock_paywall_viewed → unlock_purchased
   - Chat funnel: chat_started → chat_message_sent → subscription_started

e. Key metrics to watch:
   - Onboarding completion rate (target: >70%)
   - Teaser → paywall view rate (target: >60%)
   - Paywall → purchase rate (target: >8%)
   - Chat engagement before paywall hit

──────────────────────────────────────────────────────────────────────────────
6. VERIFY END-TO-END FLOW
──────────────────────────────────────────────────────────────────────────────

Test this sequence manually before launch:

1. Open app → complete onboarding
2. Read teaser → click unlock
3. Complete Stripe test checkout (card: 4242 4242 4242 4242)
4. Verify redirect to /full-reading?unlocked=true
5. Check Supabase users table: unlock_status = true, remaining_chat_messages = 10
6. Check Supabase monetization_events: unlock_purchased row present
7. Open chat → send 10 messages → verify paywall triggers
8. Verify PostHog received all events

Stripe test cards:
  Success:         4242 4242 4242 4242
  Requires auth:   4000 0025 0000 3155
  Decline:         4000 0000 0000 9995
*/
