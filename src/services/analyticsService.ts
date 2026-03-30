/**
 * analyticsService.ts
 *
 * Dual-track analytics for Futura:
 * 1. PostHog (cloud) — funnel analysis, session recording, A/B tests
 * 2. Supabase analytics_events table — queryable event log for custom SQL analysis
 *
 * Both write on every event. PostHog is the primary tool for dashboards.
 * The local table is a safety net and enables custom queries without PostHog limits.
 *
 * Event taxonomy: every screen transition and key user action is tracked.
 * See EVENT_NAMES for the full list.
 */

import { createClient } from '@supabase/supabase-js'

// ─── Admin client for server-side writes ─────────────────────────────────────

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
)

// ─── Event catalogue ──────────────────────────────────────────────────────────

export const EVENT_NAMES = {
  // Acquisition & onboarding
  APP_OPENED:              'app_opened',
  ONBOARDING_STARTED:      'onboarding_started',
  PALM_UPLOADED:           'palm_uploaded',
  PALM_SKIPPED:            'palm_skipped',
  QUESTION_ANSWERED:       'question_answered',
  ONBOARDING_COMPLETED:    'onboarding_completed',
  ONBOARDING_ABANDONED:    'onboarding_abandoned',

  // Reading
  READING_GENERATED:       'reading_generated',
  TEASER_VIEWED:           'teaser_viewed',
  TEASER_SCROLLED:         'teaser_scrolled',
  FULL_READING_VIEWED:     'full_reading_viewed',

  // Paywall & conversion
  UNLOCK_PAYWALL_VIEWED:   'unlock_paywall_viewed',
  UNLOCK_PURCHASED:        'unlock_purchased',
  SUBSCRIPTION_PAYWALL_VIEWED: 'subscription_paywall_viewed',
  SUBSCRIPTION_STARTED:    'subscription_started',
  SUBSCRIPTION_RENEWED:    'subscription_renewed',
  SUBSCRIPTION_CANCELLED:  'subscription_cancelled',
  PAYMENT_FAILED:          'payment_failed',
  CHECKOUT_ABANDONED:      'checkout_abandoned',

  // Chat
  CHAT_STARTED:            'chat_started',
  CHAT_MESSAGE_SENT:       'chat_message_sent',
  CHAT_PAYWALL_HIT:        'chat_paywall_hit',
  UPGRADE_MODAL_SHOWN:     'upgrade_modal_shown',
  UPGRADE_MODAL_DISMISSED: 'upgrade_modal_dismissed',

  // Engagement
  READING_SHARED:          'reading_shared',
  SESSION_RESUMED:         'session_resumed',
} as const

export type EventName = typeof EVENT_NAMES[keyof typeof EVENT_NAMES]

// ─── Server-side event tracking ───────────────────────────────────────────────

/**
 * Track an event server-side (from route handlers).
 * Writes to Supabase analytics_events table.
 * PostHog server-side SDK can be added here later.
 */
export async function trackEvent(
  userId: string | null,
  eventName: string,
  properties?: Record<string, unknown>
): Promise<void> {
  try {
    await supabaseAdmin.from('analytics_events').insert({
      user_id:    userId,
      event_name: eventName,
      properties: properties ?? {},
    })
  } catch (err) {
    // Never throw on analytics failure — log and move on
    console.error('[analytics] Failed to track event:', eventName, err)
  }
}

/**
 * Track a conversion event with extra context for funnel analysis.
 */
export async function trackConversion(
  userId: string,
  type: 'unlock' | 'subscription',
  amount: number,
  sessionData?: Record<string, unknown>
): Promise<void> {
  const eventName = type === 'unlock'
    ? EVENT_NAMES.UNLOCK_PURCHASED
    : EVENT_NAMES.SUBSCRIPTION_STARTED

  await trackEvent(userId, eventName, {
    amount,
    currency: 'usd',
    type,
    ...sessionData,
  })
}

// ─── Client-side analytics class ─────────────────────────────────────────────
// Use this in React components — it calls /api/analytics/track

export class FuturaAnalytics {
  private userId: string | null
  private queue: Array<{ event: string; props?: Record<string, unknown> }> = []
  private posthogLoaded = false

  constructor(userId: string | null) {
    this.userId = userId
  }

  async init(): Promise<void> {
    if (typeof window === 'undefined') return
    if (this.posthogLoaded) return

    try {
      const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
      if (!posthogKey) return

      const { default: posthog } = await import('posthog-js')
      posthog.init(posthogKey, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
        capture_pageview: false, // Manual page view tracking
        capture_pageleave: true,
        autocapture: false,      // Manual event tracking only
        persistence: 'localStorage',
      })

      if (this.userId) {
        posthog.identify(this.userId)
      }

      this.posthogLoaded = true

      // Flush queued events
      this.queue.forEach(({ event, props }) => this.track(event, props))
      this.queue = []
    } catch {
      // PostHog failed to load — degrade gracefully
    }
  }

  track(event: string, properties?: Record<string, unknown>): void {
    if (typeof window === 'undefined') return

    // PostHog client-side track
    if (this.posthogLoaded) {
      try {
        const posthog = (window as unknown as { posthog?: { capture: (e: string, p?: unknown) => void } }).posthog
        posthog?.capture(event, {
          futura_user_id: this.userId,
          ...properties,
        })
      } catch { /* ignore */ }
    } else {
      // Queue until PostHog is ready
      this.queue.push({ event, props: properties })
    }

    // Also write to Supabase via API (server-side persistence)
    if (this.userId) {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          eventName: event,
          properties,
        }),
      }).catch(() => { /* fire and forget */ })
    }
  }

  identify(userId: string): void {
    this.userId = userId
    if (this.posthogLoaded && typeof window !== 'undefined') {
      try {
        const posthog = (window as unknown as { posthog?: { identify: (id: string) => void } }).posthog
        posthog?.identify(userId)
      } catch { /* ignore */ }
    }
  }

  page(pageName: string): void {
    this.track('page_viewed', { page: pageName, url: window.location.pathname })
  }
}

