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
  // Major lines
  heart_line: string        // e.g. "deeply curved, extends to index finger — strong emotional expression"
  head_line: string         // e.g. "long and straight, crosses palm fully — analytical, methodical thinker"
  life_line: string         // e.g. "close to thumb, medium depth — cautious energy, deliberate pacing"
  fate_line: string | null  // e.g. "faint and broken — path shaped by external forces" or null if absent

  // Hand shape
  hand_shape: string        // e.g. "rectangular palm, long fingers — air hand: intellectual, communicative"
  finger_length: string     // e.g. "index shorter than ring — tendency toward ambition, risk tolerance"
  thumb_angle: string       // e.g. "wide angle — flexible, adaptable, open to change"

  // Surface quality
  line_clarity: 'deep' | 'medium' | 'faint' | 'mixed'
  line_density: 'few_clear' | 'moderate' | 'many_fine'
  dominant_mount: string    // e.g. "Mount of Venus prominent — strong drive, affection, vitality"

  // Interpretation summary injected into prompts
  reading_anchor: string    // 2–3 sentence plain-English summary for AI injection
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
  "reading_anchor": "2-3 sentence plain-English synthesis of the most distinctive palm features — written as context for a personal advisor, not as a reading itself"
}

Rules:
- Be specific and observational, not vague
- If a feature is not clearly visible, say so rather than guessing
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
  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PALM ANALYSIS (physical identity anchor)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${features.reading_anchor}

Palm details:
- Heart line: ${features.heart_line}
- Head line: ${features.head_line}
- Life line: ${features.life_line}
${features.fate_line ? `- Fate line: ${features.fate_line}` : '- Fate line: not visible'}
- Hand shape: ${features.hand_shape}
- Line quality: ${features.line_clarity} clarity, ${features.line_density.replace(/_/g, ' ')} lines
- Dominant mount: ${features.dominant_mount}

Use these physical features as the grounding anchor for this reading. Reference specific palm features when relevant — not as mystical claims, but as observable physical patterns that correspond to behavioral tendencies.`
}
