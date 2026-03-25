'use client'

/**
 * useAnalytics.ts
 *
 * React hook that wraps FuturaAnalytics for use in components.
 * Initializes PostHog once on mount. Exposes a stable `track` function.
 *
 * Usage:
 *   const { track, page } = useAnalytics()
 *   track('teaser_viewed', { focus_area: 'love' })
 *   page('Reading')
 */

import { useEffect, useRef, useCallback } from 'react'
import { FuturaAnalytics, EVENT_NAMES } from '@/services/analyticsService'
import { useSessionStore } from '@/store'

export { EVENT_NAMES }

export function useAnalytics() {
  const { userId } = useSessionStore()
  const analyticsRef = useRef<FuturaAnalytics | null>(null)

  useEffect(() => {
    if (!analyticsRef.current) {
      analyticsRef.current = new FuturaAnalytics(userId)
      analyticsRef.current.init()
    }
  }, [userId])

  useEffect(() => {
    if (analyticsRef.current && userId) {
      analyticsRef.current.identify(userId)
    }
  }, [userId])

  const track = useCallback((event: string, properties?: Record<string, unknown>) => {
    analyticsRef.current?.track(event, properties)
  }, [])

  const page = useCallback((pageName: string) => {
    analyticsRef.current?.page(pageName)
  }, [])

  return { track, page, EVENT_NAMES }
}

// ─── Page view tracker component ─────────────────────────────────────────────
// Wrap pages with this to auto-track page views

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function PageViewTracker({ pageName }: { pageName: string }) {
  const { page } = useAnalytics()
  const pathname = usePathname()

  useEffect(() => {
    page(pageName)
  }, [pathname, pageName, page])

  return null
}
