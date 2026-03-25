# Futura MVP — 72-Hour Build Sprint

Complete tactical build order. Follow this sequence exactly.
Each block has a clear exit condition — don't move on until it's met.

---

## BEFORE YOU START (30 min)

Set up accounts and keys first. Do not skip this — blocked on keys mid-sprint kills momentum.

### Accounts to create
- [ ] Supabase project (supabase.com) — free tier is fine for MVP
- [ ] OpenAI API key (platform.openai.com) — add $20 credit
- [ ] Stripe account (stripe.com) — test mode only to start
- [ ] PostHog project (posthog.com) — free tier
- [ ] Vercel account (vercel.com) — free tier

### Keys to collect into .env.local
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...         ← get from stripe listen CLI command
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_UNLOCK_PRICE_ID=price_...
STRIPE_SUBSCRIPTION_PRICE_ID=price_...
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Exit condition
All env vars populated. `echo $OPENAI_API_KEY` returns a value. Move on.

---

## HOUR 0–2 — Repo + Project Shell

### Tasks
```bash
npx create-next-app@latest futura --typescript --tailwind --app
cd futura
npm install @supabase/supabase-js @supabase/ssr openai stripe zustand posthog-js
```

- [ ] Copy `package.json` from Phase 2 deliverables
- [ ] Create folder structure from ARCHITECTURE.md Section 3
- [ ] Copy `globals.css` from Phase 3 deliverables
- [ ] Copy `layout.tsx` from Phase 3 deliverables
- [ ] Copy `src/store/index.ts` from Phase 3 deliverables
- [ ] Copy both Supabase client files (`src/lib/supabase/client.ts` and `server.ts`)
- [ ] Add `.env.local` with all keys
- [ ] Add `.env.example` (copy without values)
- [ ] Add `.gitignore` entry for `.env.local`

### Exit condition
`npm run dev` starts without errors. `localhost:3000` loads (blank page is fine). Move on.

---

## HOUR 2–4 — Database

### Tasks
- [ ] Open Supabase Dashboard → SQL Editor
- [ ] Paste and run `schema.sql` from Phase 1 deliverables
- [ ] Verify all 8 tables exist in Table Editor:
  - `users`, `user_profiles`, `readings`, `chat_sessions`
  - `chat_messages`, `user_insights_memory`, `monetization_events`
  - `used_blocks`, `analytics_events`
- [ ] Verify RLS is enabled on all tables (green lock icon)
- [ ] Verify 3 RPC functions exist: `handle_unlock_purchase`, `handle_subscription_started`, `handle_subscription_cancelled`
- [ ] Enable Anonymous Auth in Supabase: Authentication → Providers → Anonymous → Enable

### Exit condition
All tables exist. RLS enabled. Anonymous auth on. Move on.

---

## HOUR 4–8 — Session + Profile API Routes

### Tasks
- [ ] Copy `profileNormalizationService.ts` → `src/services/`
- [ ] Create `src/app/api/session/create/route.ts`
- [ ] Create `src/app/api/profile/create/route.ts`

### Test each route with curl
```bash
# Test session create
curl -X POST http://localhost:3000/api/session/create
# Expected: { userId: "uuid", guestId: "uuid" }

# Test profile create (use userId from above)
curl -X POST http://localhost:3000/api/profile/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "focusArea": "love",
    "currentState": "feeling_stuck",
    "personalityTrait": "overthink_decisions",
    "ageBand": "25-34"
  }'
# Expected: { profile: { core_pattern: "mental_overprocessing", ... } }
```

- [ ] Verify rows appear in Supabase `users` and `user_profiles` tables

### Exit condition
Both curl commands return expected JSON. Rows in DB. Move on.

---

## HOUR 8–12 — Reading Engine API

### Tasks
- [ ] Copy `readingBlockService.ts` → `src/services/`
- [ ] Copy `readingCompositionService.ts` → `src/services/`
- [ ] Copy all 3 prompt files → `src/lib/prompts/`
- [ ] Copy `aiService.ts` → `src/services/`
- [ ] Create `src/app/api/reading/generate/route.ts`
- [ ] Create `src/app/api/reading/latest/route.ts`

### Test reading generation
```bash
curl -X POST http://localhost:3000/api/reading/generate \
  -H "Content-Type: application/json" \
  -d '{ "userId": "YOUR_USER_ID" }'
# Expected: { reading: { teaser_text: "...", cut_line: "...", locked_text: "..." } }

curl "http://localhost:3000/api/reading/latest?userId=YOUR_USER_ID"
# Expected: reading object with teaserText, cutLine (lockedText null = correct, not unlocked yet)
```

- [ ] Read the generated reading. Does it feel personal and non-generic?
- [ ] If quality is low, tweak temperature in `aiService.ts` (try 0.65–0.80)

### Exit condition
Reading generates in <8 seconds. Quality passes the "would I screenshot this?" test. Move on.

---

## HOUR 12–20 — Frontend: Landing + Onboarding

### Tasks
- [ ] Copy `src/components/shared/index.tsx` from Phase 3
- [ ] Copy `src/app/page.tsx` (Landing) from Phase 3
- [ ] Copy `src/app/onboarding/page.tsx` from Phase 3
- [ ] Copy `src/app/generating/page.tsx` from Phase 3

### Manual test flow
1. Open `localhost:3000`
2. Click "Begin your reading"
3. Upload a palm photo (or skip)
4. Answer all 4 questions
5. Hit submit on final question
6. Verify redirect to `/generating`
7. Verify redirect to `/reading` after animation

- [ ] Supabase: `user_profiles` row has all 5 normalized fields populated
- [ ] Supabase: `readings` row exists with teaser + locked text
- [ ] Mobile view (Chrome DevTools → phone) looks correct at 390px width

### Exit condition
Full onboarding flow works end-to-end on mobile viewport. Profile + reading in DB. Move on.

---

## HOUR 20–26 — Frontend: Reading Screen

### Tasks
- [ ] Copy `src/app/reading/page.tsx` from Phase 3
- [ ] Verify teaser paragraphs render with stagger animation
- [ ] Verify cut line is blurred/faded correctly
- [ ] Verify sticky CTA appears on scroll
- [ ] Verify "Unlock your full insight" CTA routes to `/unlock`

### Edge cases to check
- [ ] What happens if reading hasn't generated yet? (Loading state)
- [ ] What if userId is missing from store? (Should redirect to `/`)

### Exit condition
Reading screen renders correctly on mobile. Blur effect works. Scroll CTA appears. Move on.

---

## HOUR 26–34 — Stripe: Paywall + Checkout

### Tasks
- [ ] Copy `stripeService.ts` (Phase 5 version) → `src/services/`
- [ ] Copy `src/app/api/unlock/route.ts` from Phase 5
- [ ] Copy `src/app/api/subscription/webhook/route.ts` from Phase 5
- [ ] Copy `src/app/unlock/page.tsx` from Phase 3

### Start Stripe CLI (keep running)
```bash
stripe listen --forward-to localhost:3000/api/subscription/webhook
# Copy the whsec_... key → STRIPE_WEBHOOK_SECRET in .env.local
```

### Create Stripe products (if not done)
1. Stripe Dashboard → Products → Add product
2. "Reading Unlock" → One-time → $4.99 → copy Price ID
3. "Monthly Guidance" → Recurring/Monthly → $9.99 → copy Price ID

### Test checkout flow
1. Click "Unlock your full insight" on reading screen
2. Complete Stripe test checkout: `4242 4242 4242 4242` / any future date / any CVC
3. Verify redirect to `/full-reading?unlocked=true`
4. Check Supabase: `users.unlock_status = true`, `remaining_chat_messages = 10`
5. Check Supabase: `monetization_events` row with `unlock_purchased`

- [ ] Test decline card: `4000 0000 0000 9995` — verify graceful error
- [ ] Test 3DS card: `4000 0025 0000 3155` — verify auth flow works

### Exit condition
Full purchase → webhook → DB update flow verified. Supabase shows correct unlock state. Move on.

---

## HOUR 34–40 — Frontend: Full Reading + Chat Setup

### Tasks
- [ ] Copy `src/app/full-reading/page.tsx` from Phase 3
- [ ] Copy `usePaywall.ts` hook from Phase 5 → `src/hooks/`
- [ ] Wire `usePaywall()` into `full-reading/page.tsx` to sync state after Stripe redirect
- [ ] Verify locked text renders after unlock
- [ ] Verify "Ask your advisor →" CTA routes to `/chat`

### Exit condition
After unlock, full reading displays both teaser + locked text. Routing to chat works. Move on.

---

## HOUR 40–52 — Chat Advisor

### Tasks
- [ ] Copy `chatAdvisorService.ts` → `src/services/` (or use unified `aiService.ts`)
- [ ] Copy `paywallTriggerService.ts` → `src/services/`
- [ ] Copy `memoryService.ts` logic into `stripeService.ts` or standalone file
- [ ] Create `src/app/api/chat/send/route.ts` (use the updated version from Phase 4)
- [ ] Copy `src/app/chat/page.tsx` from Phase 3

### Test chat flow
1. Navigate to `/chat` after unlock
2. Send a suggested prompt — verify advisor responds with context-aware message
3. Send 10 messages — verify paywall triggers on message 11
4. Send "tell me more" on message 9 — verify AI intent detection fires paywall early
5. Verify upgrade modal appears

- [ ] Check message quality: does the advisor reference the user's patterns naturally?
- [ ] Check Supabase: `chat_sessions` and `chat_messages` rows being created
- [ ] Check `remaining_chat_messages` decrements correctly in `users` table

### Exit condition
Chat works. Paywall triggers correctly. Context feels personal. Memory writes after 6 messages. Move on.

---

## HOUR 52–58 — Analytics Wiring

### Tasks
- [ ] Copy `analyticsService.ts` → `src/services/`
- [ ] Copy `useAnalytics.ts` → `src/hooks/`
- [ ] Create `src/app/api/analytics/track/route.ts` (expose `POST_ANALYTICS_TRACK` from analyticsService)
- [ ] Add `useAnalytics()` to each page and wire events per the wiring guide in Phase 5

### Events to verify firing (check PostHog Live Events or Supabase analytics_events table)
- [ ] `app_opened` — Landing page mount
- [ ] `onboarding_started` — CTA click on landing
- [ ] `palm_uploaded` or `palm_skipped`
- [ ] `question_answered` × 4
- [ ] `onboarding_completed`
- [ ] `reading_generated` (server-side)
- [ ] `teaser_viewed`
- [ ] `unlock_paywall_viewed`
- [ ] `unlock_purchased` (server-side via webhook)
- [ ] `full_reading_viewed`
- [ ] `chat_started`
- [ ] `chat_message_sent` × N
- [ ] `chat_paywall_hit`

### Exit condition
All 13 events appear in PostHog or Supabase analytics_events within 60 seconds of triggering. Move on.

---

## HOUR 58–64 — End-to-End Smoke Test

Run the complete flow twice: once as a free user, once as a paying user.

### Free user flow
1. Fresh incognito window → `localhost:3000`
2. Complete full onboarding (upload palm, answer all 4 questions)
3. Read teaser on `/reading`
4. Click unlock → immediately cancel checkout
5. Return to reading — verify still locked
6. Navigate to `/chat` directly — verify only 2 messages available
7. Send 2 messages — verify paywall triggers on 3rd

### Paying user flow
1. Fresh incognito window → `localhost:3000`
2. Complete onboarding
3. Click unlock → complete purchase with test card
4. Verify redirect to full reading
5. Read full reading (teaser + locked)
6. Click "Ask your advisor"
7. Send 10 messages — verify counter shows correctly
8. Send high-intent message on message 8 — verify upgrade modal appears

### Things to verify
- [ ] Page transitions feel smooth on mobile
- [ ] Loading states show on all async operations
- [ ] No console errors in any flow
- [ ] All Supabase rows are correct after each flow
- [ ] PostHog/analytics shows both flows distinctly

### Exit condition
Both flows complete without errors. DB state is clean and correct. Move on.

---

## HOUR 64–68 — Deploy to Vercel + Supabase Production

### Supabase production
- [ ] Create a new Supabase project (production)
- [ ] Run `schema.sql` in the new project's SQL Editor
- [ ] Enable Anonymous Auth on production project
- [ ] Copy production Supabase URL + keys

### Stripe production setup
- [ ] In Stripe Dashboard: switch to Live mode
- [ ] Create same two products in live mode, copy live Price IDs
- [ ] Copy live API keys
- [ ] Add webhook endpoint in Stripe: `https://your-domain.vercel.app/api/subscription/webhook`
- [ ] Select same 5 events, copy live webhook signing secret

### Vercel deploy
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts, then add environment variables:
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# ... add all env vars
```

Or use Vercel Dashboard → Project → Settings → Environment Variables

- [ ] Add ALL env vars to Vercel (production values)
- [ ] Set `NEXT_PUBLIC_APP_URL` to your actual Vercel domain
- [ ] Deploy: `vercel --prod`

### Smoke test production
- [ ] Complete full paying user flow on production URL
- [ ] Verify Stripe live webhook fires and DB updates
- [ ] Verify reading generates in production

### Exit condition
Production URL is live. Full paying flow works on production. Move on.

---

## HOUR 68–72 — Final Polish + Launch Checklist

### UX fixes (common things to catch)
- [ ] Test on real iPhone (not just Chrome DevTools) — scroll inertia feels right
- [ ] Test on Android if possible
- [ ] Check all font loading (Cormorant + Outfit from Google Fonts)
- [ ] Check all images/palm upload on mobile camera
- [ ] Verify Stripe Checkout mobile experience
- [ ] Check dark mode consistency on iOS Safari

### Content review
- [ ] Read 3 generated readings — any quality issues? Adjust prompts if needed
- [ ] Send 10 chat messages — does the advisor feel personal?
- [ ] Read all UI copy — any typos or awkward phrasing?
- [ ] Check all button labels match the premium language spec (no "buy credits" etc.)

### Pre-launch checklist
- [ ] Favicon is set
- [ ] og:image is set (for link sharing)
- [ ] `NEXT_PUBLIC_APP_URL` is production domain (not localhost)
- [ ] Stripe is in live mode with live keys
- [ ] Supabase RLS confirmed enabled on production
- [ ] No `console.log()` statements with sensitive data
- [ ] PostHog receiving events from production
- [ ] Error boundaries added to key screens (optional but good)
- [ ] Custom domain set up on Vercel (if you have one)

### Stripe test in live mode
- [ ] Make one real $4.99 purchase to verify live mode works
- [ ] Immediately refund it in Stripe Dashboard
- [ ] Confirm webhook fired and DB updated

### Exit condition
You've bought and refunded your own product in live mode. All checklist items done.

---

## POST-LAUNCH (First 48 hours)

### Watch these numbers daily
| Metric | Target | Where to check |
|---|---|---|
| Onboarding completion rate | >65% | PostHog funnel |
| Teaser → paywall view rate | >50% | PostHog funnel |
| Paywall → purchase rate | >6% | PostHog funnel |
| Average chat messages per session | >4 | Supabase query |
| Reading quality complaints | 0 | User feedback |

### Supabase queries to run daily
```sql
-- Today's signups
SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '24 hours';

-- Today's conversions
SELECT event_type, COUNT(*), SUM(event_value)
FROM monetization_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type;

-- Paywall hit rate
SELECT
  COUNT(*) FILTER (WHERE event_name = 'chat_paywall_hit') AS paywall_hits,
  COUNT(*) FILTER (WHERE event_name = 'chat_started') AS chat_starts,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event_name = 'chat_paywall_hit')
    / NULLIF(COUNT(*) FILTER (WHERE event_name = 'chat_started'), 0), 1
  ) AS hit_rate_pct
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Drop-off point in onboarding
SELECT event_name, COUNT(*)
FROM analytics_events
WHERE event_name IN (
  'onboarding_started', 'palm_uploaded', 'palm_skipped',
  'onboarding_completed', 'reading_generated'
)
GROUP BY event_name ORDER BY COUNT(*) DESC;
```

### First iteration priorities (based on data)
- Low onboarding completion → simplify questions or make palm upload optional by default
- Low paywall conversion → test lower price ($2.99 unlock), adjust paywall copy
- Low chat engagement → improve opening advisor message, add more suggested prompts
- Reading quality feedback → tune AI temperature, adjust block selection

---

## QUICK REFERENCE

### File assembly map

| What to build | Source file | Destination |
|---|---|---|
| DB schema | Phase 1: `schema.sql` | Supabase SQL Editor |
| Architecture | Phase 1: `ARCHITECTURE.md` | Reference only |
| Profile service | Phase 2: `profileNormalizationService.ts` | `src/services/` |
| Reading services | Phase 2: `readingBlockService.ts`, `readingCompositionService.ts` | `src/services/` |
| AI polish service | Phase 2: `aiPolishService.ts` | `src/services/` (or use Phase 4 `aiService.ts`) |
| Chat service | Phase 2: `chatAdvisorService.ts` | `src/services/` (or use Phase 4 `aiService.ts`) |
| Paywall service | Phase 2: `stripeService.ts` (paywallTriggerService section) | `src/services/` |
| All API routes | Phase 2: `routes.ts` | Split into individual `route.ts` files per path |
| Stripe service | Phase 5: `stripeService.ts` (replaces Phase 2 version) | `src/services/` |
| Analytics service | Phase 5: `analyticsService.ts` | `src/services/` |
| Prompt templates | Phase 4: `readingPrompt.ts`, `advisorPrompt.ts`, `polishPrompt.ts` | `src/lib/prompts/` |
| AI service layer | Phase 4: `aiService.ts` | `src/services/` |
| Global CSS | Phase 3: `globals.css` | `src/app/` |
| Shared components | Phase 3: `components/shared/index.tsx` | `src/components/shared/` |
| Zustand store | Phase 3: `store/index.ts` | `src/store/` |
| All page screens | Phase 3: each `page.tsx` | `src/app/[route]/` |
| Paywall hook | Phase 5: `usePaywall.ts` | `src/hooks/` |
| Analytics hook | Phase 5: `useAnalytics.ts` | `src/hooks/` |
| Prompt test | Phase 4: `promptTest.ts` | `src/lib/prompts/` (dev only) |
| Setup guide | Phase 5: `STRIPE_AND_ANALYTICS_SETUP.ts` | Reference only |

### When the AI service is too slow
- Switch reading generation to use block system only (skip AI polish in dev)
- Use `gpt-4o-mini` for all calls during development — switch to `gpt-4o` before launch
- Cache the reading after first generation — never regenerate for the same user

### When you hit a Supabase RLS error
- The client is trying to access data it doesn't own
- Check that the user's `guest_id` matches `auth.uid()` in Supabase
- Use the service role key for server-side operations, never the anon key

### When Stripe webhooks aren't firing locally
- Make sure `stripe listen` is running in a separate terminal
- The `STRIPE_WEBHOOK_SECRET` must match the one from `stripe listen` output (not the dashboard)
- Check the Stripe CLI terminal for event logs and error details
