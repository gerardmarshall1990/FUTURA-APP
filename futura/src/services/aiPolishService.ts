/**
 * aiPolishService
 *
 * Takes composed raw reading blocks and passes them through OpenAI
 * to smooth transitions, remove robotic language, and make the reading
 * feel specifically personal to the user.
 */

import OpenAI from 'openai'
import type { ComposedReading } from './readingCompositionService'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface PolishedReading {
  teaserText: string
  cutLine: string
  lockedText: string
}

const POLISH_SYSTEM_PROMPT = `You are a writing editor for a personal AI advisor app called Futura.

Your job is to polish reading content that has been assembled from blocks.

Rules:
- Smooth transitions between paragraphs so the reading flows naturally
- Keep short paragraphs — 2 to 4 sentences each
- Preserve all meaning, emotional content, and progression exactly
- Do NOT add mystical, spiritual, or fortune-teller language
- Do NOT add generic horoscope phrases ("the stars suggest", "the universe", "manifest")
- Do NOT make it longer — tighten where possible
- Make it feel personal and specific to one individual, not generic
- Maintain this structure: recognition of pattern → past validation → current state → near-future tension
- Never start a paragraph with "I" or end with a question
- Output ONLY the polished text, no commentary, no labels, no markdown`

const LOCKED_POLISH_SYSTEM_PROMPT = `You are a writing editor for a personal AI advisor app called Futura.

Polish this locked reading continuation.

Rules:
- This is the deeper content revealed after the user pays to unlock their reading
- It should feel like a genuine continuation — more specific, more revealing
- Keep it 2–3 tight paragraphs
- Do NOT add mystical or generic language
- Make it feel like it's building directly on the teaser the user already read
- Output ONLY the polished text, no commentary`

export async function polishReading(composed: ComposedReading): Promise<PolishedReading> {
  const [teaserResult, lockedResult] = await Promise.all([
    openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 600,
      temperature: 0.7,
      messages: [
        { role: 'system', content: POLISH_SYSTEM_PROMPT },
        { role: 'user', content: composed.teaserRaw },
      ],
    }),
    openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 400,
      temperature: 0.7,
      messages: [
        { role: 'system', content: LOCKED_POLISH_SYSTEM_PROMPT },
        { role: 'user', content: composed.lockedRaw },
      ],
    }),
  ])

  return {
    teaserText: teaserResult.choices[0].message.content?.trim() ?? composed.teaserRaw,
    cutLine: composed.cutLine,
    lockedText: lockedResult.choices[0].message.content?.trim() ?? composed.lockedRaw,
  }
}
