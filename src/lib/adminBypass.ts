/**
 * Admin bypass — server-side only.
 *
 * Set ADMIN_USER_IDS in your Vercel environment variables to a
 * comma-separated list of Supabase user UUIDs that should always be
 * treated as fully unlocked/subscribed (e.g. for testing all paid flows).
 *
 * Example:
 *   ADMIN_USER_IDS=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 *
 * To add multiple test accounts:
 *   ADMIN_USER_IDS=uuid1,uuid2,uuid3
 *
 * This value is never sent to the client — it is read only inside
 * API routes and server-side services.
 */
export function isAdminUser(userId: string): boolean {
  const raw = process.env.ADMIN_USER_IDS ?? ''
  if (!raw) return false
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .includes(userId)
}
