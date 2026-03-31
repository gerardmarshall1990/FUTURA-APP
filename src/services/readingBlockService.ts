/**
 * readingBlockService
 *
 * Selects the right reading blocks based on the user's normalized profile.
 * Blocks are deterministic per profile — same inputs always produce same blocks.
 * The used_blocks table prevents repetition across future readings (Phase 2+).
 */

import type { NormalizedProfile, FocusArea, CurrentState, PersonalityTrait } from './profileNormalizationService'

export interface ReadingBlocks {
  recognition: string
  pastValidation: string
  currentState: string
  nearFuture: string
  cutLine: string
  lockedContinuation: string
}

// ─── Recognition Blocks ──────────────────────────────────────────────────────

const recognitionBlocks: Record<string, string[]> = {
  mental_overprocessing: [
    `You tend to think things through more deeply than most people, especially when the outcome matters.`,
    `You often sense the right direction early, but delay acting until your mind feels more settled.`,
    `There is a pattern of careful thinking in you, but hesitation sometimes stretches longer than it should.`,
  ],
  open_then_recalibrates: [
    `You tend to give people the benefit of the doubt before fully protecting your own energy.`,
    `You often lead with openness, even when part of you already senses caution.`,
    `There is generosity in how you approach people, but experience has made you more selective over time.`,
  ],
  guarded_depth: [
    `You don't immediately reveal everything you feel, even when something matters a lot to you.`,
    `There is more emotional depth in you than most people ever see at first.`,
    `You tend to process things privately before allowing anyone else into what you're feeling.`,
  ],
}

// ─── Past Validation Blocks ──────────────────────────────────────────────────

const pastValidationBlocks: Record<PersonalityTrait, string[]> = {
  overthink_decisions: [
    `There has been at least one situation where timing shaped the outcome more than you expected.`,
    `You've had an experience where waiting too long created more uncertainty instead of clarity.`,
    `Something from your past has reinforced the habit of thinking before moving — sometimes past the point where thinking helps.`,
  ],
  trust_people_easily: [
    `There's been a moment where trusting too quickly didn't go how you expected.`,
    `Something from your past has made you more careful about repeating the same emotional pattern.`,
    `You've experienced what happens when openness meets someone who wasn't ready to receive it carefully.`,
  ],
  keep_things_to_myself: [
    `There has been at least one experience that made you more selective about who gets access to what you actually feel.`,
    `Something in your past confirmed that keeping things private was safer than sharing them too soon.`,
    `You've learned that not everything needs to be said — but occasionally that protection has kept you from being fully understood.`,
  ],
}

// ─── Current State Blocks ────────────────────────────────────────────────────

const currentStateBlocks: Record<CurrentState, string[]> = {
  feeling_stuck: [
    `Right now, something feels as though it has been building quietly beneath the surface.`,
    `You are in a phase where movement is needed, but part of you is still holding back.`,
    `There is a tension between knowing something needs to shift and not yet being ready to make that shift.`,
  ],
  turning_point: [
    `This feels like a genuine turning point rather than a passing phase.`,
    `A decision window is opening, and your next move carries more weight than usual.`,
    `You are at a juncture where the cost of staying still is beginning to exceed the cost of choosing a direction.`,
  ],
  okay_but_uncertain: [
    `Things may appear stable on the surface, but there is subtle movement building underneath.`,
    `You are in a calmer phase, but it's leading toward a moment of clearer direction.`,
    `The uncertainty you feel isn't instability — it's the quiet before something becomes obvious.`,
  ],
}

// ─── Near-Future Tension Blocks ──────────────────────────────────────────────

const nearFutureBlocks: Record<FocusArea, string[]> = {
  love: [
    `Within the next few days, a personal interaction may force emotional clarity.`,
    `A relationship-related shift is approaching, and it may ask you to respond rather than wait.`,
    `Something is building in the relational space around you — a dynamic that has been quiet is about to become harder to ignore.`,
  ],
  money: [
    `A financial choice or opportunity is likely to surface soon, and timing will matter more than certainty.`,
    `You may notice a money-related opening soon, but hesitation could affect how clearly you see it.`,
    `Something connected to resources, opportunity, or financial direction is approaching a decision point.`,
  ],
  life_direction: [
    `A moment is approaching where staying neutral will become harder than choosing a direction.`,
    `Something connected to your path is likely to become clearer within days, but only if you pay attention.`,
    `The direction you've been uncertain about is beginning to reveal itself — not all at once, but in signals worth noticing.`,
  ],
}

// ─── Cut Lines ───────────────────────────────────────────────────────────────
// Keyed by focusArea × currentState so each cut references what was just said.
// Structure: feel like a mid-escalation interruption — the reading just named
// something specific, and then stopped exactly where it was about to get more specific.

const cutLinesByFocusAndState: Record<FocusArea, Record<CurrentState, string>> = {
  love: {
    feeling_stuck:     `What has been keeping this relational pattern in place is not what it appears — and the thing that finally moves it is`,
    turning_point:     `What this turning point in your love life is actually asking of you is different from what it looks like — and that difference is`,
    okay_but_uncertain: `The shift building beneath the surface in your connections is already further along than it appears — and the part that matters most is`,
  },
  money: {
    feeling_stuck:     `The financial opening already in motion will look different from what you expect when it arrives — whether you catch it comes down to`,
    turning_point:     `What your decision pattern does at this exact financial juncture carries longer reach than usual — and the specific thing to watch for is`,
    okay_but_uncertain: `The timing window in your financial pattern is narrower than it looks from here — and what determines whether it opens or closes for you is`,
  },
  life_direction: {
    feeling_stuck:     `The direction shift already building in your pattern is not the one you are expecting — and what it requires of you first is`,
    turning_point:     `This is the part of this pattern most people do not see until after the window has already passed —`,
    okay_but_uncertain: `What follows from this period changes how the next several months unfold — and the specific factor that tips it is`,
  },
}

// ─── Locked Continuation Blocks ──────────────────────────────────────────────

const lockedContinuationBlocks: Record<FocusArea, Record<string, string>> = {
  love: {
    mental_overprocessing: `The hesitation shaping your relational pattern is not about readiness — it appears just before emotional clarity would arrive, reliably, and reads like caution when it is closer to avoidance. In the next period, a situation will surface where your first instinct is accurate and your second-guessing is not. The tell is the speed of that first response, before the analysis begins. Your pattern delays most precisely at the point where things are about to resolve. The window here is roughly two to three weeks. The outcome depends less on circumstance than on whether you act before the hesitation becomes the decision itself.`,
    open_then_recalibrates: `The relational shift approaching is a variation of a pattern you have navigated before — openness followed by recalibration, where the recalibration arrives just late enough to have already created a dynamic. The difference in this window is that discernment is available earlier than usual. Your pattern's strength is the initial openness; the cost is the recalibration timing. What is being asked of you in this period is to bring the recalibration instinct forward — not as protection, but as clarity before rather than after. That one adjustment, applied to a specific situation already forming, changes the outcome.`,
    guarded_depth: `The shift in your relational life will arrive quietly, through a specific moment of choice rather than a dramatic event. Your depth is real and it is an asset — but it has a consistent cost: the people worth reaching tend to need a signal first. What is building in this window is a situation where one specific act of expression, earlier than feels comfortable, determines what becomes available to you. Your pattern predicts you will wait for certainty before showing the depth. The shift happens when you act from the depth first. That moment is closer than it feels.`,
  },
  money: {
    mental_overprocessing: `The financial opening building in your pattern is being processed as a risk question when the actual variable is timing. The hesitation that has served as protection elsewhere is functioning as friction here — specifically at the point where a clear enough picture would normally produce action. In this window, the opportunity will arrive without feeling certain, which is consistent with your pattern. Waiting for certainty here has a cost that becomes visible in the three months following the decision point. Your pattern predicts you will either move earlier than feels comfortable and be correct, or move later than optimal and understand why afterward. The window for the first path is the next two to four weeks.`,
    open_then_recalibrates: `The financial decision approaching rewards a version of your pattern you do not always trust — moving before the full picture is clear. Your instinct in this area tends to run ahead of your willingness to act on it. The recalibration instinct, which has protected you elsewhere, functions as delay in financial timing windows. What is building here is a situation where your first instinct about a resource, opportunity, or decision will be more accurate than the analysis that follows it. The timing is short. Acting from the first instinct rather than the recalibrated one is what determines the outcome in this specific window.`,
    guarded_depth: `The financial shift approaching will require you to be more visible than feels comfortable — not dramatically, but in one specific context. Your tendency to process privately before acting is a genuine strength, but this window has a dynamic where being seen taking a position is part of what creates the opening. What your pattern shows is a consistent sequence of waiting until internal clarity is complete before external action — and in financial timing windows, that sequence sometimes needs to reverse. The opening here does not require certainty. It requires a move before you feel fully ready. That moment is approaching in the next few weeks.`,
  },
  life_direction: {
    mental_overprocessing: `The direction shift already building in your pattern is not a dramatic event — it is a series of small recognitions you have been accumulating without yet acting on. The hesitation keeping the direction unclear is not about information; it is about the moment of commitment. Your pattern delays most precisely at the threshold between knowing and doing. In this window, the signals you have been processing are ready to be acted on — not all at once, but through one specific first step. That step does not require certainty. It requires choosing the direction before the picture is complete, which is consistently the moment your pattern identifies as the point where things shift.`,
    open_then_recalibrates: `The path shift approaching is connected to who and what you continue to invest in moving forward. Your pattern of leading with openness and then recalibrating has shaped your direction more than any single decision has. In this window, the recalibration is not about correcting an error — it is about selecting more precisely. The people, projects, or directions your first instinct identified are worth a closer look. What is building in this period is a choice point about continued investment, and your pattern predicts you will recalibrate away from something your first instinct had right. The pattern to watch is whether that recalibration is clarity or hesitation.`,
    guarded_depth: `The path correction ahead requires you to be more externally visible in one specific way — not broadly, not dramatically, but in one context where you have been processing the direction privately and waiting until it feels finished before sharing it. Your tendency to move through shifts internally before making them visible is a real strength, but this window has a dynamic where the direction itself becomes clearer through expression rather than through additional internal processing. What is building in the next period is a situation where sharing the direction, even partially, creates the external signal that accelerates the path. Your pattern predicts you will wait until it feels finished before saying anything. The shift happens when you say something before it feels finished.`,
  },
}

// ─── Block Selection ─────────────────────────────────────────────────────────

function pickBlock(blocks: string[], userIdSeed: string, blockType: string): string {
  // Deterministic selection based on userId — same user always gets same block
  // In Phase 2, use used_blocks table to rotate through variants
  const hash = Array.from(userIdSeed + blockType).reduce(
    (acc, char) => acc + char.charCodeAt(0), 0
  )
  return blocks[hash % blocks.length]
}

export function selectReadingBlocks(
  profile: NormalizedProfile,
  focusArea: FocusArea,
  currentState: CurrentState,
  personalityTrait: PersonalityTrait,
  userIdSeed: string
): ReadingBlocks {
  const recognition = pickBlock(
    recognitionBlocks[profile.corePattern] ?? recognitionBlocks.mental_overprocessing,
    userIdSeed,
    'recognition'
  )

  const pastValidation = pickBlock(
    pastValidationBlocks[personalityTrait],
    userIdSeed,
    'past_validation'
  )

  const currentStateBlock = pickBlock(
    currentStateBlocks[currentState],
    userIdSeed,
    'current_state'
  )

  const nearFuture = pickBlock(
    nearFutureBlocks[focusArea],
    userIdSeed,
    'near_future'
  )

  const cutLine = cutLinesByFocusAndState[focusArea]?.[currentState]
    ?? `What follows from this moment changes how the next several months unfold —`

  const lockedContinuation =
    lockedContinuationBlocks[focusArea]?.[profile.corePattern] ??
    lockedContinuationBlocks.life_direction.mental_overprocessing

  return {
    recognition,
    pastValidation,
    currentState: currentStateBlock,
    nearFuture,
    cutLine,
    lockedContinuation,
  }
}
