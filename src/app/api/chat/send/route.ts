export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { sendAdvisorMessage, extractMemoryThemes, classifyMessageIntent } from '@/services/aiService'
import { shouldTriggerPaywall } from '@/services/stripeService'
import { assembleUserContext } from '@/services/profileOrchestrator'
import { writeMemory } from '@/services/memoryService'
import { getAdminClient } from '@/lib/supabase/admin'
import { isBetaUser } from '@/lib/betaAccess'
import { trackEngagementEvent } from '@/services/analyticsService'

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionId, message } = await req.json()

    if (!userId || !message?.trim()) {
      return NextResponse.json({ error: 'userId and message required' }, { status: 400 })
    }

    // ── 1. Paywall check (fast — users table only) ─────────────────────────────
    const sb = getAdminClient()
    const { data: user, error: userError } = await sb
      .from('users')
      .select('remaining_chat_messages, unlock_status, subscription_status')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isSubscribed = user.subscription_status === 'active'
    const isUnlocked   = user.unlock_status || isSubscribed
    // Admin and beta users skip all paywall checks
    const fullBypass   = await isBetaUser(userId)

    if (!fullBypass && shouldTriggerPaywall(user.remaining_chat_messages, message, isUnlocked, isSubscribed)) {
      return NextResponse.json({ paywallTriggered: true, lastMessage: message }, { status: 402 })
    }

    // ── 2. Assemble full unified context ───────────────────────────────────────
    const ctx = await assembleUserContext(userId)
    if (!ctx) {
      return NextResponse.json({
        response: 'Your advisor needs your reading profile to respond. Go back to the home screen and complete the setup.',
        sessionId: null,
        remainingMessages: user.remaining_chat_messages,
      })
    }

    // ── 3. Fetch reading IDs + chat history in parallel ────────────────────────
    const [{ data: reading }, { data: historyMessages }] = await Promise.all([
      sb
        .from('readings')
        .select('id, profile_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      sessionId
        ? sb
            .from('chat_messages')
            .select('role, content')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true })
            .limit(24)
        : Promise.resolve({ data: [] }),
    ])

    // ── 4. High-intent paywall check (AI — only on last free message) ──────────
    if (!fullBypass && !isUnlocked && user.remaining_chat_messages === 1) {
      const intent = await classifyMessageIntent(message, ctx.focusArea as never)
      if (intent === 'high_intent') {
        return NextResponse.json({ paywallTriggered: true, lastMessage: message }, { status: 402 })
      }
    }

    // ── 5. Send message ────────────────────────────────────────────────────────
    const history = (historyMessages ?? []).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const response = await sendAdvisorMessage(ctx, history, message)

    // ── 6. Persist session + messages ──────────────────────────────────────────
    let activeSessionId = sessionId
    if (!activeSessionId && reading) {
      const { data: newSession } = await sb
        .from('chat_sessions')
        .insert({ user_id: userId, profile_id: reading.profile_id, reading_id: reading.id })
        .select()
        .single()
      activeSessionId = newSession?.id
    }

    const newCount = isSubscribed ? 999 : Math.max(0, user.remaining_chat_messages - 1)

    await Promise.all([
      sb.from('chat_messages').insert([
        { session_id: activeSessionId, role: 'user',      content: message },
        { session_id: activeSessionId, role: 'assistant', content: response },
      ]),
      fullBypass || isSubscribed
        ? Promise.resolve()
        : sb.from('users').update({ remaining_chat_messages: newCount }).eq('id', userId),
      sb.from('analytics_events').insert({
        user_id:    userId,
        event_name: 'chat_message_sent',
        properties: { session_id: activeSessionId, remaining: newCount, lifecycle: ctx.lifecycleState },
      }),
      trackEngagementEvent(userId, 'message_sent', {
        lifecycleState: ctx.lifecycleState,
        focusArea:      ctx.focusArea,
      }, { session_id: activeSessionId, remaining: newCount }),
    ])

    // ── 7. Memory extraction — every 6 user messages (non-blocking) ────────────
    const totalUserMessages = history.filter(m => m.role === 'user').length + 1
    if (totalUserMessages % 6 === 0) {
      const allMessages = [
        ...history,
        { role: 'user' as const, content: message },
        { role: 'assistant' as const, content: response },
      ]
      Promise.resolve()
        .then(async () => {
          const existingKeys = [
            ...ctx.memorySnapshot.behavioral,
            ...ctx.memorySnapshot.emotional,
          ].map(m => m.key)
          const themes = await extractMemoryThemes(allMessages, ctx.identitySummary, existingKeys)
          await Promise.all(
            themes.map(t =>
              writeMemory({
                user_id: userId,
                memory_type: t.memory_type ?? 'behavioral',
                key: t.key_theme,
                value: t.description,
                confidence: 0.7,
                source: 'chat',
              })
            )
          )
        })
        .catch(err => console.error('[memory extraction]', err))
    }

    void sb.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', userId)

    return NextResponse.json({ response, sessionId: activeSessionId, remainingMessages: newCount })
  } catch (err) {
    console.error('[chat/send]', err)
    return NextResponse.json({ error: 'Failed to send message. Please try again.' }, { status: 500 })
  }
}
