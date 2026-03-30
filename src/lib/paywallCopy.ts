/**
 * paywallCopy.ts
 *
 * State-aware paywall copy engine — Phase 2 (refined with palm intelligence).
 *
 * Every variant sells withheld personalized insight — not generic feature lists.
 * Copy uses real user context: first name, focus area, emotional pattern,
 * actual withheld content (cut line), and palm reading anchor.
 *
 * Tone principles:
 * - Pattern-driven: reference the actual pattern, not generic "insight"
 * - Emotionally tense: the user stopped at a meaningful point
 * - Slight confrontation where appropriate: name what they haven't done yet
 * - CTA must be curiosity-driven and completion-focused — not feature announcements
 * - Cut line framing: interruption must feel unresolved, not just paused
 */

export type PaywallSource = 'reading' | 'chat' | 'insight' | 'trigger' | 'default'

export interface PaywallContext {
  firstName?: string | null
  focusArea?: string | null
  emotionalPattern?: string | null
  cutLine?: string | null
  hoursRemaining?: number | null
  palmReadingAnchor?: string | null   // From PalmFeatures.reading_anchor — physical grounding
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

// ─── Focus area helpers ───────────────────────────────────────────────────────

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

// ─── Copy variants ────────────────────────────────────────────────────────────

export function buildPaywallCopy(source: PaywallSource, ctx: PaywallContext): PaywallCopy {
  const { firstName: name, cutLine, hoursRemaining, palmReadingAnchor } = ctx
  const f = focus(ctx.focusArea)
  const rawFocus = ctx.focusArea ?? 'life_direction'
  const emotional = ctx.emotionalPattern?.replace(/_/g, ' ')

  // Palm line — appended to subtext when anchor is available.
  // One sentence. Grounds the copy in physical observation without dominating.
  const palmLine = palmReadingAnchor
    ? ` Your palm reading was used to generate this — the section you haven't read applies that grounding directly to your ${f}.`
    : ''

  // ── reading ─────────────────────────────────────────────────────────────────
  // User read the teaser and hit the blur zone.
  // Sell: the specific withheld continuation. Confront the gap.

  if (source === 'reading') {
    const focusSubtext: Record<string, string> = {
      love:
        `The teaser described the pattern. The section you stopped at names exactly what it's doing in your love life right now — and whether it moves toward or away from what you want. You haven't read that part.${palmLine}`,
      money:
        `The teaser described the pattern. The section you stopped at names the specific financial timing window your decision pattern is approaching — and what needs to happen before it closes. You haven't read that.${palmLine}`,
      life_direction:
        `The teaser described the pattern. The section you stopped at names the specific shift your pattern is building toward — and what you do in the next few days either accelerates it or delays it. You haven't read that.${palmLine}`,
    }

    const urgency = hoursRemaining && hoursRemaining > 0
      ? `${hoursRemaining}h before this reading is released — not held`
      : 'Generated specifically for you. Not a template.'

    return {
      eyebrow:  'Reading incomplete',
      headline: name
        ? `${name}, you stopped at the most important part`
        : 'You stopped at the most important part',
      subtext: focusSubtext[rawFocus] ?? focusSubtext.life_direction,
      withheldLabel:        'The reading breaks here — mid-sentence, deliberately',
      withheldText:         cutLine ?? undefined,
      withheldContinuation: 'The line above was left open. What follows names what it was building toward.',
      urgencyLine:  urgency,
      ctaUnlock:    'Finish the reading',
      ctaSub:       'Finish reading + daily insight',
      unlockFeatures: [
        `What your pattern predicts for your ${f} in the coming weeks`,
        'The specific timing window your pattern is approaching',
        '10 advisor conversations to go deeper on anything the reading surfaces',
      ],
      subFeatures: subFeatures(ctx.focusArea),
    }
  }

  // ── chat ─────────────────────────────────────────────────────────────────────
  // User was mid-conversation and hit the message limit.
  // High-intent moment. Confront what they haven't asked yet.

  if (source === 'chat') {
    const chatSubtext = emotional
      ? `You've been asking around the edge of something. The ${emotional} pattern tends to circle before it lands — and the conversation was about to land on it. The next message is where you stop circling.`
      : `You've been asking around the edge of something. The conversation was about to reach the part that actually matters. That's where you stopped.`

    return {
      eyebrow:  'That\'s the limit',
      headline: name
        ? `${name}, the next message is the one that matters`
        : 'The next message is the one that matters',
      subtext: chatSubtext,
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

  // ── insight ───────────────────────────────────────────────────────────────────
  // Non-subscriber clicked the locked insight card.
  // Sell: this specific insight, for today, for this pattern. Not generic.

  if (source === 'insight') {
    const insightSubtext = emotional
      ? `It's not a reflection of your reading. It's based on your ${emotional} pattern and where your arc currently sits. It names what today is asking of you specifically — not what yesterday asked.`
      : `Today's insight is based on your behavioral pattern and reading arc. It names what today is asking of you specifically — not what yesterday asked, not what tomorrow will ask.`

    return {
      eyebrow:  'Generated today, for today',
      headline: name
        ? `${name}, today's observation is specific to where you are right now`
        : 'Today\'s observation is specific to where you are right now',
      subtext: insightSubtext,
      urgencyLine: `Today's insight expires at midnight`,
      ctaUnlock: "Read what today is asking",
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
  // Sell: the specific shift, and the window attached to it.

  if (source === 'trigger') {
    const triggerSubtext = emotional
      ? `Your ${emotional} tendency has generated a new configuration. This doesn't happen on a predictable schedule. What it means for your ${f} is specific — there's a window of roughly a week where acting on this actually registers. After that, the pattern resets.`
      : `Something in your pattern configuration has shifted. There's a window where what you do with this registers. That window is narrow and it's open now.`

    return {
      eyebrow:  'Pattern signal detected',
      headline: name
        ? `${name}, there's a shift in your ${f} pattern — and a window`
        : `There's a shift in your ${f} pattern — and a window`,
      subtext: triggerSubtext,
      urgencyLine: 'Pattern windows close. This one is open now.',
      ctaUnlock: `See the signal and the window`,
      ctaSub:    'Stay ahead of your pattern',
      unlockFeatures: [
        `What shifted in your ${f} pattern`,
        'Daily insight updates as your pattern continues to evolve',
        'Unlimited advisor conversations to track each development',
      ],
      subFeatures: subFeatures(ctx.focusArea),
    }
  }

  // ── default ────────────────────────────────────────────────────────────────
  // Direct visit, or from home "Unlock full access" CTA.

  const defaultSubtext = `What you've read is the recognition layer — it named the pattern. The second layer is where the pattern is applied to your ${f} specifically. That's the section that describes what happens next and what it asks of you.${palmLine}`

  return {
    eyebrow:  'There is a second layer',
    headline: name
      ? `${name}, your reading is incomplete`
      : 'Your reading is incomplete',
    subtext: defaultSubtext,
    withheldLabel:        cutLine ? 'The reading cuts here — what follows was withheld' : undefined,
    withheldText:         cutLine ?? undefined,
    withheldContinuation: cutLine
      ? 'The next section names the outcome and the timing. That\'s the part you haven\'t read.'
      : undefined,
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
