/**
 * palmAnalysisService.ts
 *
 * Palm Vision Analysis — the identity anchor of the product.
 * Sends the palm image to GPT-4o vision and extracts structured features.
 * These features are stored and injected into every downstream AI call.
 */

import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'placeholder',
})

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PalmFeatures {
  // Major lines — descriptive (rich, human-readable)
  heart_line: string        // e.g. "deeply curved, extends to index finger — strong emotional expression"
  head_line: string         // e.g. "long and straight, crosses palm fully — analytical, methodical thinker"
  life_line: string         // e.g. "close to thumb, medium depth — cautious energy, deliberate pacing"
  fate_line: string | null  // e.g. "faint and broken — path shaped by external forces" or null if absent

  // Hand shape — descriptive
  hand_shape: string        // e.g. "rectangular palm, long fingers — air hand: intellectual, communicative"
  finger_length: string     // e.g. "index shorter than ring — tendency toward ambition, risk tolerance"
  thumb_angle: string       // e.g. "wide angle — flexible, adaptable, open to change"

  // Surface quality — categorical
  line_clarity: 'deep' | 'medium' | 'faint' | 'mixed'
  line_density: 'few_clear' | 'moderate' | 'many_fine'
  dominant_mount: string    // e.g. "Mount of Venus prominent — strong drive, affection, vitality"

  // Interpretation summary injected into prompts
  reading_anchor: string    // 2–3 sentence plain-English summary for AI injection

  // ── Structured signals — normalized for interpretation layer ─────────────────
  // Optional: present on new analyses, absent on legacy data (graceful degradation)

  // How deep/prominent the heart line is cut into the palm
  heart_line_depth?: 'deep' | 'medium' | 'faint'

  // Direction the head line travels across the palm
  head_line_slope?: 'ascending' | 'straight' | 'descending' | 'curved'

  // Overall strength/prominence of the life line arc
  life_line_strength?: 'strong' | 'medium' | 'weak'

  // Elemental hand classification (shape + finger ratio)
  palm_shape?: 'earth' | 'air' | 'fire' | 'water'

  // Per-mount prominence levels for the most identifiable mounts
  mount_prominence?: Partial<Record<
    'venus' | 'jupiter' | 'saturn' | 'apollo' | 'mercury' | 'luna' | 'mars',
    'prominent' | 'moderate' | 'minimal'
  >>
}

// ─── Vision Analysis ─────────────────────────────────────────────────────────

const PALM_ANALYSIS_SYSTEM_PROMPT = `You are a palmistry analysis engine. Your job is to extract precise, structured features from a palm photograph.

You are NOT generating a reading. You are extracting objective features from the image that will be used by another system to generate a personalized reading.

Analyze the palm image and return a JSON object with exactly these fields:
{
  "heart_line": "description of the heart line path, depth, and what it indicates",
  "head_line": "description of the head line path, depth, and what it indicates",
  "life_line": "description of the life line path, depth, and what it indicates",
  "fate_line": "description of the fate line or null if not visible",
  "hand_shape": "shape category and what it suggests (earth/air/fire/water hand)",
  "finger_length": "relative finger lengths and what the pattern suggests",
  "thumb_angle": "angle description and what it suggests about adaptability",
  "line_clarity": "one of: deep, medium, faint, mixed",
  "line_density": "one of: few_clear, moderate, many_fine",
  "dominant_mount": "the most prominent mount and what it indicates",
  "reading_anchor": "2-3 sentence plain-English synthesis of the most distinctive palm features — written as context for a personal advisor, not as a reading itself",
  "heart_line_depth": "one of: deep, medium, faint — how prominently the heart line is cut into the palm",
  "head_line_slope": "one of: ascending, straight, descending, curved — the direction the head line travels across the palm",
  "life_line_strength": "one of: strong, medium, weak — overall prominence and depth of the life line arc",
  "palm_shape": "one of: earth, air, fire, water — elemental classification based on palm shape and finger ratio",
  "mount_prominence": {
    "venus": "one of: prominent, moderate, minimal — or omit if not clearly visible",
    "jupiter": "one of: prominent, moderate, minimal — or omit if not clearly visible",
    "saturn": "one of: prominent, moderate, minimal — or omit if not clearly visible",
    "apollo": "one of: prominent, moderate, minimal — or omit if not clearly visible",
    "mercury": "one of: prominent, moderate, minimal — or omit if not clearly visible",
    "luna": "one of: prominent, moderate, minimal — or omit if not clearly visible",
    "mars": "one of: prominent, moderate, minimal — or omit if not clearly visible"
  }
}

Rules:
- Be specific and observational, not vague
- If a feature is not clearly visible, say so rather than guessing
- For mount_prominence, only include mounts that are clearly visible — omit others
- reading_anchor must be concise and usable as prompt context
- Return valid JSON only. No preamble, no explanation.`

export async function analyzePalm(imageUrl: string): Promise<PalmFeatures> {
  // Handle blob URLs (preview) by returning a graceful placeholder
  // In production the URL will be a public Supabase storage URL
  if (imageUrl.startsWith('blob:')) {
    throw new Error('BLOB_URL: palm image must be uploaded to storage before analysis')
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 600,
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content: PALM_ANALYSIS_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: imageUrl, detail: 'high' },
          },
          {
            type: 'text',
            text: 'Analyze this palm and return the structured JSON features.',
          },
        ],
      },
    ],
  })

  const raw = response.choices[0].message.content?.trim() ?? ''

  // Strip markdown fences if present
  const clean = raw.replace(/```json|```/g, '').trim()

  try {
    const parsed = JSON.parse(clean) as PalmFeatures
    return parsed
  } catch {
    throw new Error(`Failed to parse palm analysis JSON: ${clean.slice(0, 200)}`)
  }
}

// ─── Prompt Injection String ─────────────────────────────────────────────────

export function buildPalmContext(features: PalmFeatures): string {
  const structuredLines: string[] = []
  if (features.heart_line_depth)   structuredLines.push(`  Heart line depth: ${features.heart_line_depth}`)
  if (features.head_line_slope)    structuredLines.push(`  Head line slope: ${features.head_line_slope}`)
  if (features.life_line_strength) structuredLines.push(`  Life line strength: ${features.life_line_strength}`)
  if (features.palm_shape)         structuredLines.push(`  Palm shape (elemental): ${features.palm_shape}`)
  if (features.mount_prominence) {
    const prominent = Object.entries(features.mount_prominence)
      .filter(([, v]) => v === 'prominent')
      .map(([k]) => k)
    if (prominent.length > 0) structuredLines.push(`  Prominent mounts: ${prominent.join(', ')}`)
  }

  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PALM ANALYSIS (primary identity anchor)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${features.reading_anchor}

Observed features:
- Heart line: ${features.heart_line}
- Head line: ${features.head_line}
- Life line: ${features.life_line}
${features.fate_line ? `- Fate line: ${features.fate_line}` : '- Fate line: not visible'}
- Hand shape: ${features.hand_shape}
- Line quality: ${features.line_clarity} clarity, ${features.line_density.replace(/_/g, ' ')} lines
- Dominant mount: ${features.dominant_mount}
${structuredLines.length > 0 ? `\nNormalized signals:\n${structuredLines.join('\n')}` : ''}

WEIGHTING INSTRUCTION: Treat palm features as a primary identity anchor — equivalent in weight to the user's core behavioral pattern and emotional tendency. Use palm observations to reinforce and ground psychological interpretations, not to decorate them.`
}
