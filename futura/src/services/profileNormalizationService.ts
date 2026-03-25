/**
 * profileNormalizationService
 *
 * Converts raw onboarding answers into a structured identity profile.
 * This is the foundation of the identity layer — everything downstream
 * (readings, chat, memory) reads from what this service produces.
 */

export type FocusArea = 'love' | 'money' | 'life_direction'
export type CurrentState = 'feeling_stuck' | 'turning_point' | 'okay_but_uncertain'
export type PersonalityTrait = 'overthink_decisions' | 'trust_people_easily' | 'keep_things_to_myself'
export type AgeBand = '18-24' | '25-34' | '35-44' | '45+'

export interface OnboardingAnswers {
  focusArea: FocusArea
  currentState: CurrentState
  personalityTrait: PersonalityTrait
  ageBand: AgeBand
}

export interface NormalizedProfile {
  corePattern: string
  emotionalPattern: string
  decisionPattern: string
  futureTheme: string
  identitySummary: string
}

// ─── Trait → Pattern Mappings ────────────────────────────────────────────────

const traitPatterns: Record<PersonalityTrait, {
  corePattern: string
  emotionalPattern: string
  decisionPattern: string
}> = {
  overthink_decisions: {
    corePattern: 'mental_overprocessing',
    emotionalPattern: 'internalizes uncertainty',
    decisionPattern: 'delays action until pressure builds',
  },
  trust_people_easily: {
    corePattern: 'open_then_recalibrates',
    emotionalPattern: 'gives others access quickly then reflects',
    decisionPattern: 'acts from good intent before full clarity',
  },
  keep_things_to_myself: {
    corePattern: 'guarded_depth',
    emotionalPattern: 'feels deeply but discloses selectively',
    decisionPattern: 'processes privately before revealing intent',
  },
}

// ─── Current State → Future Theme Mappings ───────────────────────────────────

const futureThemes: Record<CurrentState, string> = {
  feeling_stuck: 'a delayed shift is approaching',
  turning_point: 'a decision window is opening',
  okay_but_uncertain: 'subtle momentum is building beneath the surface',
}

// ─── Identity Summary Generation ─────────────────────────────────────────────

function buildIdentitySummary(
  trait: PersonalityTrait,
  state: CurrentState,
  focus: FocusArea
): string {
  const summaries: Record<PersonalityTrait, Record<CurrentState, string>> = {
    overthink_decisions: {
      feeling_stuck: `You tend to overthink important decisions and often delay action, especially when emotions are involved. Right now something feels held in place — not by circumstance, but by internal hesitation. The clarity you're waiting for may not come before the moment requires a response.`,
      turning_point: `You process decisions carefully and wait for certainty before acting — but you're at a point where waiting is itself a choice. The pattern of overthinking may be the thing standing between where you are and where you already sense you need to go.`,
      okay_but_uncertain: `You tend to think through decisions more thoroughly than most, which protects you but also slows you. Things feel stable on the surface, but there's a quiet uncertainty underneath that hasn't fully resolved yet.`,
    },
    trust_people_easily: {
      feeling_stuck: `You tend to extend trust and openness to people quickly, which is a strength — but it has also led to situations where recalibration was needed. Right now something feels stuck, possibly tied to a relationship or emotional dynamic that hasn't fully moved.`,
      turning_point: `You lead with openness and good intent before you have full information. You're at a turning point where that pattern is about to be tested or redirected. What you choose to hold onto and what you release will shape the next phase.`,
      okay_but_uncertain: `You give people access to you fairly easily, and you reflect afterward. Things feel okay right now, but there's an undercurrent of uncertainty — likely connected to someone or something you haven't fully resolved.`,
    },
    keep_things_to_myself: {
      feeling_stuck: `You process things privately and reveal very little until you're certain. Right now there's more happening internally than you're showing externally, and that gap between inner movement and outer action is creating a kind of stillness that feels heavier than it should.`,
      turning_point: `You hold things close and reveal them selectively. You're at a turning point that will likely require you to act or express something before you feel fully ready — and that discomfort is part of what makes this moment matter.`,
      okay_but_uncertain: `You tend to internalize deeply and show little of what you actually feel. On the surface things are okay, but underneath there's a slow build toward something that hasn't surfaced yet.`,
    },
  }

  return summaries[trait][state]
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export function normalizeProfile(answers: OnboardingAnswers): NormalizedProfile {
  const { corePattern, emotionalPattern, decisionPattern } = traitPatterns[answers.personalityTrait]
  const futureTheme = futureThemes[answers.currentState]
  const identitySummary = buildIdentitySummary(
    answers.personalityTrait,
    answers.currentState,
    answers.focusArea
  )

  return {
    corePattern,
    emotionalPattern,
    decisionPattern,
    futureTheme,
    identitySummary,
  }
}
