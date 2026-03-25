/**
 * /api/reading/generate — POST (updated)
 *
 * Updated route handler that uses the full AI service layer.
 * Replaces the version in routes.ts — this is the production-ready version.
 *
 * Pipeline:
 * 1. Fetch user profile from Supabase
 * 2. Select reading blocks via readingBlockService
 * 3. Compose raw reading via readingCompositionService
 * 4. Polish via aiService.polishReading() (parallel OpenAI calls)
 * 5. Store in readings table
 * 6. Return reading to client
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { selectReadingBlocks } from '@/services/readingBlockService'
import { composeReading } from '@/services/readingCompositionService'
import { polishReading } from '@/services/aiService'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const supabase = createClient()

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found — complete onboarding first' }, { status: 404 })
    }

    // Step 1: Select blocks
    const blocks = selectReadingBlocks(
      {
        corePattern:      profile.core_pattern,
        emotionalPattern: profile.emotional_pattern,
        decisionPattern:  profile.decision_pattern,
        futureTheme:      profile.future_theme,
        identitySummary:  profile.identity_summary,
      },
      profile.focus_area,
      profile.current_state,
      profile.personality_trait,
      userId
    )

    // Step 2: Compose raw reading
    const composed = composeReading(blocks)

    // Step 3: Polish via AI (parallel calls — teaser + locked simultaneously)
    const polished = await polishReading(
      composed.teaserRaw,
      composed.lockedRaw,
      composed.cutLine,
      profile.identity_summary,
      profile.focus_area,
      profile.future_theme
    )

    // Step 4: Store reading
    const fullText = [polished.teaserText, polished.cutLine, polished.lockedText]
      .filter(Boolean)
      .join('\n\n')

    const { data: reading, error: readingError } = await supabase
      .from('readings')
      .insert({
        user_id:     userId,
        profile_id:  profile.id,
        teaser_text: polished.teaserText,
        cut_line:    polished.cutLine,
        locked_text: polished.lockedText,
        full_text:   fullText,
      })
      .select()
      .single()

    if (readingError) throw readingError

    // Track analytics event
    await supabase.from('analytics_events').insert({
      user_id:    userId,
      event_name: 'reading_generated',
      properties: {
        focus_area:       profile.focus_area,
        current_state:    profile.current_state,
        personality_trait: profile.personality_trait,
        core_pattern:     profile.core_pattern,
      },
    })

    return NextResponse.json({ reading })

  } catch (err) {
    console.error('[reading/generate]', err)
    return NextResponse.json(
      { error: 'Failed to generate reading. Please try again.' },
      { status: 500 }
    )
  }
}


/**
 * /api/chat/send — POST (updated)
 *
 * Updated chat route that:
 * - Uses aiService.sendAdvisorMessage() with full context injection
 * - Triggers memory extraction after every 6th user message
 * - Uses AI intent classification for high-stakes paywall decisions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import {
  sendAdvisorMessage,
  extractMemoryThemes,
  classifyMessageIntent,
  getAdvisorOpeningMessage,
} from '@/services/aiService'
import { shouldTriggerPaywall } from '@/services/stripeService'
import type { AdvisorSystemPromptInput } from '@/lib/prompts/advisorPrompt'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST_CHAT(req: NextRequest) {
  try {
    const { userId, sessionId, message } = await req.json()

    if (!userId || !message?.trim()) {
      return NextResponse.json({ error: 'userId and message required' }, { status: 400 })
    }

    const supabase = createClient()

    // ── 1. Fetch user state ──────────────────────────────────────────────────
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('remaining_chat_messages, unlock_status, subscription_status')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isSubscribed = user.subscription_status === 'active'
    const isUnlocked   = user.unlock_status || isSubscribed

    // ── 2. Fast paywall check (regex) ────────────────────────────────────────
    if (shouldTriggerPaywall(user.remaining_chat_messages, message, isUnlocked, isSubscribed)) {
      return NextResponse.json({ paywallTriggered: true }, { status: 402 })
    }

    // ── 3. Fetch context (parallel) ──────────────────────────────────────────
    const [
      { data: profile },
      { data: reading },
      { data: historyMessages },
    ] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single(),
      supabase
        .from('readings')
        .select('id, profile_id, teaser_text, locked_text')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      sessionId
        ? supabase
            .from('chat_messages')
            .select('role, content')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true })
            .limit(24) // Keep context window reasonable
        : { data: [] },
    ])

    if (!profile || !reading) {
      return NextResponse.json({ error: 'Context not found — reading may not be generated yet' }, { status: 404 })
    }

    // ── 4. AI intent check for borderline cases ───────────────────────────────
    // Only run AI classification if user has exactly 1 message left and is not unlocked
    // (avoid API cost on every message)
    if (!isUnlocked && user.remaining_chat_messages === 1) {
      const intent = await classifyMessageIntent(message, profile.focus_area)
      if (intent === 'high_intent') {
        return NextResponse.json({ paywallTriggered: true }, { status: 402 })
      }
    }

    // ── 5. Build advisor context ─────────────────────────────────────────────
    const advisorCtx: AdvisorSystemPromptInput = {
      identitySummary:  profile.identity_summary,
      corePattern:      profile.core_pattern,
      emotionalPattern: profile.emotional_pattern,
      decisionPattern:  profile.decision_pattern,
      futureTheme:      profile.future_theme,
      focusArea:        profile.focus_area,
      teaserText:       reading.teaser_text,
      lockedText:       isUnlocked ? reading.locked_text : undefined,
      isUnlocked,
      isSubscribed,
    }

    // ── 6. Send message to advisor ───────────────────────────────────────────
    const history = (historyMessages ?? []).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const response = await sendAdvisorMessage(advisorCtx, history, message)

    // ── 7. Create session if needed ──────────────────────────────────────────
    let activeSessionId = sessionId
    if (!activeSessionId) {
      const { data: newSession } = await supabase
        .from('chat_sessions')
        .insert({
          user_id:    userId,
          profile_id: reading.profile_id,
          reading_id: reading.id,
        })
        .select()
        .single()
      activeSessionId = newSession?.id
    }

    // ── 8. Persist messages + decrement counter (parallel) ───────────────────
    const newUserCount = isSubscribed ? 999 : Math.max(0, user.remaining_chat_messages - 1)

    await Promise.all([
      supabase.from('chat_messages').insert([
        { session_id: activeSessionId, role: 'user',      content: message },
        { session_id: activeSessionId, role: 'assistant', content: response },
      ]),
      isSubscribed
        ? Promise.resolve()
        : supabase
            .from('users')
            .update({ remaining_chat_messages: newUserCount })
            .eq('id', userId),
      supabase.from('analytics_events').insert({
        user_id:    userId,
        event_name: 'chat_message_sent',
        properties: { session_id: activeSessionId, remaining: newUserCount },
      }),
    ])

    // ── 9. Memory extraction (async, non-blocking) ────────────────────────────
    // Run after every 6 user messages — don't await, don't block the response
    const totalUserMessages = history.filter(m => m.role === 'user').length + 1
    if (totalUserMessages > 0 && totalUserMessages % 6 === 0) {
      const allMessages = [...history, { role: 'user' as const, content: message }, { role: 'assistant' as const, content: response }]

      // Fetch existing themes to avoid duplication
      supabaseAdmin
        .from('user_insights_memory')
        .select('key_theme')
        .eq('user_id', userId)
        .then(async ({ data: existing }) => {
          const existingKeys = (existing ?? []).map(t => t.key_theme)
          const themes = await extractMemoryThemes(allMessages, profile.identity_summary, existingKeys)

          if (themes.length > 0) {
            await Promise.all(
              themes.map(t =>
                supabaseAdmin.from('user_insights_memory').upsert(
                  { user_id: userId, key_theme: t.key_theme, description: t.description, source: 'chat' },
                  { onConflict: 'user_id,key_theme' }
                )
              )
            )
          }
        })
        .catch(err => console.error('[memory extraction]', err))
    }

    return NextResponse.json({
      response,
      sessionId: activeSessionId,
      remainingMessages: newUserCount,
    })

  } catch (err) {
    console.error('[chat/send]', err)
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 }
    )
  }
}
