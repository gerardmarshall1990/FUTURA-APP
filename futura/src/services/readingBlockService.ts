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

const cutLines = [
  `How you respond to this moment will shape what unfolds over the next few months...`,
  `This is the point where your path starts to shift in a way that matters long-term...`,
  `What happens next connects directly to a deeper pattern in your future timeline...`,
]

// ─── Locked Continuation Blocks ──────────────────────────────────────────────

const lockedContinuationBlocks: Record<FocusArea, Record<string, string>> = {
  love: {
    mental_overprocessing: `This upcoming shift is tied less to chance and more to what you have been sensing but avoiding. The important part is not only who is involved, but how quickly you recognize the emotional pattern repeating. The deeper reading reveals a specific window — and what your pattern says about whether you will act within it or after it closes.`,
    open_then_recalibrates: `What matters here is whether you choose clarity early or wait for circumstances to decide for you. Your pattern of openness followed by recalibration has served you — but this moment may ask you to lead with discernment first. The full reading maps what this shift is actually asking of you.`,
    guarded_depth: `The relational tension approaching you is connected to how much of what you actually feel you choose to express. Your tendency to protect your depth is real, but this moment may require a different kind of response. The deeper reading shows what the shift is, and what your pattern predicts about how you will handle it.`,
  },
  money: {
    mental_overprocessing: `The deeper pattern here is linked to timing and confidence. You may already be closer to the right move than you think, but hesitation can distort your view of the opportunity. The full reading goes deeper into what this opening looks like and what your pattern says about how to approach it.`,
    open_then_recalibrates: `This next moment appears to reward decisiveness more than perfection. Your instinct to trust and act before having all the information may actually be an asset here — but only if you catch yourself before the recalibration instinct holds you back. The full reading maps the timing.`,
    guarded_depth: `What's coming financially is less about an obvious event and more about a decision that requires you to move before you feel completely certain. Your tendency to process privately is protective — but the full reading shows where that habit may work against you in this specific window.`,
  },
  life_direction: {
    mental_overprocessing: `What unfolds next is less about a dramatic event and more about whether you finally stop delaying what you already know needs movement. The overthinking that has served as protection is beginning to function as resistance. The deeper reading shows what the path forward looks like, and why this window is different.`,
    open_then_recalibrates: `The direction shift approaching you is connected to a choice about who and what you continue to invest in. Your pattern of leading with openness has brought you here — the full reading maps where that openness is pointing, and what recalibration this moment requires.`,
    guarded_depth: `The path correction ahead asks something of you that private processing alone cannot answer. There is a moment coming where you will need to be more visible — not dramatically, but in a specific way. The deeper reading shows what that moment looks like and how your pattern predicts you will respond.`,
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

  const cutLine = pickBlock(cutLines, userIdSeed, 'cut_line')

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
