# FUTURA — NEXT GEN ADDICTIVE PRODUCT SPEC & IMPLEMENTATION MANDATE

**Purpose:**  
This document is the **source of truth** for FUTURA going forward. The app is **not** a basic palm reading app. It must function as a **persistent, personalized, emotionally compelling AI identity companion** with strong retention, monetization, and reactivation systems.

Claude / builder instruction: **Do not treat this as optional product direction. Implement the systems below into the app architecture and codebase.** If any existing flow conflicts with this brief, refactor the flow so this brief is satisfied.

---

## 1) PRODUCT POSITIONING

FUTURA is:

- an AI-powered identity and life-guidance app
- personalized to the user’s reading, traits, behavior, chat history, and engagement patterns
- designed to maximize:
  - emotional resonance
  - daily usage
  - subscription conversion
  - subscriber retention
  - reactivation of inactive users
  - FOMO-driven monetization

FUTURA is **not**:

- a one-time palm reading generator
- a static report app
- a generic chatbot with mystical wording
- a thin wrapper over a single reading output

---

## 2) CORE PRODUCT EXPERIENCE

The product must have these **four core engines** from day one:

### A. Identity Engine
Creates and maintains a persistent user profile based on:
- palm reading output
- questionnaire / onboarding answers
- user-selected focus areas
- inferred personality / emotional / decision patterns
- conversation history
- memory extraction from interactions over time

### B. Conversational Companion Engine
A chat interface that works like ChatGPT **but personalized to the user**.
The assistant must:
- remember the user
- speak from their profile and history
- evolve over time
- answer questions using identity context, prior concerns, recent behavior, and meaningful continuity

### C. Daily Insight & Life Signal Engine
The app must generate:
- daily personalized insights
- upcoming “life energy” / “decision window” / “relationship phase” style prompts
- reasons for the user to return daily
- push/in-app cards that feel timely and personally relevant

### D. FOMO / Reactivation Engine
The app must:
- detect inactivity
- detect unpaid users who showed intent
- detect active subscribers who have gone quiet
- generate emotionally compelling, personalized prompts to bring them back
- create urgency without sounding robotic or spammy

---

## 3) NON-NEGOTIABLE FEATURE SET

The following features are **mandatory**.

### 3.1 Personalized Chat (Must feel like a personal advisor)
Requirements:
- Chat UI should feel similar to modern AI chat apps
- Messages must stream or feel responsive and polished
- Responses must use:
  - identity_summary
  - core_pattern
  - emotional_pattern
  - decision_pattern
  - future_theme
  - focus_area
  - recent insights
  - memory snippets
  - recent user events / concerns
- Chat must not answer as a generic assistant unless no profile exists
- If profile exists, every response should be shaped by that profile

Examples:
- If user asks “Should I call him?” the response should consider the user’s emotional pattern and attachment style
- If user asks “Should I take this job?” the response should consider decision pattern and recent themes
- If the user repeatedly asks about love, the app should adapt future prompts toward that area

### 3.2 Persistent Memory
The app must maintain durable memory, not just conversation history.

Memory categories:
- identity memory (who the user is)
- preference memory (what the user cares about)
- emotional memory (what keeps recurring)
- event memory (important moments they mention)
- behavioral memory (patterns in how they engage, churn risk, fixation topics)

Minimum memory behaviors:
- after every few messages, extract meaningful insights
- store normalized memory records
- mark importance / confidence / recency
- retrieve relevant memories into future prompts

### 3.3 Daily Personalized Insights
Every user must be able to receive fresh, personalized daily guidance.

Must support:
- daily insight card on home/dashboard
- “today’s energy / focus / signal” style output
- optional push notification summary
- premium deep-dive unlock
- continuity from previous days

Examples:
- “Today favors clarity over speed in decisions”
- “Your current phase suggests a conversation you’ve been avoiding may resurface”
- “You’re entering a window where relationship tension can either deepen or resolve”

### 3.4 FOMO & Conversion Triggers
This is critical. The app must actively convert and reactivate.

#### For signed up but non-paying users:
Show personalized triggers like:
- “A major relationship shift is forming in your next cycle”
- “Your profile suggests an important decision window is approaching”
- “There is a blocked insight around your love / career pattern”

Then:
- preview partial insight
- lock the deeper answer behind paywall

#### For inactive paying users:
Use stronger personalized reactivation:
- “You’ve gone quiet during a phase where your patterns are shifting”
- “Your recent cycle indicates a key turning point was developing”
- “There’s a new insight connected to the issue you last explored”

#### For active users:
Use progressive engagement:
- “Your profile has evolved”
- “A deeper pattern has emerged from your recent chats”
- “Today’s insight connects to the theme you explored earlier this week”

### 3.5 Home / Dashboard as Retention Surface
The home screen must not be passive.
It should include:
- daily insight card
- “energy today” / “focus today” panel
- recent unlocks
- chat CTA
- suggested prompts
- a “new signal detected” card if user is inactive
- subscription upgrade CTA if not premium

### 3.6 Personalized Suggested Prompts
The app must generate prompts based on user profile and recent interactions, for example:
- “What is blocking me emotionally right now?”
- “What pattern keeps repeating in my relationships?”
- “Is this the right time to make a career move?”
- “Why do I keep thinking about this person?”

These should update dynamically.

---

## 4) REQUIRED USER STATES

The app must behave differently depending on the user state.

### State A — Anonymous / Pre-signup
Goal:
- curiosity
- emotional intrigue
- sign-up

Experience:
- teaser copy
- limited preview
- sign-up CTA

### State B — Signed up, no payment
Goal:
- convert to paid

Experience:
- profile and teaser present
- chat limited or gated
- daily insight teaser
- FOMO cards
- partial locked reveals

### State C — Paid and active
Goal:
- retention
- habit formation
- continued perceived value

Experience:
- full chat
- daily insights
- continuity
- deeper interpretation layers
- premium notifications

### State D — Paid but inactive
Goal:
- reactivate quickly

Experience:
- personalized nudge copy
- new “signal detected” messaging
- reminders tied to past focus area
- resurfacing unresolved themes

### State E — At-risk churn
Goal:
- stop drop-off before cancellation

Signals:
- decreased opens
- reduced chat volume
- declining session depth
- no response to daily insights

Experience:
- renewed urgency
- “something important is surfacing” cards
- incentive offers if necessary
- higher emotional salience

---

## 5) DATA MODEL REQUIREMENTS

Implement or extend tables as needed. Minimum required logical entities:

### users
- id
- email
- created_at
- subscription_status
- lifecycle_state
- churn_risk_score
- last_active_at

### user_profiles
- user_id
- identity_summary
- core_pattern
- emotional_pattern
- decision_pattern
- future_theme
- focus_area
- personality_vector_json
- onboarding_answers_json
- last_profile_refresh_at

### readings
- id
- user_id
- palm_image_url or input payload
- reading_text
- reading_sections_json
- created_at

### chat_threads
- id
- user_id
- title
- created_at
- updated_at

### chat_messages
- id
- thread_id
- user_id
- role
- content
- created_at
- metadata_json

### user_memories
- id
- user_id
- memory_type
- summary
- source
- importance_score
- confidence_score
- tags_json
- created_at
- updated_at
- expires_at nullable

### daily_insights
- id
- user_id
- insight_date
- headline
- summary
- full_text
- category
- premium_locked
- generated_from_json
- delivered_at

### engagement_events
- id
- user_id
- event_type
- payload_json
- created_at

### lifecycle_triggers
- id
- user_id
- trigger_type
- status
- priority
- copy_headline
- copy_body
- cta_label
- cta_target
- scheduled_for
- sent_at
- metadata_json

### subscriptions / billing
Existing billing can remain, but must integrate with lifecycle logic.

---

## 6) REQUIRED BACKEND SYSTEMS

### 6.1 Profile Orchestrator
A backend service that:
- creates initial profile from reading + onboarding
- periodically refreshes or enriches profile from memories and chat
- updates focus areas and recurring themes

### 6.2 Memory Extractor
A service that:
- scans new chat content and key events
- extracts meaningful memory objects
- deduplicates similar memories
- ranks relevance and importance

### 6.3 Insight Generator
A service that:
- generates daily insight per user
- uses identity + memory + recent behavior
- varies tone and category
- avoids generic repetition

### 6.4 Trigger Engine
A service that:
- scores users for inactivity, conversion intent, churn risk
- creates personalized re-engagement prompts
- schedules in-app cards / push / email content
- updates based on response behavior

### 6.5 Prompt Assembly Layer
Every AI call should use structured context assembly:
- profile context
- recent memories
- recent chats
- state-specific instructions
- subscription status
- trigger context if relevant

Do not hardcode simplistic prompts in one place only. Use a proper prompt builder.

---

## 7) AI / PROMPTING REQUIREMENTS

### 7.1 The assistant voice
The assistant should feel:
- warm
- insightful
- emotionally intelligent
- slightly mystical if brand-appropriate
- not cheesy
- not repetitive
- not generic

### 7.2 System prompt requirements
System prompts must include:
- user profile summary
- active focus areas
- emotional patterns
- decision pattern
- recent memory snippets
- current lifecycle state
- premium/free constraints
- output style rules

### 7.3 Guardrails
Avoid:
- repeating the same generic advice
- overusing vague mystical filler
- generic therapy clichés
- generic “follow your heart” answers
- obvious spam FOMO copy

Instead:
- make outputs feel specifically about the user
- reference prior themes
- create emotional continuity

---

## 8) NOTIFICATION / REACTIVATION LOGIC

### 8.1 Inactive free user
If signed up but unpaid and inactive for 24–72h:
- generate a personalized teaser
- reference likely relevant category (love, career, emotional block, timing)
- push them back to app/paywall

### 8.2 Inactive paid user
If subscriber inactive for X days:
- generate a stronger personalized message
- mention new signal, shift, or unresolved thread
- take them to home insight or chat

### 8.3 High-intent conversion
If user:
- viewed paywall multiple times
- used teaser chat
- lingered on unlock flow
then generate stronger premium prompt:
- “There is more to uncover about the pattern you keep returning to”

### 8.4 Churn prevention
If subscriber usage declines:
- show “new insight ready”
- offer a fresh conversation starter
- surface what changed in their profile
- optionally offer a retention incentive

---

## 9) UI / UX REQUIREMENTS

### 9.1 Home Screen
Must show:
- daily insight
- personalized greeting
- suggested prompts
- recent theme or new signal
- premium/free state CTA
- access to chat

### 9.2 Chat Screen
Must:
- feel premium
- support multi-turn conversation
- display starter prompts
- show continuity from prior chats
- allow thread titles or smart thread naming

### 9.3 Paywall
Must:
- tie upgrade to personalized value
- mention daily insights, personalized guidance, deeper reveals, and advanced chat
- not just show generic subscription features

### 9.4 Re-engagement UI
Must support:
- in-app banners/cards
- resurfaced unresolved theme
- urgency without spam

---

## 10) ANALYTICS REQUIREMENTS

Track at minimum:
- signup conversion
- paywall view rate
- unlock conversion
- daily insight open rate
- chat usage frequency
- session depth
- inactive user reactivation rate
- paid churn / retention
- which triggers convert best
- which categories users engage with most

---

## 11) ACCEPTANCE CRITERIA

The implementation is not complete unless all of the following are true:

1. A signed-up user has a persistent profile that influences chat.
2. Chat clearly references the user’s identity and prior context.
3. Memory records are extracted and reused.
4. A daily insight is generated and visible in-app.
5. Free users see personalized conversion/FOMO prompts.
6. Paid inactive users can be targeted with personalized reactivation prompts.
7. Home screen reflects user-specific state, not static content.
8. Suggested prompts are personalized.
9. Lifecycle state exists and affects behavior.
10. Analytics events fire for key retention and monetization actions.

If any of the above is missing, the product is **not done**.

---

## 12) BUILD ORDER

Claude / builder must implement in this order:

### Phase 1 — Foundation
- confirm and normalize schema
- build / finish profile context layer
- finish persistent memory extraction and retrieval
- refactor prompt assembly

### Phase 2 — Personalized Chat
- ensure chat uses profile + memory + recent interactions
- improve thread handling
- add suggested prompts

### Phase 3 — Daily Insight System
- daily insight generation
- dashboard card
- storage table and retrieval
- premium lock behavior if needed

### Phase 4 — Lifecycle / FOMO Engine
- lifecycle state machine
- trigger generation
- inactive user prompts
- paid user reactivation prompts
- home screen dynamic cards

### Phase 5 — Instrumentation
- analytics events
- churn risk fields
- engagement tracking

### Phase 6 — Polish
- copy refinement
- performance
- push/email hooks if implemented
- UI premiumization

---

## 13) EXPLICIT INSTRUCTION TO CLAUDE / BUILDER

Do not respond with:
- “the architecture supports this later”
- “phase 2 can add this”
- “future enhancement”
- “placeholder”
- “mocked”
- “scaffolded but not wired”

Instead:
- implement the actual systems now
- wire them end-to-end
- add the necessary schema, services, routes, UI surfaces, and analytics

If something cannot be fully completed in one pass:
- implement the backend/data model and the UI hooks now
- leave precise TODO comments with exact next actions
- do not leave the product pretending features exist when they do not

---

## 14) FINAL PRODUCT STANDARD

The end result should feel like:

- a personalized AI life companion
- emotionally sticky
- habit-forming
- commercially aggressive in a smart way
- much deeper than a one-time reading app

The benchmark is **not** “functional MVP.”

The benchmark is:

> **NEXT-GEN ADDICTIVE PERSONALIZED CONSUMER AI PRODUCT WITH STRONG RETENTION AND MONETIZATION LOOPS**

