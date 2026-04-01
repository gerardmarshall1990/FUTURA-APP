/**
 * clientAnalytics.ts
 *
 * Lightweight client-side analytics helper.
 * Auto-attaches session_id from sessionStorage so every event can be
 * grouped by browser session for funnel analysis.
 *
 * Usage: track(userId, 'reading_viewed', { focusArea: 'love' })
 * This is the single call point for all client-side event tracking.
 */

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  const KEY = 'futura_session_id'
  let id = sessionStorage.getItem(KEY)
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36)
    sessionStorage.setItem(KEY, id)
  }
  return id
}

/**
 * Fire-and-forget event tracking.
 * Adds session_id automatically. Never throws — analytics must never break UX.
 */
export function track(
  userId: string | null,
  eventName: string,
  properties?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return
  const payload = {
    userId,
    eventName,
    properties: {
      session_id: getSessionId(),
      ...properties,
    },
  }
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {})
}
