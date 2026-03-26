'use client'

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

  const syncStatus = useCallback(async (retries = 0): Promise<void> => {
    if (!userId) return
    setIsLoading(true)

    try {
      const res = await fetch(`/api/paywall/status?userId=${userId}`)
      const serverStatus: PaywallStatus = await res.json()

      if (serverStatus.isSubscribed && !isSubscribed) {
        setSubscribed()
      } else if (serverStatus.isUnlocked && !isUnlocked) {
        setUnlocked()
      }

      setRemainingMessages(serverStatus.remainingMessages)

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

  useEffect(() => {
    const returningFromStripe = searchParams.get('unlocked') || searchParams.get('subscribed')
    if (returningFromStripe && userId) {
      syncStatus()
    }
  }, [searchParams, userId, syncStatus])

  return { status, isLoading, syncStatus }
}

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

      if (res.status === 409) return

      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (err) {
      console.error('[useCheckout]', err)
    } finally {
      setLoading(null)
    }
  }, [userId])

  return { startCheckout, isLoading: loading !== null, loadingType: loading }
}
