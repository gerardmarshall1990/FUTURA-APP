# Futura MVP — Architecture & Build Foundation

## 1. Tech Stack Decision

| Layer | Choice | Rationale |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) + TypeScript + Tailwind CSS | Single codebase for web MVP, SSR for fast first paint, native Stripe support, Vercel deploy in minutes |
| **UI Components** | shadcn/ui (selective) | Polished dialogs, cards, and modals without building from scratch. Only pull what you need. |
| **Backend** | Next.js Route Handlers + service layer | Keeps MVP in one repo. Service layer isolates business logic so you can extract to microservices later without rewriting. |
| **Database / Auth / Storage** | Supabase | Managed Postgres, row-level security, guest sessions via anonymous auth, palm image storage via Supabase Storage — all in one. |
| **AI** | OpenAI API (GPT-4o) | Reading polish, advisor chat. Use `gpt-4o` for quality, `gpt-4o-mini` for high-frequency advisor turns to control cost. |
| **Payments** | Stripe (Checkout + Webhooks) | Fastest path to revenue. Webhooks update `users.subscription_status` and `users.unlock_status` in Supabase. |
| **Analytics** | PostHog (self-hosted or cloud) | Event tracking from day 1. Funnel analysis on onboarding → paywall → conversion is critical. |
| **Deployment** | Vercel (frontend + API) + Supabase cloud | Zero-config deploys. Environment variables via Vercel dashboard. |

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                       │
│   Next.js App Router — Mobile-first, dark premium UI          │
│   State: Zustand or React Context (session + profile + chat)  │
└───────────────────┬──────────────────────────────────────────┘
                    │ HTTPS / fetch
┌───────────────────▼──────────────────────────────────────────┐
│                    API LAYER (Route Handlers)                  │
│  /api/session/create    /api/profile/create                   │
│  /api/reading/generate  /api/reading/latest                   │
│  /api/chat/send         /api/unlock                           │
│  /api/subscription/webhook                                    │
└──────┬─────────────┬──────────────────┬───────────────────────┘
       │             │                  │
┌──────▼──────┐ ┌────▼──────┐  ┌───────▼──────────────────────┐
│  BUSINESS   │ │  PROMPT   │  │        EXTERNAL SERVICES      │
│  SERVICES   │ │ TEMPLATES │  │  OpenAI API  Stripe  PostHog  │
│             │ │           │  └──────────────────────────────┘
│ profileNorm │ │ reading   │
│ readingBlock│ │ advisor   │
│ readingComp │ │ polish    │
│ aiPolish    │ └───────────┘
│ chatAdvisor │
│ paywallTrig │
│ memory      │
│ stripe      │
└──────┬──────┘
       │
┌──────▼───────────────────────────────────────────────────────┐
│                     SUPABASE (Data Layer)                      │
│  Postgres DB  │  Auth (anonymous)  │  Storage (palm images)   │
└──────────────────────────────────────────────────────────────┘
```

### Architectural Principles

- **Identity Layer is the moat.** Every service reads from `user_profiles`. It must be generated on onboarding completion and reused everywhere — readings, chat, future insights.
- **Prompt templates are files, not strings.** Keep all AI prompts in `/src/lib/prompts/` as typed template functions. This makes iteration fast.
- **Paywall state lives in the DB.** `users.unlock_status` and `users.remaining_chat_messages` are the source of truth, not client state.
- **Guest-first.** Use Supabase anonymous auth so users get a session ID immediately without signing up. Email is optional and collected later.

---

## 3. Folder Structure

```
futura/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout (fonts, global styles, providers)
│   │   ├── page.tsx                  # Landing screen
│   │   ├── onboarding/
│   │   │   └── page.tsx              # Palm upload + 4-question flow
│   │   ├── generating/
│   │   │   └── page.tsx              # Animated loading state
│   │   ├── reading/
│   │   │   └── page.tsx              # Teaser reading screen
│   │   ├── unlock/
│   │   │   └── page.tsx              # Paywall screen
│   │   ├── full-reading/
│   │   │   └── page.tsx              # Full reading + CTA to chat
│   │   ├── chat/
│   │   │   └── page.tsx              # Advisor chat screen
│   │   └── api/
│   │       ├── session/
│   │       │   └── create/route.ts
│   │       ├── profile/
│   │       │   └── create/route.ts
│   │       ├── reading/
│   │       │   ├── generate/route.ts
│   │       │   └── latest/route.ts
│   │       ├── chat/
│   │       │   └── send/route.ts
│   │       ├── unlock/
│   │       │   └── route.ts
│   │       └── subscription/
│   │           └── webhook/route.ts
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui primitives (button, card, dialog…)
│   │   ├── onboarding/
│   │   │   ├── PalmUpload.tsx
│   │   │   ├── QuestionCard.tsx
│   │   │   └── ProgressBar.tsx
│   │   ├── reading/
│   │   │   ├── ReadingCard.tsx
│   │   │   ├── BlurredCutLine.tsx
│   │   │   └── GeneratingAnimation.tsx
│   │   ├── paywall/
│   │   │   ├── PaywallScreen.tsx
│   │   │   └── UpgradeModal.tsx
│   │   ├── chat/
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   └── SuggestedPrompts.tsx
│   │   └── shared/
│   │       ├── PremiumButton.tsx
│   │       └── FuturaLogo.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser Supabase client
│   │   │   └── server.ts             # Server Supabase client (Route Handlers)
│   │   ├── openai/
│   │   │   └── client.ts
│   │   ├── stripe/
│   │   │   └── client.ts
│   │   ├── posthog/
│   │   │   └── client.ts
│   │   └── prompts/
│   │       ├── readingPrompt.ts      # Reading generation prompt template
│   │       ├── polishPrompt.ts       # AI polish prompt
│   │       └── advisorPrompt.ts     # Chat advisor system prompt
│   │
│   ├── services/                     # Business logic — pure functions, no HTTP
│   │   ├── profileNormalizationService.ts
│   │   ├── readingBlockService.ts
│   │   ├── readingCompositionService.ts
│   │   ├── aiPolishService.ts
│   │   ├── chatAdvisorService.ts
│   │   ├── paywallTriggerService.ts
│   │   ├── memoryService.ts
│   │   └── stripeService.ts
│   │
│   ├── types/
│   │   ├── user.ts
│   │   ├── profile.ts
│   │   ├── reading.ts
│   │   └── chat.ts
│   │
│   └── store/                        # Zustand stores (client state only)
│       ├── onboardingStore.ts
│       └── sessionStore.ts
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql    # Full schema (see schema.sql)
│   └── seed.sql                      # Dev seed data
│
├── .env.local                        # Local secrets (never commit)
├── .env.example                      # Template for teammates
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. Environment Variables

```bash
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # Server-only, never expose to client

# OpenAI
OPENAI_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_UNLOCK_PRICE_ID=             # One-time unlock product price ID
STRIPE_SUBSCRIPTION_PRICE_ID=       # Monthly subscription price ID

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 5. Data Flow: Onboarding → Identity → Reading

```
User completes onboarding
        │
        ▼
POST /api/profile/create
  └─ profileNormalizationService.normalize(answers)
       → derives core_pattern, emotional_pattern, decision_pattern, future_theme
       → generates identity_summary string
       → inserts into user_profiles
        │
        ▼
POST /api/reading/generate
  └─ readingBlockService.selectBlocks(profile)
       → picks Recognition, Past Validation, Current State, Near-Future blocks
  └─ readingCompositionService.compose(blocks)
       → assembles teaser_text + cut_line + locked_text
  └─ aiPolishService.polish(composed)
       → OpenAI call to smooth transitions
       → returns final reading
       → inserts into readings
        │
        ▼
Client redirects to /generating (2–4s animation)
        │
        ▼
Client redirects to /reading (teaser displayed, cut line blurred)
```

---

## 6. Monetization State Machine

```
User state: free
  → 2 chat messages available
  → full reading: LOCKED

User action: purchase one-time unlock ($4.99/$7.99)
  → Stripe Checkout → webhook → users.unlock_status = true
  → users.remaining_chat_messages = 10

User action: subscribe ($9.99/$14.99/mo)
  → Stripe Checkout → webhook → users.subscription_status = 'active'
  → users.remaining_chat_messages = 999 (effectively unlimited)

Paywall triggers:
  → remaining_chat_messages reaches 0
  → user sends high-intent message (paywallTriggerService detects intent)
  → user tries to view locked reading
```

---

## 7. Build Order (72-hour sprint)

| Hour | Focus | Key Deliverables |
|---|---|---|
| 0–8 | Foundation | Repo setup, Supabase schema, env vars, Supabase auth (anonymous), basic routing shell |
| 8–20 | Onboarding | Landing page, palm upload, 4-question flow, profile normalization, identity layer stored |
| 20–32 | Reading engine | Block system, composition, AI polish, teaser + full reading UI |
| 32–44 | Monetization | Paywall screen, Stripe checkout, webhook handler, unlock/subscription state |
| 44–58 | Advisor chat | Context-aware chat, message limits, paywall trigger, upgrade modal |
| 58–72 | Polish + deploy | Analytics events, Vercel deploy, Supabase prod setup, smoke test full flow |
