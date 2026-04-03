/**
 * GET /api/admin/seed-beta
 * GET /api/admin/seed-beta?userId=<uuid>
 *
 * Full test-access grant. Does all of the following:
 *  1. Sets remaining_chat_messages=999 + unlock_status=true on users table
 *  2. Creates a stub user_profiles row if one doesn't exist (required for chat)
 *  3. Best-effort: inserts into beta_access if the table exists
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { normalizeProfile } from '@/services/profileNormalizationService'

export async function GET(req: NextRequest) {
  const sb = getAdminClient()

  // 1. Find recent users
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
    ? (users.find(u => u.id === requestedId) ?? users[0])
    : users[0]

  // 2. Update users table — unlock + max messages
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

  // 3. Create stub user_profiles if missing — required for assembleUserContext()
  //    Without this, chat/send returns 404 and chat shows empty bubbles.
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
      first_name: null,
      star_sign: null,
      life_path_number: null,
      belief_system: null,
    })

    profileNote = profileErr
      ? `failed to create: ${profileErr.message}`
      : 'stub created (focus=life_direction, state=turning_point)'
  }

  // 4. Best-effort: beta_access upsert
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
    betaNote = 'table does not exist — not needed'
  }

  // 5. Confirm
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
    recentUsers: users.map(u => ({ id: u.id, email: u.email, createdAt: u.created_at })),
    message: `Done. remaining_chat_messages=999, unlock_status=true, profile: ${profileNote}`,
  })
}
