import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _adminClient: SupabaseClient | null = null

/**
 * Lazy singleton Supabase admin client.
 *
 * NEVER call createClient() at module scope — doing so runs during Next.js
 * build-time static analysis before env vars are available, which throws
 * "supabaseUrl is required" and fails the Vercel build.
 *
 * This function is called only when a request is being handled, so env vars
 * are guaranteed to be present. Throws with a clear message if they are not.
 */
export function getAdminClient(): SupabaseClient {
  if (_adminClient) return _adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error('[Supabase] NEXT_PUBLIC_SUPABASE_URL is not configured')
  if (!key) throw new Error('[Supabase] SUPABASE_SERVICE_ROLE_KEY is not configured')

  _adminClient = createClient(url, key)
  return _adminClient
}
