import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import {
  sendAdvisorMessage,
  extractMemoryThemes,
  classifyMessageIntent,
} from '@/services/aiService'
import { shouldTriggerPaywall } from '@/services/stripeService'
import type { AdvisorSystemPromptInput } from '@/lib/prompts/advisorPrompt'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
)

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionId, message } = await req.json()

    if (!userId || !message?.trim()) {
      return NextResponse.json({ error: 'userId and message required' }, { status: 400 })
    }

    const supabase = createClient()

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

    if (shouldTriggerPaywall(user.remaining_chat_messages, message, isUnlocked, isSubscribed)) {
      return NextResponse.json({ paywallTriggered: true }, { status: 402 })
    }

    const [
      { data: profile },
      { data: reading },
      { data: historyMessages },
    ] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('user_id', userId).single(),
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
            .limit(24)
        : { data: [] },
    ])

    if (!profile || !reading) {
      return NextResponse.json({ error: 'Context not found' }, { status: 404 })
    }

    // AI intent check for borderline cases (only when 1 message left)
    if (!isUnlocked && user.remaining_chat_messages === 1) {
      const intent = await classifyMessageIntent(message, profile.focus_area)
      if (intent === 'high_intent') {
        return NextResponse.json({ paywallTriggered: true }, { status: 402 })
      }
    }

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

    const history = (historyMessages ?? []).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const response = await sendAdvisorMessage(advisorCtx, history, message)

    let activeSessionId = sessionId
    if (!activeSessionId) {
      const { data: newSession } = await supabase
        .from('chat_sessions')
        .insert({ user_id: userId, profile_id: reading.profile_id, reading_id: reading.id })
        .select()
        .single()
      activeSessionId = newSession?.id
    }

    const newUserCount = isSubscribed ? 999 : Math.max(0, user.remaining_chat_messages - 1)

    await Promise.all([
      supabase.from('chat_messages').insert([
        { session_id: activeSessionId, role: 'user',      content: message },
        { session_id: activeSessionId, role: 'assistant', content: response },
      ]),
      isSubscribed
        ? Promise.resolve()
        : supabase.from('users').update({ remaining_chat_messages: newUserCount }).eq('id', userId),
      supabase.from('analytics_events').insert({
        user_id:    userId,
        event_name: 'chat_message_sent',
        properties: { session_id: activeSessionId, remaining: newUserCount },
      }),
    ])

    // Memory extraction every 6 messages (non-blocking)
    const totalUserMessages = history.filter(m => m.role === 'user').length + 1
    if (totalUserMessages % 6 === 0) {
      const allMessages = [...history, { role: 'user' as const, content: message }, { role: 'assistant' as const, content: response }]
      Promise.resolve()
        .then(async () => {
          const { data: existing } = await supabaseAdmin.from('user_insights_memory').select('key_theme').eq('user_id', userId)
          const existingKeys = (existing ?? []).map((t: { key_theme: string }) => t.key_theme)
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

    return NextResponse.json({ response, sessionId: activeSessionId, remainingMessages: newUserCount })
  } catch (err) {
    console.error('[chat/send]', err)
    return NextResponse.json({ error: 'Failed to send message. Please try again.' }, { status: 500 })
  }
}
