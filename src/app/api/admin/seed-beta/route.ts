/**
 * GET /api/admin/seed-beta
 * GET /api/admin/seed-beta?userId=<uuid>
 *
 * Upserts the most recent user (or specified userId) into beta_access,
 * granting full paywall bypass for testing. No auth required — this is
 * a test-only convenience endpoint.
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

  // 2. Upsert into beta_access
  const { error: upsertErr } = await sb
    .from('beta_access')
    .upsert(
      {
        user_id: target.id,
        code_used: 'ADMIN_SEED',
        activated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )

  if (upsertErr) {
    return NextResponse.json(
      { error: 'Failed to insert beta_access row', detail: upsertErr.message },
      { status: 500 },
    )
  }

  // 3. Verify the row was written
  const { data: verification } = await sb
    .from('beta_access')
    .select('user_id, code_used, activated_at')
    .eq('user_id', target.id)
    .maybeSingle()

  return NextResponse.json({
    success: true,
    grantedTo: {
      userId: target.id,
      email: target.email,
      createdAt: target.created_at,
    },
    betaAccessRow: verification,
    recentUsers: users.map(u => ({ id: u.id, email: u.email, createdAt: u.created_at })),
    message: `Beta access granted to ${target.email ?? target.id}`,
  })
}
