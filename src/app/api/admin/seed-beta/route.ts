/**
 * GET /api/admin/seed-beta
 * GET /api/admin/seed-beta?userId=<uuid>
 *
 * Grants full beta access for testing:
 *  - Upserts a row into beta_access (server-side paywall bypass via isBetaUser())
 *  - Sets remaining_chat_messages = 999 on the users table
 *  - Sets unlock_status = true on the users table
 * No auth required — test convenience endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const sb = getAdminClient()

  // 1. Find the most recently created users
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

  // Allow ?userId=<uuid> to target a specific user, otherwise use the latest
  const requestedId = req.nextUrl.searchParams.get('userId')
  const target = requestedId
    ? (users.find(u => u.id === requestedId) ?? users[0])
    : users[0]

  // 2. Upsert into beta_access (server-side bypass via isBetaUser())
  const { error: betaErr } = await sb
    .from('beta_access')
    .upsert(
      {
        user_id: target.id,
        code_used: 'ADMIN_SEED',
        activated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )

  // 3. Also update users table directly — ensures chat and reading work
  //    even before the client store is refreshed
  const { error: userUpdateErr } = await sb
    .from('users')
    .update({
      remaining_chat_messages: 999,
      unlock_status: true,
    })
    .eq('id', target.id)

  if (betaErr || userUpdateErr) {
    return NextResponse.json(
      {
        error: 'Partial failure — see details',
        betaErr: betaErr?.message ?? null,
        userUpdateErr: userUpdateErr?.message ?? null,
      },
      { status: 500 },
    )
  }

  // 4. Verify
  const { data: verification } = await sb
    .from('beta_access')
    .select('user_id, code_used, activated_at')
    .eq('user_id', target.id)
    .maybeSingle()

  const { data: userRow } = await sb
    .from('users')
    .select('id, remaining_chat_messages, unlock_status')
    .eq('id', target.id)
    .maybeSingle()

  return NextResponse.json({
    success: true,
    grantedTo: {
      userId: target.id,
      email: target.email,
    },
    betaAccessRow: verification,
    userRow,
    recentUsers: users.map(u => ({ id: u.id, email: u.email, createdAt: u.created_at })),
    message: `Full access granted to ${target.email ?? target.id}. remaining_chat_messages=999, unlock_status=true, beta_access row inserted.`,
  })
}
