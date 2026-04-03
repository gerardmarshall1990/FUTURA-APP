'use client'

import { useEffect } from 'react'

export default function HomeError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('[home] error boundary caught:', error)
  }, [error])

  return (
    <main className="page" style={{ justifyContent: 'center', alignItems: 'center', gap: '1.25rem', padding: '2rem' }}>
      <p style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.4rem', fontWeight: 300,
        color: 'var(--text-primary)', textAlign: 'center',
        lineHeight: 1.3,
      }}>
        Something went wrong loading your dashboard.
      </p>
      <p style={{
        color: 'var(--text-muted)', fontSize: '0.85rem',
        textAlign: 'center', lineHeight: 1.6,
        maxWidth: 300,
      }}>
        Your reading and conversation are safe. Tap below to reload.
      </p>
      <button
        onClick={reset}
        style={{
          padding: '14px 2rem',
          background: 'var(--gold)', border: 'none',
          borderRadius: '100px', cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontSize: '0.8rem',
          fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: '#080706',
        }}
      >
        Reload
      </button>
    </main>
  )
}
