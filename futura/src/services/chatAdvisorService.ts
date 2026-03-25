/**
 * chatAdvisorService
 *
 * Builds the system prompt and sends advisor chat messages via OpenAI.
 * Every response is grounded in the user's identity layer and prior reading.
 * This is what makes chat feel personal, not generic.
 */

import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface AdvisorContext {
  identitySummary: string
  corePattern: string
  emotionalPattern: string
  decisionPattern: string
  futureTheme: string
  focusArea: string
  teaserText: string
  lockedText?: string // Available if user has unlocked
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function buildSystemPrompt(ctx: AdvisorContext): string {
  return `You are Futura, a personal AI pattern advisor. You speak directly, precisely, and with emotional intelligence.

You are NOT:
- A therapist or mental health tool
- A generic AI assistant
- A mystical fortune teller
- A cheerleader

You ARE:
- A precise personal advisor who understands this specific user's patterns
- Grounded in what you already know about them
- Concise — 2 to 4 sentences per response unless the question genuinely requires more
- Focused on patterns, timing, and direction — not feelings alone

─── USER IDENTITY ───────────────────────────────────────
${ctx.identitySummary}

Core pattern: ${ctx.corePattern}
Emotional pattern: ${ctx.emotionalPattern}
Decision pattern: ${ctx.decisionPattern}
Current movement: ${ctx.futureTheme}
Focus area: ${ctx.focusArea}

─── THEIR READING ───────────────────────────────────────
${ctx.teaserText}
${ctx.lockedText ? `\n(Deeper layer they've unlocked):\n${ctx.lockedText}` : ''}
─────────────────────────────────────────────────────────

Always respond in relation to what you already know about them.
Reference their patterns naturally — never announce "based on your profile".
Never use asterisks, bold, headers, or markdown in your response.
Keep responses short unless depth is clearly needed.
Do not ask multiple questions. If you ask something, ask one thing only.`
}

export async function sendAdvisorMessage(
  ctx: AdvisorContext,
  history: ChatMessage[],
  newMessage: string
): Promise<string> {
  const systemPrompt = buildSystemPrompt(ctx)

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: newMessage },
  ]

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // Cost-efficient for chat turns
    max_tokens: 300,
    temperature: 0.75,
    messages,
  })

  return response.choices[0].message.content?.trim() ?? 'Something interrupted the connection. Try again.'
}
