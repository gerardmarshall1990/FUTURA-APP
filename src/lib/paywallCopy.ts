/**
 * paywallCopy.ts
 *
 * State-aware paywall copy engine with emotional intensity escalation.
 *
 * Tone escalates across three tiers based on how many times the user
 * has previously seen the paywall (exposureCount from unlock/context API):
 *
 *   Tier 1 (exposureCount 0) — Observational
 *     Mirrors back what's there. No pressure. Names the gap.
 *
 *   Tier 2 (exposureCount 1) — Direct
 *     Shorter. Less hedging. Names what they're not doing.
 *     Hints at consequence.
 *
 *   Tier 3 (exposureCount 2+) — Slightly confronting
 *     Names the pattern they're enacting right now by not converting.
 *     The hesitation IS the pattern.
 *
 * Language principles across all tiers:
 * - No "this is because" — state what IS, not why
 * - No "many people" / "it's natural" — specific to THIS person
 * - Hint at something they already sense, don't explain it to them
 * - CTAs are completion-focused and curiosity-driven, not feature announcements
 */

export type PaywallSource = 'reading' | 'chat' | 'insight' | 'trigger' | 'default'

export interface PaywallContext {
  firstName?: string | null
  focusArea?: string | null
  emotionalPattern?: string | null
  cutLine?: string | null
  hoursRemaining?: number | null
  palmReadingAnchor?: string | null
  exposureCount?: number | null   // Number of previous paywall views — drives tier selection
}

export interface PaywallCopy {
  eyebrow: string
  headline: string
  subtext: string
  withheldLabel?: string
  withheldText?: string
  withheldContinuation?: string
  urgencyLine?: string
  ctaUnlock: string
  ctaSub: string
  unlockFeatures: string[]
  subFeatures: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FOCUS_LABELS: Record<string, string> = {
  love:           'love life',
  money:          'financial pattern',
  life_direction: 'life direction',
}

function focus(raw: string | null | undefined): string {
  if (!raw) return 'pattern'
  return FOCUS_LABELS[raw] ?? raw.replace(/_/g, ' ')
}

function subFeatures(focusArea: string | null | undefined): string[] {
  const f = focus(focusArea)
  return [
    'Everything in the one-time unlock',
    `Unlimited advisor conversations about your ${f}`,
    `Daily insights that track your ${f} arc as it evolves`,
    'Access to all future pattern updates',
  ]
}

// tier: 1 = observational, 2 = direct, 3 = confronting
function tier(exposureCount: number | null | undefined): 1 | 2 | 3 {
  const n = exposureCount ?? 0
  if (n <= 0) return 1
  if (n === 1) return 2
  return 3
}

function n(firstName: string | null | undefined, fallback: string): string {
  return firstName ?? fallback
}

// ─── Copy variants ────────────────────────────────────────────────────────────

export function buildPaywallCopy(source: PaywallSource, ctx: PaywallContext): PaywallCopy {
  const { firstName: name, cutLine, hoursRemaining, palmReadingAnchor, emotionalPattern } = ctx
  const f = focus(ctx.focusArea)
  const rawFocus = ctx.focusArea ?? 'life_direction'
  const emotional = emotionalPattern?.replace(/_/g, ' ')
  const t = tier(ctx.exposureCount)

  // Palm grounding line — appended to subtext when anchor is available.
  // One sentence. Grounds the copy in physical observation. No explanatory framing.
  const palmLine = palmReadingAnchor
    ? ` Your palm reading grounds the deeper section specifically.`
    : ''

  const readingUrgency = hoursRemaining && hoursRemaining > 0
    ? `${hoursRemaining}h before this reading is released — not held`
    : 'Generated specifically for you. Not a template.'

  // ── reading ─────────────────────────────────────────────────────────────────

  if (source === 'reading') {
    if (t === 1) {
      const subtext: Record<string, string> = {
        love:
          `The section below names what's happening in your love life right now — the specific thing in motion, not the pattern in general. You haven't read it.${palmLine}`,
        money:
          `The section below names the financial timing window approaching and what your decision pattern needs to do before it closes. You haven't read it.${palmLine}`,
        life_direction:
          `The section below names the specific shift your pattern is building toward. What you do in the next few days either accelerates it or delays it. You haven't read it.${palmLine}`,
      }
      return {
        eyebrow:  'Reading incomplete',
        headline: `${n(name, 'You')}, you stopped at the most important part`,
        subtext:  subtext[rawFocus] ?? subtext.life_direction,
        withheldLabel:        'The reading breaks here — mid-sentence, deliberately',
        withheldText:         cutLine ?? undefined,
        withheldContinuation: 'The sentence above ends where it does deliberately. What follows names what it was building toward.',
        urgencyLine:  readingUrgency,
        ctaUnlock:    'Continue my reading',
        ctaSub:       'Finish reading + daily insight',
        unlockFeatures: [
          `What your pattern predicts for your ${f} in the coming weeks`,
          'The specific timing window your pattern is approaching',
          '10 advisor conversations to go deeper on anything the reading surfaces',
        ],
        subFeatures: subFeatures(ctx.focusArea),
      }
    }

    if (t === 2) {
      const subtext: Record<string, string> = {
        love:
          `What's in motion in your love life isn't waiting for you to read about it. The section below names it.`,
        money:
          `The timing window doesn't extend because you haven't read the section describing it.`,
        life_direction:
          `The shift your pattern is building toward is building. The section below names what it's building toward.`,
      }
      return {
        eyebrow:  'Still incomplete',
        headline: `${n(name, 'You')} came back. The reading is still here.`,
        subtext:  subtext[rawFocus] ?? subtext.life_direction,
        withheldLabel:        'Still breaks here',
        withheldText:         cutLine ?? undefined,
        withheldContinuation: 'Same point. Still waiting.',
        urgencyLine:  readingUrgency,
        ctaUnlock:    'See what this leads to',
        ctaSub:       'Finish reading + daily insight',
        unlockFeatures: [
          `What your pattern predicts for your ${f}`,
          'The specific timing window — still open',
          '10 advisor conversations',
        ],
        subFeatures: subFeatures(ctx.focusArea),
      }
    }

    // t === 3
    const subtext: Record<string, string> = {
      love:
        `Something about finishing feels like a commitment. That's exactly what the locked section describes.`,
      money:
        `The section below names the financial decision you keep circling. Coming back without finishing is the pattern.`,
      life_direction:
        `Coming back without finishing is the pattern the teaser described. The locked section names that directly.`,
    }
    return {
      eyebrow:  'You keep stopping here',
      headline: `The hesitation is the pattern`,
      subtext:  subtext[rawFocus] ?? subtext.life_direction,
      withheldLabel:        'Still here. Still unread.',
      withheldText:         cutLine ?? undefined,
      withheldContinuation: 'The reading stopped at exactly the point where it was about to name the thing you came here for.',
      urgencyLine:  readingUrgency,
      ctaUnlock:    'Finish what started here',
      ctaSub:       'Finish reading + daily insight',
      unlockFeatures: [
        `What your pattern predicts for your ${f}`,
        'The specific timing window your pattern is approaching',
        '10 advisor conversations',
      ],
      subFeatures: subFeatures(ctx.focusArea),
    }
  }

  // ── chat ─────────────────────────────────────────────────────────────────────

  if (source === 'chat') {
    if (t === 1) {
      const subtext = emotional
        ? `You've been asking around the edge of something. The ${emotional} pattern tends to circle before it lands — and the conversation was about to land on it. That's where you stopped.`
        : `You've been asking around the edge of something. The conversation was about to land on it. That's where you stopped.`
      return {
        eyebrow:  "That's the limit",
        headline: `${n(name, 'The')} next message is the one that matters`,
        subtext,
        ctaUnlock: 'Send the next message',
        ctaSub:    'Unlimited messages · $9.99/mo',
        unlockFeatures: [
          '10 advisor conversations to finish what you started',
          `The deeper reading layer — what your pattern reveals about your ${f}`,
          'Full pattern history tracked across every session',
        ],
        subFeatures: subFeatures(ctx.focusArea),
      }
    }

    if (t === 2) {
      const subtext = emotional
        ? `The ${emotional} pattern circles before it lands. The next message is where it either lands or circles again.`
        : `The question you've been asking around is still unanswered. The next message is the one.`
      return {
        eyebrow:  'You came back to this',
        headline: `The question is still unanswered`,
        subtext,
        ctaUnlock: 'Send it',
        ctaSub:    'Unlimited messages · $9.99/mo',
        unlockFeatures: [
          '10 conversations to finish what you started',
          `Deeper reading layer for your ${f}`,
          'Full pattern history',
        ],
        subFeatures: subFeatures(ctx.focusArea),
      }
    }

    // t === 3
    const subtext = emotional
      ? `The ${emotional} pattern — the one you've been trying to understand — is playing out right now in the not-sending. The next message is where it moves or doesn't.`
      : `The hesitation in sending the next message? That's the pattern you've been asking about. This is it.`
    return {
      eyebrow:  'You keep returning here',
      headline: `Not sending is the pattern`,
      subtext,
      ctaUnlock: 'Move it forward',
      ctaSub:    'Unlimited messages · $9.99/mo',
      unlockFeatures: [
        '10 conversations',
        `Deeper reading layer for your ${f}`,
        'Full pattern history',
      ],
      subFeatures: subFeatures(ctx.focusArea),
    }
  }

  // ── insight ───────────────────────────────────────────────────────────────────

  if (source === 'insight') {
    const insightUrgency = "Today's insight expires at midnight"

    if (t === 1) {
      const subtext = emotional
        ? `Based on your ${emotional} pattern and where your arc sits today. It names what today is asking — not yesterday, not tomorrow.`
        : `Based on your pattern arc today. It names what today is asking of you specifically.`
      return {
        eyebrow:  'Generated today, for today',
        headline: `${n(name, 'Today')}'s observation is specific to where you are right now`,
        subtext,
        urgencyLine: insightUrgency,
        ctaUnlock: 'Read what today is asking',
        ctaSub:    'Daily insight + unlimited guidance',
        unlockFeatures: [
          `Today's personal insight — written for your ${f} specifically`,
          'Daily insights that track your pattern arc as it evolves',
          '10 advisor conversations to go deeper on any insight',
        ],
        subFeatures: subFeatures(ctx.focusArea),
      }
    }

    if (t === 2) {
      return {
        eyebrow:  'Still waiting',
        headline: `Today's insight is still here`,
        subtext:  `You've seen this page. The observation was written for today — not a general note, a specific one. It becomes less relevant as the day passes.`,
        urgencyLine: insightUrgency,
        ctaUnlock: 'Read it before it passes',
        ctaSub:    'Daily insight + unlimited guidance',
        unlockFeatures: [
          `Today's personal insight for your ${f}`,
          'Daily insights as your pattern evolves',
          '10 advisor conversations',
        ],
        subFeatures: subFeatures(ctx.focusArea),
      }
    }

    // t === 3
    return {
      eyebrow:  'You keep looking and not reading',
      headline: `Not reading it is part of the pattern`,
      subtext:  `You already sense something today is unresolved. The insight names it. Coming back to this page without reading is consistent with what it describes.`,
      urgencyLine: insightUrgency,
      ctaUnlock: 'Read it',
      ctaSub:    'Daily insight + unlimited guidance',
      unlockFeatures: [
        `Today's personal insight for your ${f}`,
        'Daily insights as your pattern evolves',
        '10 advisor conversations',
      ],
      subFeatures: subFeatures(ctx.focusArea),
    }
  }

  // ── trigger ───────────────────────────────────────────────────────────────────

  if (source === 'trigger') {
    if (t === 1) {
      const subtext = emotional
        ? `Your ${emotional} tendency has generated a new configuration. There's a window — roughly a week. After that, the pattern resets.`
        : `Something in your pattern has shifted. There's a window. After that, it resets.`
      return {
        eyebrow:  'Pattern signal detected',
        headline: `There's a shift in your ${f} pattern — and a window`,
        subtext,
        urgencyLine: 'Pattern windows close. This one is open now.',
        ctaUnlock: 'See the signal and the window',
        ctaSub:    'Stay ahead of your pattern',
        unlockFeatures: [
          `What shifted in your ${f} pattern`,
          'Daily insight updates as your pattern continues to evolve',
          'Unlimited advisor conversations to track each development',
        ],
        subFeatures: subFeatures(ctx.focusArea),
      }
    }

    if (t === 2) {
      return {
        eyebrow:  'The window is narrowing',
        headline: `You've seen this signal before`,
        subtext:  `You didn't act on it then. The window is the same one — smaller now. The signal is still pointing at the same thing.`,
        urgencyLine: 'The window is narrowing, not widening.',
        ctaUnlock: 'Act on it this time',
        ctaSub:    'Stay ahead of your pattern',
        unlockFeatures: [
          `What shifted in your ${f} pattern`,
          'Daily updates as your pattern evolves',
          'Unlimited advisor conversations',
        ],
        subFeatures: subFeatures(ctx.focusArea),
      }
    }

    // t === 3
    const subtext = emotional
      ? `The ${emotional} tendency isn't something you're trying to understand in the abstract — it's happening right now. You keep seeing the signal and waiting. The signal is not the thing that's waiting.`
      : `You've been back to this page. The window doesn't wait for you to decide it's the right time.`
    return {
      eyebrow:  'You keep seeing this',
      headline: `Waiting on the signal is the pattern`,
      subtext,
      urgencyLine: 'The window is closing.',
      ctaUnlock: 'Stop waiting on this',
      ctaSub:    'Stay ahead of your pattern',
      unlockFeatures: [
        `What shifted in your ${f}`,
        'Daily updates as your pattern evolves',
        'Unlimited advisor conversations',
      ],
      subFeatures: subFeatures(ctx.focusArea),
    }
  }

  // ── default ────────────────────────────────────────────────────────────────

  if (t === 1) {
    return {
      eyebrow:  'There is a second layer',
      headline: `${n(name, 'Your')} reading is incomplete`,
      subtext:  `What you've read named the pattern. The second layer applies it to your ${f} — what's in motion, what the timing looks like, what it asks of you.${palmLine}`,
      withheldLabel:        cutLine ? 'The reading cuts here — what follows was withheld' : undefined,
      withheldText:         cutLine ?? undefined,
      withheldContinuation: cutLine ? "The next section names the outcome and the timing. That's the part you haven't read." : undefined,
      urgencyLine: hoursRemaining && hoursRemaining > 0
        ? `${hoursRemaining}h before this reading is released — not held`
        : undefined,
      ctaUnlock: 'Read the complete version',
      ctaSub:    'Full reading + ongoing guidance',
      unlockFeatures: [
        'The complete deeper layer of your personal reading',
        `What your pattern predicts for your ${f}`,
        '10 advisor conversations to go deeper on anything',
      ],
      subFeatures: subFeatures(ctx.focusArea),
    }
  }

  if (t === 2) {
    return {
      eyebrow:  'Still incomplete',
      headline: `The second layer is still waiting`,
      subtext:  `The pattern named in your teaser doesn't resolve in the teaser. The part that resolves it is the section below.`,
      withheldLabel:        cutLine ? 'Still cuts here' : undefined,
      withheldText:         cutLine ?? undefined,
      withheldContinuation: cutLine ? 'Same point. What follows is still there.' : undefined,
      urgencyLine: hoursRemaining && hoursRemaining > 0
        ? `${hoursRemaining}h before this reading is released — not held`
        : undefined,
      ctaUnlock: 'Read what follows',
      ctaSub:    'Full reading + ongoing guidance',
      unlockFeatures: [
        'The complete deeper layer',
        `What your pattern predicts for your ${f}`,
        '10 advisor conversations',
      ],
      subFeatures: subFeatures(ctx.focusArea),
    }
  }

  // t === 3
  return {
    eyebrow:  'You keep coming back to this',
    headline: `Not finishing is the pattern`,
    subtext:  `You already sense something in your reading is unresolved. Coming back here without finishing is consistent with the pattern it describes. The second layer names that directly.`,
    withheldLabel:        cutLine ? 'Still here. Still unread.' : undefined,
    withheldText:         cutLine ?? undefined,
    withheldContinuation: cutLine ? 'You already know something in this reading is unresolved.' : undefined,
    urgencyLine: hoursRemaining && hoursRemaining > 0
      ? `${hoursRemaining}h before this reading is released — not held`
      : undefined,
    ctaUnlock: 'Finish it',
    ctaSub:    'Full reading + ongoing guidance',
    unlockFeatures: [
      'The complete deeper layer',
      `What your pattern predicts for your ${f}`,
      '10 advisor conversations',
    ],
    subFeatures: subFeatures(ctx.focusArea),
  }
}
