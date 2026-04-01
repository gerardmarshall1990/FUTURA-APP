'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ReadingError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter()

  useEffect(() => {
    console.error('[reading] error boundary caught:', error)
  }, [error])

  return (
    <main className="page" style={{ justifyContent: 'center', alignItems: 'center', gap: '1.25rem', padding: '2rem' }}>
      <p style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.4rem', fontWeight: 300,
        color: 'var(--text-primary)', textAlign: 'center',
        lineHeight: 1.3,
      }}>
        Your reading is being prepared.
      </p>
      <p style={{
        color: 'var(--text-muted)', fontSize: '0.85rem',
        textAlign: 'center', lineHeight: 1.6,
        maxWidth: 300,
      }}>
        Something interrupted the connection. Your reading is saved — tap below to try again.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%', maxWidth: 320 }}>
        <button
          onClick={reset}
          style={{
            width: '100%', padding: '14px',
            background: 'var(--gold)', border: 'none',
            borderRadius: '100px', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: '0.8rem',
            fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: '#080706',
          }}
        >
          Try again
        </button>
        <button
          onClick={() => router.push('/home')}
          style={{
            width: '100%', padding: '12px',
            background: 'none', border: '1px solid var(--border)',
            borderRadius: '100px', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: '0.8rem',
            color: 'var(--text-muted)', letterSpacing: '0.06em',
          }}
        >
          Go home
        </button>
      </div>
    </main>
  )
}
