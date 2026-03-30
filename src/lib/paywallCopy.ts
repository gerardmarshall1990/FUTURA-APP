/**
 * paywallCopy.ts
 *
 * State-aware paywall copy engine.
 *
 * Every variant sells withheld personalized insight — not generic feature lists.
 * Copy uses real user context: first name, focus area, emotional pattern,
 * actual withheld content (cut line, insight, pattern signal).
 *
 * No SaaS feature language. No "unlock premium features". No "upgrade your plan".
 */

export type PaywallSource = 'reading' | 'chat' | 'insight' | 'trigger' | 'default'

export interface PaywallContext {
  firstName?: string | null
  focusArea?: string | null
  emotionalPattern?: string | null
  cutLine?: string | null
  hoursRemaining?: number | null
}

export interface PaywallCopy {
  eyebrow: string
  headline: string
  subtext: string
  // The withheld content block — rendered blurred in the UI
  withheldLabel?: string
  withheldText?: string
  withheldContinuation?: string
  urgencyLine?: string
  ctaUnlock: string
  ctaSub: string
  unlockFeatures: string[]
  subFeatures: string[]
}

// ─── Focus area helpers ───────────────────────────────────────────────────────

const FOCUS_LABELS: Record<string, string> = {
  love:           'love life',
  money:          'financial pattern',
  life_direction: 'life direction',
}

function focus(raw: string | null | undefined): string {
  if (!raw) return 'life'
  return FOCUS_LABELS[raw] ?? raw.replace(/_/g, ' ')
}

function subFeatures(focusArea: string | null | undefined): string[] {
  const f = focus(focusArea)
  return [
    'Everything in the one-time unlock',
    `Unlimited advisor conversations about your ${f}`,
    `Daily insights that track your ${f} arc over time`,
    'Access to all future pattern updates',
  ]
}

// ─── Copy variants ────────────────────────────────────────────────────────────

export function buildPaywallCopy(source: PaywallSource, ctx: PaywallContext): PaywallCopy {
  const { firstName: name, cutLine, hoursRemaining } = ctx
  const f = focus(ctx.focusArea)
  const rawFocus = ctx.focusArea ?? 'life_direction'
  const emotional = ctx.emotionalPattern?.replace(/_/g, ' ')

  // ── reading ─────────────────────────────────────────────────────────────────
  // User just read their teaser and hit the blur zone.
  // Sell: the specific withheld continuation of their reading.

  if (source === 'reading') {
    const focusSubtext: Record<string, string> = {
      love:
        `The section you're missing describes exactly what your pattern is doing in your love life right now — and what it predicts is moving toward you in the coming weeks.`,
      money:
        `The section you're missing describes the financial timing window your pattern is approaching and what your decision pattern says to do before it closes.`,
      life_direction:
        `The deeper layer describes the specific shift your pattern is building toward — and whether what you do in the next few days accelerates it or delays it.`,
    }

    return {
      eyebrow:    'Your reading continues',
      headline:   name ? `${name}, your reading doesn't end here` : `Your reading doesn't end here`,
      subtext:    focusSubtext[rawFocus] ?? focusSubtext.life_direction,
      withheldLabel:        'Your reading was interrupted here',
      withheldText:         cutLine ?? undefined,
      withheldContinuation: 'The deeper layer picks up from this exact point.',
      urgencyLine: hoursRemaining && hoursRemaining > 0
        ? `This reading is held for you · ${hoursRemaining} hours remaining`
        : 'This reading was generated specifically for you.',
      ctaUnlock: 'Continue my reading',
      ctaSub:    'Continue reading + daily insight',
      unlockFeatures: [
        `What your pattern predicts for your ${f} in the coming weeks`,
        `The specific timing window identified in your reading`,
        '10 advisor conversations to go deeper on anything your reading surfaces',
      ],
      subFeatures: subFeatures(ctx.focusArea),
    }
  }

  // ── chat ─────────────────────────────────────────────────────────────────────
  // User was mid-conversation and hit the message limit.
  // High-intent moment. Sell: continuation of the specific conversation.

  if (source === 'chat') {
    return {
      eyebrow:  'Conversation limit reached',
      headline: name
        ? `${name}, you reached the limit at exactly the right moment`
        : 'You reached the limit at exactly the right moment',
      subtext: emotional
        ? `The questions you've been asking are the kind that reveal ${emotional} patterns most clearly. The conversation was building toward the most important part. Don't stop here.`
        : `The questions you've been asking are precisely the kind that reveal the deepest patterns. The conversation was building toward the most important part.`,
      urgencyLine: undefined,
      ctaUnlock: 'Continue this conversation',
      ctaSub:    'Unlimited guidance · $9.99/mo',
      unlockFeatures: [
        '10 advisor conversations to continue and finish what you started',
        `The deeper reading layer — what your pattern reveals about your ${f}`,
        'Full pattern history tracked across every session',
      ],
      subFeatures: subFeatures(ctx.focusArea),
    }
  }

  // ── insight ───────────────────────────────────────────────────────────────────
  // Non-subscriber saw the locked insight card and clicked through.
  // Sell: the specific insight that was generated for them today.

  if (source === 'insight') {
    return {
      eyebrow:  "Today's insight is ready",
      headline: name
        ? `${name}, a new observation about your pattern was generated today`
        : 'A new observation about your pattern was generated today',
      subtext: emotional
        ? `Based on your ${emotional} tendency and what your reading identified, today's insight describes exactly where you are in your pattern arc right now — and what today is asking of you.`
        : `Based on your reading and behavioral pattern, today's insight identifies exactly where you are in your arc — and what it means for your ${f} today.`,
      urgencyLine: `A new insight is generated every day — today's won't wait`,
      ctaUnlock: "Read today's insight",
      ctaSub:    'Daily insight + unlimited guidance',
      unlockFeatures: [
        `Today's personal insight — written for your ${f} specifically`,
        'Daily insights that track your pattern arc as it evolves',
        '10 advisor conversations to go deeper on any insight',
      ],
      subFeatures: subFeatures(ctx.focusArea),
    }
  }

  // ── trigger ───────────────────────────────────────────────────────────────────
  // User clicked a FOMO/reactivation lifecycle trigger card.
  // Sell: the specific pattern signal that generated the trigger.

  if (source === 'trigger') {
    return {
      eyebrow:  'Your pattern moved',
      headline: name
        ? `${name}, something shifted in your ${f} pattern`
        : `Something shifted in your ${f} pattern`,
      subtext: emotional
        ? `Your ${emotional} pattern has generated a new signal. The deeper layer describes what it means for your ${f} right now — and the window it's pointing toward.`
        : `Based on recent patterns and your reading, a new development in your ${f} has been identified. It's ready when you are.`,
      urgencyLine: "Pattern windows don't stay open",
      ctaUnlock: `See what changed in my ${f}`,
      ctaSub:    'Stay ahead of your pattern',
      unlockFeatures: [
        `What changed in your ${f} pattern`,
        'Daily insight updates as your pattern continues to evolve',
        'Unlimited advisor conversations to track each development',
      ],
      subFeatures: subFeatures(ctx.focusArea),
    }
  }

  // ── default ────────────────────────────────────────────────────────────────
  // Direct visit, or from home "Unlock full access" CTA.

  return {
    eyebrow:  'There is more to your reading',
    headline: name ? `${name}, your reading has a deeper layer` : 'Your reading has a deeper layer',
    subtext:  `The teaser you've read is the surface. The deeper layer describes what your pattern predicts specifically for your ${f} — the timing, the tension, and what it asks of you next.`,
    withheldLabel:        cutLine ? 'Your reading was interrupted here' : undefined,
    withheldText:         cutLine ?? undefined,
    withheldContinuation: cutLine ? 'The deeper layer continues from this exact point.' : undefined,
    urgencyLine: hoursRemaining && hoursRemaining > 0
      ? `This reading is held for you · ${hoursRemaining}h remaining`
      : undefined,
    ctaUnlock: 'Unlock my full reading',
    ctaSub:    'Full reading + ongoing guidance',
    unlockFeatures: [
      'The complete deeper layer of your personal reading',
      `What your pattern predicts for your ${f}`,
      '10 advisor conversations to go deeper on anything',
    ],
    subFeatures: subFeatures(ctx.focusArea),
  }
}
