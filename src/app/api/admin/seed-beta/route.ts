/**
 * GET /api/admin/seed-beta?key=<secret>
 *
 * One-shot admin endpoint: finds the most recent user and upserts them
 * into beta_access, granting full paywall bypass for immediate testing.
 *
 * Protected by a shared secret (ADMIN_SEED_KEY env var, or the first 16
 * chars of SUPABASE_SERVICE_ROLE_KEY as a fallback — never the full key).
 *
 * Safe to leave deployed: returns 401 for every request without the key.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const provided = req.nextUrl.searchParams.get('key') ?? ''

  // Derive a short secret: custom env var preferred, else first 16 chars of service key
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  const expected = (process.env.ADMIN_SEED_KEY ?? serviceKey.slice(0, 16)).trim()

  if (!expected || provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = getAdminClient()

  // 1. Find the most recently created user
  const { data: users, error: usersErr } = await sb
    .from('users')
    .select('id, email, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (usersErr || !users || users.length === 0) {
    return NextResponse.json({ error: 'No users found', detail: usersErr?.message }, { status: 500 })
  }

  // Allow ?userId=<uuid> to target a specific user, otherwise use the latest
  const requestedId = req.nextUrl.searchParams.get('userId')
  const target = requestedId
    ? users.find(u => u.id === requestedId) ?? users[0]
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
    return NextResponse.json({ error: 'Failed to insert beta_access row', detail: upsertErr.message }, { status: 500 })
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
    message: `Beta access granted. User ${target.id} will now bypass all paywalls.`,
  })
}
