/**
 * betaAccess.ts — server-side only.
 *
 * Beta users bypass all paywalls for testing without Stripe.
 * Codes live in BETA_ACCESS_CODES (comma-separated, env-only).
 * Activation is stored in the beta_access table.
 *
 * This file must never be imported by client components.
 * Codes are never sent to the browser under any path.
 */

import { getAdminClient } from '@/lib/supabase/admin'
import { isAdminUser } from '@/lib/adminBypass'

/**
 * Validates a code against the BETA_ACCESS_CODES env var.
 * Case-insensitive. Returns true if the code is in the list.
 * Safe when env var is empty or unset.
 */
export function isValidBetaCode(code: string): boolean {
  const raw = process.env.BETA_ACCESS_CODES ?? ''
  if (!raw.trim()) return false
  const normalised = code.trim().toUpperCase()
  return raw
    .split(',')
    .map(c => c.trim().toUpperCase())
    .filter(Boolean)
    .includes(normalised)
}

/**
 * Returns true if the user has activated a beta code OR is an admin.
 * Single indexed DB lookup — fast, no caching needed.
 *
 * Admin users are included so isBetaUser() can be used as a single
 * combined full-access check throughout gated routes.
 */
export async function isBetaUser(userId: string): Promise<boolean> {
  if (isAdminUser(userId)) return true
  try {
    const { data } = await getAdminClient()
      .from('beta_access')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    return data !== null
  } catch {
    // Never block access due to a DB error in the beta check
    return false
  }
}

/**
 * Activates a beta code for a user.
 * Upserts so re-activating a (different valid) code just updates the record.
 * Returns 'ok' | 'invalid_code' | 'error'.
 */
export async function activateBetaCode(
  userId: string,
  code: string,
): Promise<'ok' | 'invalid_code' | 'error'> {
  if (!isValidBetaCode(code)) return 'invalid_code'

  try {
    const { error } = await getAdminClient()
      .from('beta_access')
      .upsert(
        { user_id: userId, code_used: code.trim().toUpperCase(), activated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
    if (error) throw error
    return 'ok'
  } catch (err) {
    console.error('[betaAccess] Failed to activate code:', err)
    return 'error'
  }
}
