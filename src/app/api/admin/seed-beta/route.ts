import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { normalizeProfile } from '@/services/profileNormalizationService'

export async function GET(req: NextRequest) {
  const sb = getAdminClient()

  const { data: users, error: usersErr } = await sb
    .from('users')
    .select('id, email, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  if (usersErr || !users || users.length === 0) {
    return NextResponse.json(
      { error: 'No users found', detail: usersErr?.message },
      { status: 500 },
    )
  }

  const requestedId = req.nextUrl.searchParams.get('userId')
  const target = requestedId
    ? (users.find((u: { id: string }) => u.id === requestedId) ?? users[0])
    : users[0]

  const { error: userUpdateErr } = await sb
    .from('users')
    .update({ remaining_chat_messages: 999, unlock_status: true })
    .eq('id', target.id)

  if (userUpdateErr) {
    return NextResponse.json(
      { error: 'Failed to update users table', detail: userUpdateErr.message },
      { status: 500 },
    )
  }

  const { data: existingProfile } = await sb
    .from('user_profiles')
    .select('user_id')
    .eq('user_id', target.id)
    .maybeSingle()

  let profileNote = 'already exists'
  if (!existingProfile) {
    const defaults = {
      focusArea: 'life_direction' as const,
      currentState: 'turning_point' as const,
      personalityTrait: 'overthink_decisions' as const,
      ageBand: '25-34' as const,
    }
    const norm = normalizeProfile(defaults)
    const { error: profileErr } = await sb.from('user_profiles').insert({
      user_id: target.id,
      focus_area: defaults.focusArea,
      current_state: defaults.currentState,
      personality_trait: defaults.personalityTrait,
      age_band: defaults.ageBand,
      core_pattern: norm.corePattern,
      emotional_pattern: norm.emotionalPattern,
      decision_pattern: norm.decisionPattern,
      future_theme: norm.futureTheme,
      identity_summary: norm.identitySummary,
    })
    profileNote = profileErr ? `failed: ${profileErr.message}` : 'stub created'
  }

  let betaNote = 'skipped'
  try {
    const { error: betaErr } = await sb
      .from('beta_access')
      .upsert(
        { user_id: target.id, code_used: 'ADMIN_SEED', activated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
    betaNote = betaErr ? `failed: ${betaErr.message}` : 'inserted'
  } catch {
    betaNote = 'table does not exist'
  }

  const { data: userRow } = await sb
    .from('users')
    .select('id, remaining_chat_messages, unlock_status')
    .eq('id', target.id)
    .maybeSingle()

  return NextResponse.json({
    success: true,
    grantedTo: { userId: target.id, email: target.email },
    userRow,
    profileNote,
    betaAccess: betaNote,
    recentUsers: users.map((u: { id: string; email: string; createdAt: string }) => ({ id: u.id, email: u.email })),
    message: `Done. User ${target.id} has full access.`,
  })
}
