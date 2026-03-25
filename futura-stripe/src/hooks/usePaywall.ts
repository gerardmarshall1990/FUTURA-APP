'use client'

/**
 * usePaywall.ts
 *
 * Handles paywall state sync between Stripe, the server, and local Zustand store.
 *
 * Key problem it solves:
 * After a Stripe Checkout redirect, the client returns to the app with
 * ?unlocked=true or ?subscribed=true in the URL. We can't trust the URL param
 * alone — the webhook may not have fired yet. This hook polls the server until
 * the DB state confirms the purchase, then updates local state.
 *
 * Usage:
 *   const { status, isLoading, syncStatus } = usePaywall()
 */

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSessionStore } from '@/store'

export interface PaywallStatus {
  canChat: boolean
  canViewFullReading: boolean
  remainingMessages: number
  isUnlocked: boolean
  isSubscribed: boolean
}

const DEFAULT_STATUS: PaywallStatus = {
  canChat: true,
  canViewFullReading: false,
  remainingMessages: 2,
  isUnlocked: false,
  isSubscribed: false,
}

export function usePaywall() {
  const { userId, isUnlocked, isSubscribed, remainingMessages, setUnlocked, setSubscribed, setRemainingMessages } = useSessionStore()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)

  const status: PaywallStatus = {
    canChat: remainingMessages > 0,
    canViewFullReading: isUnlocked || isSubscribed,
    remainingMessages,
    isUnlocked,
    isSubscribed,
  }

  /**
   * Fetch current paywall state from server and sync to local store.
   * Call this after returning from Stripe or on app resume.
   */
  const syncStatus = useCallback(async (retries = 0): Promise<void> => {
    if (!userId) return
    setIsLoading(true)

    try {
      const res = await fetch(`/api/paywall/status?userId=${userId}`)
      const serverStatus: PaywallStatus = await res.json()

      // Update Zustand store to match server state
      if (serverStatus.isSubscribed && !isSubscribed) {
        setSubscribed()
      } else if (serverStatus.isUnlocked && !isUnlocked) {
        setUnlocked()
      }

      setRemainingMessages(serverStatus.remainingMessages)

      // If returning from Stripe and server hasn't updated yet, poll once
      const returningFromStripe = searchParams.get('unlocked') || searchParams.get('subscribed')
      if (returningFromStripe && !serverStatus.isUnlocked && !serverStatus.isSubscribed && retries < 3) {
        setTimeout(() => syncStatus(retries + 1), 1500)
        return
      }

    } catch (err) {
      console.error('[usePaywall] Failed to sync status:', err)
    } finally {
      setIsLoading(false)
    }
  }, [userId, isSubscribed, isUnlocked, searchParams, setSubscribed, setUnlocked, setRemainingMessages])

  // Auto-sync on mount if returning from Stripe
  useEffect(() => {
    const returningFromStripe = searchParams.get('unlocked') || searchParams.get('subscribed')
    if (returningFromStripe && userId) {
      syncStatus()
    }
  }, [searchParams, userId, syncStatus])

  return { status, isLoading, syncStatus }
}

// ─── useCheckout hook ─────────────────────────────────────────────────────────
// Handles initiating Stripe Checkout from any component

import { useState } from 'react'

export type CheckoutType = 'unlock' | 'subscription'

export function useCheckout() {
  const { userId } = useSessionStore()
  const [loading, setLoading] = useState<CheckoutType | null>(null)

  const startCheckout = useCallback(async (type: CheckoutType, email?: string) => {
    if (!userId) return
    setLoading(type)

    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, type, email }),
      })

      if (res.status === 409) {
        // Already purchased — just sync state
        return
      }

      const { url } = await res.json()
      if (url) window.location.href = url

    } catch (err) {
      console.error('[useCheckout]', err)
    } finally {
      setLoading(null)
    }
  }, [userId])

  return {
    startCheckout,
    isLoading: loading !== null,
    loadingType: loading,
  }
}
