# FUTURA — CLAUDE CODE INSTRUCTION SET
## Design, Copy & Feature Changes — Full Brief

Read this entire document before writing a single line of code.
The visual reference file `futura_onboarding_viral.html` accompanies this brief — open it in a browser to see the exact onboarding flow to replicate.

---

## YOUR JOB

Make the following changes to the Futura app across three areas:

1. **Landing page** — complete redesign of copy, layout and visuals
2. **Onboarding flow** — add 3 new personalisation screens (name, DOB, religion)
3. **Database + services** — store and use the new personalisation data

Do not change the backend reading generation logic, Stripe integration, or chat service unless explicitly stated below.

---

## PART 1 — LANDING PAGE (`src/app/page.tsx`)

### 1.1 Slogan
Add this as the first text element beneath the logo, in small italic serif gold:

```
Your future, written in the palm of your hand.
```

Style: `font-family: Cormorant, serif` · `font-style: italic` · `font-size: 13px` · `letter-spacing: 0.08em` · `color: rgba(201,169,110,0.5)`

---

### 1.2 Eyebrow line
Above the headline, add:

```
5,000 years of wisdom · AI precision
```

Style: `font-size: 9.5px` · `letter-spacing: 0.2em` · `text-transform: uppercase` · `color: rgba(201,169,110,0.55)` · `font-family: Outfit, sans-serif`

---

### 1.3 Headline — REPLACE CURRENT
Remove: `"Understand what's next."`

Replace with:

```
The one question every human cannot stop asking — answered.
```

Style: `font-family: Cormorant, serif` · `font-size: clamp(30px, 8vw, 38px)` · `font-weight: 300` · `line-height: 1.1` · `color: #F0EBE1`

---

### 1.4 Subline — REPLACE CURRENT
Remove: `"Your personal AI that reveals your patterns and what's quietly building."`

Replace with:

```
5,000 years of palmistry. The precision of AI. Your future is not a mystery. It's already written — in the lines of your hand.
```

Style: `font-family: Outfit, sans-serif` · `font-size: 13px` · `font-weight: 300` · `line-height: 1.65` · `color: rgba(240,235,225,0.48)`
Bold `"Your future is not a mystery."` — `color: rgba(240,235,225,0.72)` · `font-weight: 400`

---

### 1.5 Curiosity quote box — NEW ELEMENT
Add this between the subline and the feature list:

```
"What is going to happen to me?"
The only question every human shares. Now — finally — answered.
```

Style the box:
- `background: rgba(201,169,110,0.06)`
- `border: 1px solid rgba(201,169,110,0.15)`
- `border-radius: 10px`
- `padding: 12px 14px`
- `text-align: center`

The question: `font-family: Cormorant, serif` · `font-size: 15px` · `font-style: italic` · `color: rgba(240,235,225,0.75)`
The answer line: `font-family: Outfit, sans-serif` · `font-size: 10px` · `letter-spacing: 0.06em` · `text-transform: uppercase` · `color: rgba(201,169,110,0.45)`

---

### 1.6 Feature list — NEW SECTION
Add a label: `"WHAT YOU UNLOCK"` in small caps gold above 4 feature cards.

Each card: `background: rgba(255,255,255,0.025)` · `border: 1px solid rgba(255,255,255,0.06)` · `border-radius: 9px` · `padding: 10px 12px` · `display: flex` · `gap: 10px`

**Feature 1 — Palm**
- Icon: 🤚 in a small gold-tinted rounded square
- Title: `Your Palm. Your Future.`
- Description: `Ancient lines in your hand reveal patterns science has tracked for 5,000 years. AI reads yours in seconds.`

**Feature 2 — Chat** (badge: "LIVE CHAT")
- Icon: 💬
- Title: `Ask anything. Get answers.`
- Description: `Your personal AI advisor knows your patterns. Ask about love, money, decisions — it answers with precision, not guesses.`

**Feature 3 — Daily updates** (badge: "NEW DAILY")
- Icon: 📅
- Title: `Daily future updates`
- Description: `Every morning, what's building in your life — delivered before the day starts.`

**Feature 4 — Key events** (badge: "SUBSCRIBERS")
- Icon: ⚡
- Title: `Key life events identified`
- Description: `Relationship shifts. Career decisions. Timing windows. Named before they arrive so you can act — not react.`

Badge style: `background: rgba(201,169,110,0.15)` · `color: rgba(201,169,110,0.8)` · `font-size: 8.5px` · `font-weight: 500` · `letter-spacing: 0.06em` · `text-transform: uppercase` · `padding: 2px 7px` · `border-radius: 100px`

---

### 1.7 Proof strip — NEW ELEMENT
Three-column strip after the feature list:

| 5K | 1 | ∞ |
|---|---|---|
| Yrs proven | Palm. Yours. | Questions |

Style: `display: flex` · each column `flex: 1` · `text-align: center` · `background: rgba(255,255,255,0.03)` · `border: 1px solid rgba(255,255,255,0.06)` · `border-radius: 8px` · `padding: 9px 6px`
Number: `font-family: Cormorant, serif` · `font-size: 18px` · `color: #C9A96E`
Label: `font-family: Outfit, sans-serif` · `font-size: 8.5px` · `text-transform: uppercase` · `color: rgba(240,235,225,0.28)`

---

### 1.8 Blurred reading preview card — NEW ELEMENT
Add before the CTA button:

Top row: pulsing gold dot + label `"Your reading is waiting"`
Dot animation: `animation: blink 2s ease infinite` (opacity 1 → 0.2 → 1)

Preview text (show first ~25 words clearly, blur the rest):
```
A significant shift is already in motion in your closest relationship. The timing is not months away —
```
Then blurred text:
```
it is within days. Your heart line carries a pattern that has appeared before every major emotional turning point in your life. What you decide in the next 72 hours will...
```

Blur style on hidden text: `filter: blur(3.5px)` · `user-select: none` · `color: rgba(240,235,225,0.3)`

Below the text, right-aligned italic:
```
scan your palm to reveal the rest →
```
`font-size: 9.5px` · `color: rgba(201,169,110,0.4)` · `font-style: italic`

Card style: `background: rgba(201,169,110,0.04)` · `border: 1px solid rgba(201,169,110,0.13)` · `border-radius: 10px` · `padding: 12px 13px`

---

### 1.9 CTA button — REPLACE CURRENT
Remove: `"BEGIN YOUR READING"`

Replace with:
```
Read my future — free
```

Button style:
- `background: #C9A96E`
- `color: #080706`
- `border-radius: 100px`
- `padding: 15px`
- `font-size: 12px`
- `font-weight: 700`
- `letter-spacing: 0.1em`
- `text-transform: uppercase`
- `box-shadow: 0 8px 28px rgba(201,169,110,0.4), 0 2px 8px rgba(201,169,110,0.2)`

---

### 1.10 Trust line — REPLACE CURRENT
Remove: `"No account needed · Free to start"`

Replace with:
```
90 seconds · No account · Private · Free to start
```

---

### 1.11 Orb upgrades
Add a rotating arc ring around the existing orb:

```css
.rotate-ring {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: [orb-size + 20px]; height: [orb-size + 20px];
  border-radius: 50%;
  border: 1px solid transparent;
  border-top-color: rgba(201,169,110,0.55);
  border-right-color: rgba(201,169,110,0.18);
  animation: spin 6s linear infinite;
}

@keyframes spin {
  from { transform: translate(-50%,-50%) rotate(0deg); }
  to   { transform: translate(-50%,-50%) rotate(360deg); }
}
```

Add a second counter-rotating ring (slightly smaller, `border-bottom-color` only, `animation: spin 3.5s linear infinite reverse`).

Add a faint palm emoji inside the orb: `font-size: 30px` · `opacity: 0.18` · `filter: sepia(1) brightness(2)` · `animation: 5s ease-in-out infinite` fading between 0.13 and 0.22 opacity.

Add a radial background glow behind the whole orb:
```css
background: radial-gradient(circle, rgba(201,169,110,0.11) 0%, transparent 65%);
```
Positioned absolutely behind the orb, roughly 1.5x the orb's size.

---

## PART 2 — ONBOARDING FLOW (`src/app/onboarding/page.tsx`)

**REFERENCE: Open `futura_onboarding_viral.html` in a browser. This is the exact flow to build.**

The onboarding flow currently has: palm upload + 4 questions.

**Add 3 new screens BEFORE the palm upload:**
- Screen 1: Name
- Screen 2: Date of birth
- Screen 3: Religion / world view

The existing palm upload and 4 questions follow after these.

Update the progress bar total from 5 steps to 8 steps.

---

### 2.1 Screen 1 — Name

**Step label:** `Step 1 of 7 — Who are you?`

**Question heading:**
```
What do we call you, seeker?
```
`font-family: Cormorant, serif` · `font-size: 27px` · `font-weight: 300` · `color: #F0EBE1`
"seeker" in italic gold.

**Sub text:**
```
Your name is placed at the heart of every reading. This is yours alone.
```

**Input field:**
- `font-family: Cormorant, serif` · `font-size: 22px` · `font-weight: 300`
- `background: rgba(201,169,110,0.05)` · `border: 1px solid rgba(201,169,110,0.2)` · `border-radius: 12px`
- `padding: 15px 16px` · `color: #F0EBE1`
- Placeholder: `"Your first name..."` in italic faded

**Hint line below input:**
```
✦   Every reading begins with your name — no one else's
```
`font-size: 10px` · `color: rgba(201,169,110,0.3)`

**CTA:** `"This is me →"`

**Trust line:** `"Private · Never shared · Yours only"`

**Store value as:** `name` in `useOnboardingStore`

---

### 2.2 Screen 2 — Date of Birth

**Step label:** `Step 2 of 7 — Your birth`

**Question heading:**
```
When did you arrive in this world?
```
"in this world?" in italic gold.

**Sub text:**
```
Your date of birth unlocks your star sign, life path number, and every cosmic pattern active in your life right now.
```

**Three dropdowns in a row:**
- Day (1–31)
- Month (January–December)
- Year (1940–2006)

Style each dropdown: `background: rgba(201,169,110,0.05)` · `border: 1px solid rgba(201,169,110,0.18)` · `border-radius: 10px` · `padding: 12px 6px` · `color: rgba(240,235,225,0.55)` · `-webkit-appearance: none`

**Star sign auto-reveal:**
When the user selects a month, immediately show a reveal box beneath the dropdowns (no button press needed — instant on `onChange`).

Reveal box style: `background: rgba(201,169,110,0.07)` · `border: 1px solid rgba(201,169,110,0.22)` · `border-radius: 10px` · `padding: 11px 14px` · `display: flex` · `gap: 10px`

Show: large sign emoji + sign name in gold + descriptive note

Star sign mapping (use day 20 of each month as the approximate cutoff — close enough for MVP):

| Month | Sign | Icon | Note |
|---|---|---|---|
| January | Capricorn | ♑ | Ambitious & disciplined — your reading focuses on what you are building |
| February | Aquarius | ♒ | Visionary & unconventional — your reading reflects your unique path |
| March | Pisces | ♓ | Deeply intuitive — your reading speaks to what you already sense |
| April | Aries | ♈ | Bold & decisive — your reading cuts straight to what is coming |
| May | Taurus | ♉ | Grounded & determined — your reading focuses on what truly lasts |
| June | Gemini | ♊ | Curious & adaptable — your reading reflects the tension you navigate |
| July | Cancer | ♋ | Emotionally deep — your reading speaks to what lives beneath the surface |
| August | Leo | ♌ | Magnetic & driven — your reading reflects the power moving around you |
| September | Virgo | ♍ | Analytical & precise — your reading is exact and unflinching |
| October | Libra | ♎ | Seeking balance — your reading addresses the tension pulling at you |
| November | Scorpio | ♏ | Intense & transformative — your reading goes to the depths |
| December | Sagittarius | ♐ | Freedom-seeking — your reading reflects the expansion that is coming |

**CTA:** `"Reveal my sign →"`

**Trust line:** `"Used only to enrich your reading"`

**Store values as:** `dobDay`, `dobMonth`, `dobYear`, `starSign` in `useOnboardingStore`

Also derive and store `lifePathNumber`:
```typescript
// Sum all digits of DOB until single digit
function lifePathNumber(day: number, month: number, year: number): number {
  const digits = `${day}${month}${year}`.split('').map(Number)
  let sum = digits.reduce((a, b) => a + b, 0)
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = sum.toString().split('').map(Number).reduce((a, b) => a + b, 0)
  }
  return sum
}
```

---

### 2.3 Screen 3 — Religion / World View

**Step label:** `Step 3 of 7 — Your world view`

**Question heading:**
```
How do you understand the world?
```
"the world?" in italic gold.

**Sub text:**
```
This shapes the language of your reading — every belief is honoured here.
```

**6 option cards in a 2-column grid:**

| Icon | Label | Sub-label | Reading tone preview |
|---|---|---|---|
| ✝️ | Christian | Faith & divine plan | God has a plan for you — your reading reveals exactly where you stand in it right now |
| ☪️ | Muslim | Purpose & submission | Your path is written — your reading illuminates the signs already appearing around you |
| ✨ | Spiritual | Energy & universe | The universe has been sending you signals. Your reading translates what they mean |
| 🕉️ | Hindu | Karma & dharma | Your karma is speaking. Your reading shows where your dharmic path leads from here |
| ☸️ | Buddhist | Mindfulness & path | The pattern of your mind and your hand are one. Your reading shows where they align |
| 🔬 | No religion | Logic & science | Science has identified these patterns for 5,000 years. Your reading maps what they mean for you |

Option card style (unselected): `background: rgba(255,255,255,0.02)` · `border: 1px solid rgba(255,255,255,0.07)` · `border-radius: 10px` · `padding: 11px 10px`
Option card style (selected): `background: rgba(201,169,110,0.09)` · `border-color: rgba(201,169,110,0.32)`

**Tone preview box** — appears instantly when an option is selected:
```
[Left gold border] Your reading will say...
[italic serif text showing the reading tone for their selection]
```
Box style: `border-left: 2px solid rgba(201,169,110,0.55)` · rest `1px solid rgba(201,169,110,0.1)` · `border-radius: 0 10px 10px 0` · `padding: 10px 13px`

**CTA:** `"This is how I see the world →"`

**Trust line:** `"No belief excluded · All are equal here"`

**Store value as:** `beliefSystem` in `useOnboardingStore`

---

### 2.4 Update the Generating screen

When the user reaches the generating screen, show their name:

```
[Name], your reading is being built...
```

Cycle through these status messages every 1.6 seconds:
1. `Reading the lines of your hand...`
2. `Cross-referencing your star sign...`
3. `Identifying your life events window...`
4. `Calibrating your personal advisor...`
5. `Preparing your first reading...`

Replace the existing static status messages with this animated cycle.

Add a checklist below the orb:
```
✦  Your palm lines mapped to your patterns
✦  Star sign energy cross-referenced
✦  Life events window identified
✦  Personal advisor calibrated to you
```

---

## PART 3 — DATABASE & SERVICES

### 3.1 Update `user_profiles` table

Add these columns to the Supabase `user_profiles` table:

```sql
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS dob_day INT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS dob_month INT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS dob_year INT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS star_sign TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS life_path_number INT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS belief_system TEXT;
```

---

### 3.2 Update `useOnboardingStore`

Add these fields to the Zustand store in `src/store/index.ts`:

```typescript
name: string | null
dobDay: number | null
dobMonth: number | null
dobYear: number | null
starSign: string | null
lifePathNumber: number | null
beliefSystem: string | null
```

With corresponding setters.

---

### 3.3 Update `POST /api/profile/create`

Accept and store the new fields:

```typescript
const {
  userId, focusArea, currentState, personalityTrait, ageBand, palmImageUrl,
  // NEW:
  name, dobDay, dobMonth, dobYear, starSign, lifePathNumber, beliefSystem
} = body
```

Pass all new fields to the Supabase upsert.

---

### 3.4 Update `profileNormalizationService.ts`

Add `beliefSystem` to `OnboardingAnswers` type.

Add a `buildBeliefTone()` function that returns the appropriate language instruction for the AI:

```typescript
export function buildBeliefTone(beliefSystem: string): string {
  const tones: Record<string, string> = {
    Christian: 'Speak in terms of divine plan, purpose, and God\'s timing. Frame patterns as part of a larger plan at work in their life.',
    Muslim: 'Speak in terms of written path, signs, and Allah\'s will. Frame patterns as signs already appearing around them.',
    Spiritual: 'Speak in terms of energy, the universe, and signals. Frame patterns as messages the universe is sending.',
    Hindu: 'Speak in terms of karma, dharma, and the path forward. Frame patterns as karmic signals.',
    Buddhist: 'Speak in terms of mindfulness, impermanence, and the path. Frame patterns as alignment between inner state and outer circumstances.',
    'No religion': 'Speak in terms of science, pattern recognition, and statistical probability. Avoid all spiritual or mystical language. Frame everything as observable patterns.',
  }
  return tones[beliefSystem] ?? tones['Spiritual']
}
```

---

### 3.5 Update advisor system prompt

In `src/lib/prompts/advisorPrompt.ts`, inject the belief tone into the system prompt:

Add to `buildAdvisorSystemPrompt()`:

```typescript
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGUAGE TONE — CRITICAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This user's belief system: ${input.beliefSystem}

${buildBeliefTone(input.beliefSystem)}

Always speak in this language register. Do not mix registers.
```

Also inject name at the start of advisor opening messages:

```typescript
// Replace generic opening with name-first version
`${firstName}, ${openingMessage}`
```

---

### 3.6 Update reading generation

In `src/lib/prompts/readingPrompt.ts`, inject name and belief tone into the reading polish prompt:

```typescript
// Add to buildPolishUserPrompt:
USER NAME: ${name} — begin the reading with their name naturally woven in, not as an announcement.
BELIEF SYSTEM TONE: ${buildBeliefTone(beliefSystem)}
STAR SIGN: ${starSign} — reference their sign naturally once where relevant.
```

---

## PART 4 — ONBOARDING STORE UPDATE (`src/app/onboarding/page.tsx`)

Update the final `handleFinalNext()` to pass all new fields to the API:

```typescript
await fetch('/api/profile/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId,
    focusArea: store.focusArea,
    currentState: store.currentState,
    personalityTrait: store.personalityTrait,
    ageBand: store.ageBand,
    palmImageUrl: store.palmImageUrl,
    // NEW:
    name: store.name,
    dobDay: store.dobDay,
    dobMonth: store.dobMonth,
    dobYear: store.dobYear,
    starSign: store.starSign,
    lifePathNumber: store.lifePathNumber,
    beliefSystem: store.beliefSystem,
  }),
})
```

---

## PART 5 — SHARE CARD (viral mechanic — build this last)

After the full reading is displayed, add a "Share your reading" button.

On tap, generate a branded share card:

```
[Dark background: #080706]
[Gold logo top left: FUTURA]
[Star sign icon + name top right]
[User's first name in large Cormorant serif]
[One line from their reading — clear]
[Second line — blurred]
[Bottom right: futura.ai]
```

Use the Web Share API to share the card as an image:
```typescript
if (navigator.share) {
  await navigator.share({
    title: `${name}'s Futura Reading`,
    text: 'My future is already written. See what yours says.',
    url: 'https://futura.ai'
  })
}
```

For the image generation use `html2canvas` or a canvas-based approach to render the card as a PNG before sharing.

---

## IMPLEMENTATION ORDER

Do these in this exact sequence:

1. Run the SQL migrations in Supabase (Part 3.1)
2. Update `useOnboardingStore` (Part 3.2)
3. Build the 3 new onboarding screens (Part 2)
4. Update the generating screen (Part 2.4)
5. Update the profile create API route (Part 3.3)
6. Update `profileNormalizationService` (Part 3.4)
7. Update the advisor prompt (Part 3.5)
8. Update reading generation prompt (Part 3.6)
9. Update `handleFinalNext()` (Part 4)
10. Rebuild the landing page (Part 1)
11. Build the share card (Part 5) — build this last, it is lowest priority

---

## REFERENCE FILES

- `futura_onboarding_viral.html` — open in browser, this is the exact onboarding flow to replicate
- `ARCHITECTURE.md` — folder structure and service layer
- `src/lib/prompts/advisorPrompt.ts` — where to inject belief tone
- `src/lib/prompts/readingPrompt.ts` — where to inject name and star sign
- `src/services/profileNormalizationService.ts` — where to add `buildBeliefTone()`

---

## WHAT NOT TO CHANGE

- `schema.sql` base tables (only ADD columns, never drop or rename)
- `stripeService.ts` — do not touch payments
- `readingBlockService.ts` — do not change block selection logic
- `globals.css` — do not change the core design tokens (CSS variables)
- Any existing Vercel environment variables

---

## DONE WHEN

- [ ] Landing page loads with new copy, rotating orb, feature cards, blurred preview, new CTA
- [ ] Onboarding has 3 new screens before palm upload
- [ ] Star sign reveals instantly when month is selected
- [ ] Religion selection changes the tone preview in real time
- [ ] Generating screen shows user's name and cycles through status messages
- [ ] New fields are stored in Supabase `user_profiles`
- [ ] Advisor messages open with the user's name
- [ ] Readings are generated in the user's belief language register
- [ ] All existing functionality (paywall, chat limits, Stripe webhook) still works
