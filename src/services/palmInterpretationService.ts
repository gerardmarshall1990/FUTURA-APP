/**
 * palmInterpretationService.ts
 *
 * Maps structured palm features to probabilistic trait descriptions.
 *
 * Philosophy:
 * - Palm features are physical patterns, not destiny.
 * - Interpretations use probabilistic language: "tends to...", "often correlates with..."
 * - Never deterministic ("you are X"). Always probabilistic ("this tends to show up as X").
 * - Confidence levels reflect how strongly a feature maps to a trait.
 * - When palm traits appear to conflict with observed user behavior, the conflict
 *   is acknowledged with: "This can show up differently depending on your current phase"
 *
 * These interpretations are injected alongside raw palm features in assemblePromptContext()
 * as the interpreted identity layer — giving AI models actionable behavioral signals
 * rather than requiring them to re-derive interpretations from raw feature descriptions.
 */

import type { PalmFeatures } from './palmAnalysisService'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TraitConfidence = 'strong' | 'moderate' | 'tentative'

export interface PalmTrait {
  signal: string           // Short label — e.g. "deep emotional processing"
  description: string      // Full probabilistic description for prompt injection
  confidence: TraitConfidence
}

export interface PalmTraits {
  // Core derived traits — from structured signals
  emotionalProcessing: PalmTrait | null    // from heart_line_depth
  cognitiveStyle: PalmTrait | null         // from head_line_slope
  energyFoundation: PalmTrait | null       // from life_line_strength
  elementalType: PalmTrait | null          // from palm_shape
  mountTraits: PalmTrait[]                 // from mount_prominence (one per prominent mount)

  // Conflict handling phrase — injected when palm and behavior may diverge
  conflictPhrase: string
}

// ─── Interpretation Maps ──────────────────────────────────────────────────────

const HEART_LINE_DEPTH: Record<string, PalmTrait> = {
  deep: {
    signal: 'deep emotional processing',
    description: 'Deep heart lines tend to correlate with high emotional intensity — the capacity for profound attachment, but also a slower recovery from relational disruption. This often shows up as someone who experiences connection genuinely and finds it difficult to separate emotional experience from cognitive processing.',
    confidence: 'strong',
  },
  medium: {
    signal: 'regulated emotional expression',
    description: 'A medium-depth heart line tends to correlate with emotional depth that is actively managed — feelings run genuinely but are filtered through a layer of practical self-awareness. This often shows up as emotional availability that is real but measured.',
    confidence: 'moderate',
  },
  faint: {
    signal: 'cognitive-first emotional style',
    description: 'Faint or shallow heart lines often correlate with a preference for intellectual processing over direct emotional engagement. This tends to show up as someone who understands their feelings analytically before they experience them fully — not a lack of feeling, but a different relationship to it.',
    confidence: 'moderate',
  },
}

const HEAD_LINE_SLOPE: Record<string, PalmTrait> = {
  ascending: {
    signal: 'pragmatic, outcome-oriented thinking',
    description: 'An ascending head line often correlates with thinking that tends toward practical, concrete outcomes — preferring the actionable over the abstract. This tends to show up as a focus on what can be done rather than what could theoretically be true.',
    confidence: 'moderate',
  },
  straight: {
    signal: 'linear, structured reasoning',
    description: 'A straight head line tends to correlate with methodical, linear thinking — a preference for clear cause-and-effect logic and structured analysis. This often shows up as comfort with systems, processes, and sequential decision-making.',
    confidence: 'strong',
  },
  descending: {
    signal: 'imaginative, associative thinking',
    description: 'A descending head line often correlates with imaginative or associative cognition — the tendency to connect disparate ideas, move fluidly between abstract and concrete, and arrive at conclusions through intuition as much as logic.',
    confidence: 'moderate',
  },
  curved: {
    signal: 'adaptive thinking — shifts between modes',
    description: 'A curved head line tends to correlate with cognitive flexibility — the ability to operate in both analytical and intuitive modes depending on context. This often shows up as someone who can be rigorous when needed but leads with pattern recognition.',
    confidence: 'tentative',
  },
}

const LIFE_LINE_STRENGTH: Record<string, PalmTrait> = {
  strong: {
    signal: 'resilient personal foundation',
    description: 'A strong life line tends to correlate with physical resilience and a reliable baseline of personal energy — a grounded, persistent quality that tends to recover from disruption without lasting depletion. This often shows up as someone who can absorb difficulty without it destabilizing their foundation.',
    confidence: 'moderate',
  },
  medium: {
    signal: 'fluctuating personal energy',
    description: 'A medium-strength life line tends to suggest a personal foundation that is consistent but variable — periods of strong forward momentum interspersed with a genuine need for recovery and consolidation. This often shows up as someone who works in natural cycles rather than linear output.',
    confidence: 'moderate',
  },
  weak: {
    signal: 'sensitivity to environment',
    description: 'A faint or thin life line often correlates with heightened sensitivity to external environment — physical, emotional, and energetic. This tends to show up as someone who needs intentional management of their personal resources and is significantly affected by the quality of their surroundings.',
    confidence: 'tentative',
  },
}

const PALM_SHAPE: Record<string, PalmTrait> = {
  earth: {
    signal: 'grounded, stability-oriented nature',
    description: 'Earth hands tend to correlate with practical, grounded decision-making — a preference for stability, tangible outcomes, and proven approaches over abstract possibility. This often shows up as someone who needs to trust a thing before committing to it, and who values reliability over novelty.',
    confidence: 'strong',
  },
  air: {
    signal: 'intellectually restless, verbally expressive',
    description: 'Air hands often correlate with intellectual restlessness and a preference for verbal or conceptual processing — ideas tend to be ahead of execution, and this person often thinks best by talking or writing through a problem. This tends to show up as someone who needs to understand why before they commit.',
    confidence: 'strong',
  },
  fire: {
    signal: 'high-initiative, action-oriented energy',
    description: 'Fire hands tend to correlate with quick initiative and a low threshold for action — the impulse to move before all information is gathered. This often shows up as high energy and enthusiasm that can be either an asset (fast execution) or a liability (premature commitment).',
    confidence: 'strong',
  },
  water: {
    signal: 'emotionally attuned, absorptive sensitivity',
    description: 'Water hands often correlate with strong emotional attunement and creative sensitivity — a tendency to absorb the emotional environment around them and be significantly influenced by relational and atmospheric conditions. This tends to show up as high empathy alongside difficulty maintaining boundaries under sustained emotional pressure.',
    confidence: 'strong',
  },
}

const MOUNT_TRAITS: Record<string, Omit<PalmTrait, 'confidence'> & { confidence: TraitConfidence }> = {
  venus: {
    signal: 'relational warmth, strong affective drive',
    description: 'A prominent Mount of Venus tends to correlate with strong relational drive — a genuine need for warmth, connection, and reciprocation. This often shows up as someone for whom relationships are not a peripheral concern but a central source of meaning and motivation.',
    confidence: 'moderate',
  },
  jupiter: {
    signal: 'ambition, recognition-seeking',
    description: 'A prominent Mount of Jupiter often correlates with ambition and a drive for recognition or leadership — the desire to expand beyond current limits and to be seen as capable. This tends to show up as someone who is most motivated when they have a clear objective to exceed.',
    confidence: 'moderate',
  },
  saturn: {
    signal: 'discipline, comfort with solitude',
    description: 'A prominent Mount of Saturn often correlates with seriousness, discipline, and a comfort with solitude and depth — a natural inclination toward responsibility and thoroughness rather than ease or surface engagement.',
    confidence: 'moderate',
  },
  apollo: {
    signal: 'creative expression, originality drive',
    description: 'A prominent Mount of Apollo tends to correlate with a drive for creative expression, aesthetic sensitivity, and a need for originality in how they present themselves and their work. This often shows up as someone who finds purely functional or conventional approaches unsatisfying.',
    confidence: 'moderate',
  },
  mercury: {
    signal: 'communicative agility, adaptability',
    description: 'A prominent Mount of Mercury tends to correlate with quickness in communication, adaptability, and a natural interest in exchange and connection across differences. This often shows up as social ease and a tendency to process experience through conversation.',
    confidence: 'moderate',
  },
  luna: {
    signal: 'imagination, intuitive access',
    description: 'A prominent Mount of Luna often correlates with strong imaginative capacity and intuitive access — a tendency to register subtle information before it is consciously articulated. This tends to show up as someone who often "knows" things before they can explain how they know them.',
    confidence: 'tentative',
  },
  mars: {
    signal: 'assertive energy, low conflict avoidance',
    description: 'A prominent Mount of Mars tends to correlate with physical assertiveness and a low threshold for conflict avoidance — a direct energy that tends toward confronting resistance rather than accommodating it.',
    confidence: 'moderate',
  },
}

// ─── Main Interpretation Function ─────────────────────────────────────────────

export function interpretPalmFeatures(features: PalmFeatures): PalmTraits {
  const mountTraits: PalmTrait[] = []

  if (features.mount_prominence) {
    for (const [mount, level] of Object.entries(features.mount_prominence)) {
      if (level === 'prominent' && MOUNT_TRAITS[mount]) {
        mountTraits.push(MOUNT_TRAITS[mount])
      }
    }
  }

  return {
    emotionalProcessing: features.heart_line_depth
      ? (HEART_LINE_DEPTH[features.heart_line_depth] ?? null)
      : null,
    cognitiveStyle: features.head_line_slope
      ? (HEAD_LINE_SLOPE[features.head_line_slope] ?? null)
      : null,
    energyFoundation: features.life_line_strength
      ? (LIFE_LINE_STRENGTH[features.life_line_strength] ?? null)
      : null,
    elementalType: features.palm_shape
      ? (PALM_SHAPE[features.palm_shape] ?? null)
      : null,
    mountTraits,
    conflictPhrase: 'This can show up differently depending on your current phase',
  }
}

// ─── Prompt Injection ─────────────────────────────────────────────────────────

/**
 * Builds the palm interpretation section for prompt injection.
 * This sits alongside (not replacing) buildPalmContext() —
 * one gives the raw features, this gives the derived behavioral signals.
 *
 * Usage in assemblePromptContext():
 * - Raw features: buildPalmContext(features)       — what was observed
 * - Interpreted traits: buildPalmTraitContext(traits) — what it tends to mean
 */
export function buildPalmTraitContext(traits: PalmTraits): string {
  const activeTrait = (t: PalmTrait | null): string | null => {
    if (!t) return null
    const confidenceMarker =
      t.confidence === 'strong'    ? '' :
      t.confidence === 'moderate'  ? ' (moderate confidence)' :
                                     ' (tentative — treat lightly)'
    return `• ${t.signal}${confidenceMarker}\n  ${t.description}`
  }

  const traitLines = [
    activeTrait(traits.emotionalProcessing),
    activeTrait(traits.cognitiveStyle),
    activeTrait(traits.energyFoundation),
    activeTrait(traits.elementalType),
    ...traits.mountTraits.map(activeTrait),
  ].filter(Boolean) as string[]

  if (traitLines.length === 0) return ''

  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PALM-DERIVED BEHAVIORAL SIGNALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

These are probabilistic tendencies derived from physical palm features. Use them to reinforce and deepen psychological observations — not as certainties. If user behavior appears to contradict a signal, use: "${traits.conflictPhrase}"

${traitLines.join('\n\n')}

PALM WEIGHTING: These signals are a primary identity anchor. Weight them equally with the user's stated core pattern and emotional tendency when interpreting their situation. Do NOT reference palm features in every response — use them where they add genuine precision.`
}
