// ============================================================
// /api/session/create — POST
// Creates or retrieves a user record from Supabase anonymous session
// ============================================================
// src/app/api/session/create/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()

    // Sign in anonymously — Supabase returns a stable UUID per device session
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously()
    if (authError) throw authError

    const guestId = authData.user?.id
    if (!guestId) throw new Error('No guest ID returned')

    // Upsert user record
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert({ guest_id: guestId }, { onConflict: 'guest_id' })
      .select()
      .single()

    if (userError) throw userError

    return NextResponse.json({ userId: user.id, guestId })
  } catch (err) {
    console.error('[session/create]', err)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}


// ============================================================
// /api/profile/create — POST
// Normalizes onboarding answers and stores identity profile
// ============================================================
// src/app/api/profile/create/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeProfile } from '@/services/profileNormalizationService'
import { seedMemoryFromOnboarding } from '@/services/stripeService'

export async function POST_profile(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, focusArea, currentState, personalityTrait, ageBand, palmImageUrl } = body

    if (!userId || !focusArea || !currentState || !personalityTrait || !ageBand) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const normalized = normalizeProfile({ focusArea, currentState, personalityTrait, ageBand })

    const supabase = createClient()

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .upsert(
        {
          user_id: userId,
          focus_area: focusArea,
          current_state: currentState,
          personality_trait: personalityTrait,
          age_band: ageBand,
          palm_image_url: palmImageUrl ?? null,
          core_pattern: normalized.corePattern,
          emotional_pattern: normalized.emotionalPattern,
          decision_pattern: normalized.decisionPattern,
          future_theme: normalized.futureTheme,
          identity_summary: normalized.identitySummary,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (error) throw error

    // Seed lightweight memory from onboarding answers
    await seedMemoryFromOnboarding(userId, focusArea, personalityTrait, currentState)

    return NextResponse.json({ profile })
  } catch (err) {
    console.error('[profile/create]', err)
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
  }
}


// ============================================================
// /api/reading/generate — POST
// Selects blocks, composes, polishes, stores reading
// ============================================================
// src/app/api/reading/generate/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { selectReadingBlocks } from '@/services/readingBlockService'
import { composeReading } from '@/services/readingCompositionService'
import { polishReading } from '@/services/aiPolishService'

export async function POST_reading_generate(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const supabase = createClient()

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Select blocks, compose, polish
    const blocks = selectReadingBlocks(
      {
        corePattern: profile.core_pattern,
        emotionalPattern: profile.emotional_pattern,
        decisionPattern: profile.decision_pattern,
        futureTheme: profile.future_theme,
        identitySummary: profile.identity_summary,
      },
      profile.focus_area,
      profile.current_state,
      profile.personality_trait,
      userId
    )

    const composed = composeReading(blocks)
    const polished = await polishReading(composed)

    const fullText = `${polished.teaserText}\n\n${polished.cutLine}\n\n${polished.lockedText}`

    const { data: reading, error: readingError } = await supabase
      .from('readings')
      .insert({
        user_id: userId,
        profile_id: profile.id,
        teaser_text: polished.teaserText,
        cut_line: polished.cutLine,
        locked_text: polished.lockedText,
        full_text: fullText,
      })
      .select()
      .single()

    if (readingError) throw readingError

    return NextResponse.json({ reading })
  } catch (err) {
    console.error('[reading/generate]', err)
    return NextResponse.json({ error: 'Failed to generate reading' }, { status: 500 })
  }
}


// ============================================================
// /api/reading/latest — GET
// Returns the latest reading for a user (teaser only if not unlocked)
// ============================================================
// src/app/api/reading/latest/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET_reading_latest(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  try {
    const supabase = createClient()

    const [{ data: user }, { data: reading }] = await Promise.all([
      supabase.from('users').select('unlock_status, subscription_status').eq('id', userId).single(),
      supabase
        .from('readings')
        .select('id, teaser_text, cut_line, locked_text, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
    ])

    if (!reading) return NextResponse.json({ error: 'No reading found' }, { status: 404 })

    const isUnlocked = user?.unlock_status || user?.subscription_status === 'active'

    return NextResponse.json({
      id: reading.id,
      teaserText: reading.teaser_text,
      cutLine: reading.cut_line,
      lockedText: isUnlocked ? reading.locked_text : null,
      isUnlocked,
    })
  } catch (err) {
    console.error('[reading/latest]', err)
    return NextResponse.json({ error: 'Failed to fetch reading' }, { status: 500 })
  }
}


// ============================================================
// /api/chat/send — POST
// Sends a message to the advisor, enforces message limits
// ============================================================
// src/app/api/chat/send/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendAdvisorMessage } from '@/services/chatAdvisorService'
import { shouldTriggerPaywall } from '@/services/stripeService'

export async function POST_chat_send(req: NextRequest) {
  try {
    const { userId, sessionId, message } = await req.json()
    if (!userId || !message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const supabase = createClient()

    // Fetch user state
    const { data: user } = await supabase
      .from('users')
      .select('remaining_chat_messages, unlock_status, subscription_status')
      .eq('id', userId)
      .single()

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const isSubscribed = user.subscription_status === 'active'
    const isUnlocked = user.unlock_status || isSubscribed

    // Check paywall
    if (shouldTriggerPaywall(user.remaining_chat_messages, message, isUnlocked, isSubscribed)) {
      return NextResponse.json({ paywallTriggered: true }, { status: 402 })
    }

    // Fetch profile, reading, and chat history
    const [{ data: profile }, { data: reading }, { data: historyMessages }] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('user_id', userId).single(),
      supabase
        .from('readings')
        .select('teaser_text, locked_text')
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
            .limit(20)
        : Promise.resolve({ data: [] }),
    ])

    if (!profile || !reading) {
      return NextResponse.json({ error: 'Context not found' }, { status: 404 })
    }

    const advisorContext = {
      identitySummary: profile.identity_summary,
      corePattern: profile.core_pattern,
      emotionalPattern: profile.emotional_pattern,
      decisionPattern: profile.decision_pattern,
      futureTheme: profile.future_theme,
      focusArea: profile.focus_area,
      teaserText: reading.teaser_text,
      lockedText: isUnlocked ? reading.locked_text : undefined,
    }

    const response = await sendAdvisorMessage(
      advisorContext,
      historyMessages ?? [],
      message
    )

    // Create session if needed, store messages, decrement counter
    let activeSessionId = sessionId
    if (!activeSessionId) {
      const { data: readingFull } = await supabase
        .from('readings')
        .select('id, profile_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const { data: newSession } = await supabase
        .from('chat_sessions')
        .insert({ user_id: userId, profile_id: readingFull!.profile_id, reading_id: readingFull!.id })
        .select()
        .single()

      activeSessionId = newSession?.id
    }

    await Promise.all([
      supabase.from('chat_messages').insert([
        { session_id: activeSessionId, role: 'user', content: message },
        { session_id: activeSessionId, role: 'assistant', content: response },
      ]),
      isSubscribed
        ? Promise.resolve() // Don't decrement for subscribers
        : supabase
            .from('users')
            .update({ remaining_chat_messages: Math.max(0, user.remaining_chat_messages - 1) })
            .eq('id', userId),
    ])

    return NextResponse.json({
      response,
      sessionId: activeSessionId,
      remainingMessages: isSubscribed ? 999 : Math.max(0, user.remaining_chat_messages - 1),
    })
  } catch (err) {
    console.error('[chat/send]', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}


// ============================================================
// /api/unlock — POST
// Creates a Stripe Checkout session for one-time unlock or subscription
// ============================================================
// src/app/api/unlock/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createUnlockCheckoutSession, createSubscriptionCheckoutSession } from '@/services/stripeService'

export async function POST_unlock(req: NextRequest) {
  try {
    const { userId, type, email } = await req.json()
    if (!userId || !type) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    let checkoutUrl: string

    if (type === 'unlock') {
      checkoutUrl = await createUnlockCheckoutSession(userId, email)
    } else if (type === 'subscription') {
      checkoutUrl = await createSubscriptionCheckoutSession(userId, email)
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ url: checkoutUrl })
  } catch (err) {
    console.error('[unlock]', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}


// ============================================================
// /api/subscription/webhook — POST
// Handles Stripe webhook events
// ============================================================
// src/app/api/subscription/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { handleStripeWebhook } from '@/services/stripeService'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST_webhook(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  try {
    const result = await handleStripeWebhook(body, signature)
    if (!result) return NextResponse.json({ received: true })

    const { userId, type, amount } = result

    if (type === 'unlock') {
      await supabaseAdmin.rpc('handle_unlock_purchase', {
        p_user_id: userId,
        p_amount: amount,
        p_metadata: { source: 'stripe' },
      })
    } else if (type === 'subscription') {
      await supabaseAdmin.rpc('handle_subscription_started', {
        p_user_id: userId,
        p_amount: amount,
        p_metadata: { source: 'stripe' },
      })
    } else if (type === 'subscription_cancelled') {
      await supabaseAdmin.rpc('handle_subscription_cancelled', {
        p_user_id: userId,
      })
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[webhook]', err)
    return NextResponse.json({ error: 'Webhook handling failed' }, { status: 400 })
  }
}
