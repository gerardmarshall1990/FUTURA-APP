'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FuturaLogo, Orb, PremiumButton, GoldDivider } from '@/components/shared'
import { useSessionStore } from '@/store'

export default function LandingPage() {
  const router = useRouter()
  const { setSession, userId } = useSessionStore()
  const [loading, setLoading] = useState(false)

  // If session already exists, skip ahead
  useEffect(() => {
    if (userId) router.prefetch('/onboarding')
  }, [userId, router])

  async function handleStart() {
    setLoading(true)
    try {
      const res = await fetch('/api/session/create', { method: 'POST' })
      const { userId, guestId } = await res.json()
      setSession(userId, guestId)
      router.push('/onboarding')
    } catch {
      setLoading(false)
    }
  }

  return (
    <main className="page" style={{ justifyContent: 'space-between', paddingTop: '3rem', paddingBottom: '3rem' }}>

      {/* Top */}
      <div className="animate-fade-in" style={{ textAlign: 'center' }}>
        <FuturaLogo size="sm" />
      </div>

      {/* Center orb + headline */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 0 }}>

        <div className="animate-fade-in delay-200" style={{ marginBottom: '2.5rem' }}>
          <Orb size={220} intensity={1.2} />
        </div>

        <h1
          className="animate-fade-up delay-300"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.4rem, 8vw, 3.2rem)',
            fontWeight: 300,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            marginBottom: '1rem',
          }}
        >
          Understand<br />
          <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>what's next.</em>
        </h1>

        <p
          className="animate-fade-up delay-400"
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.925rem',
            lineHeight: 1.7,
            maxWidth: '280px',
            letterSpacing: '0.01em',
          }}
        >
          Your personal AI that reveals your patterns and what's quietly building.
        </p>

        <div className="animate-fade-up delay-500">
          <GoldDivider />
        </div>

        <div
          className="animate-fade-up delay-500"
          style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}
        >
          <span>Patterns</span>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span>Direction</span>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span>Timing</span>
        </div>
      </div>

      {/* CTA */}
      <div className="animate-fade-up delay-600" style={{ width: '100%', maxWidth: 420 }}>
        <PremiumButton onClick={handleStart} loading={loading} size="lg">
          Begin your reading
        </PremiumButton>
        <p style={{
          textAlign: 'center', marginTop: '1rem',
          color: 'var(--text-muted)', fontSize: '0.72rem',
          letterSpacing: '0.04em',
        }}>
          No account needed · Free to start
        </p>
      </div>

    </main>
  )
}
