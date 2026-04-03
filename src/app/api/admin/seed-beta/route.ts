/**
 * GET /api/admin/seed-beta
 * GET /api/admin/seed-beta?userId=<uuid>
 *
 * Grants full access for testing by directly updating the users table.
 * Does NOT depend on the beta_access table existing.
 *
 * Sets on the user row:
 *   remaining_chat_messages = 999
 *   unlock_status = true
 *
 * Also attempts beta_access upsert if that table exists (best-effort).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'

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

  // 2. Update users table — this is the critical step, works without any migration
  const { error: userUpdateErr } = await sb
    .from('users')
    .update({
      remaining_chat_messages: 999,
      unlock_status: true,
    })
    .eq('id', target.id)

  if (userUpdateErr) {
    return NextResponse.json(
      { error: 'Failed to update users table', detail: userUpdateErr.message },
      { status: 500 },
    )
  }

  // 3. Best-effort: upsert into beta_access if the table exists
  let betaNote = 'skipped (table may not exist yet)'
  try {
    const { error: betaErr } = await sb
      .from('beta_access')
      .upsert(
        { user_id: target.id, code_used: 'ADMIN_SEED', activated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
    betaNote = betaErr ? `failed: ${betaErr.message}` : 'inserted'
  } catch {
    betaNote = 'table does not exist — not needed, users table update is sufficient'
  }

  // 4. Confirm what was written
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
    userRow,
    betaAccess: betaNote,
    recentUsers: users.map(u => ({ id: u.id, email: u.email, createdAt: u.created_at })),
    message: `Access granted to ${target.email ?? target.id}. remaining_chat_messages=999, unlock_status=true.`,
  })
}
