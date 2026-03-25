// ============================================================
// src/app/full-reading/page.tsx
// ============================================================
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TopBar, PremiumButton, GoldDivider } from '@/components/shared'
import { useSessionStore } from '@/store'

export default function FullReadingPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { userId, setUnlocked } = useSessionStore()
  const [reading, setReading] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // If returning from Stripe, mark as unlocked in local state
    if (params.get('unlocked') === 'true') setUnlocked()
  }, [params, setUnlocked])

  useEffect(() => {
    if (!userId) { router.push('/'); return }

    fetch(`/api/reading/latest?userId=${userId}`)
      .then(r => r.json())
      .then(data => { setReading(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [userId, router])

  if (loading) {
    return (
      <main className="page" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading...</div>
      </main>
    )
  }

  const teaserParagraphs = reading?.teaserText?.split('\n\n').filter(Boolean) ?? []
  const lockedParagraphs = reading?.lockedText?.split('\n\n').filter(Boolean) ?? []

  return (
    <main className="page" style={{ paddingBottom: '6rem' }}>
      <div className="page-inner">
        <TopBar />

        <div className="animate-fade-up" style={{ paddingTop: '1rem', paddingBottom: '1.5rem' }}>
          <p style={{
            color: 'var(--gold)', fontSize: '0.72rem',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            marginBottom: '0.6rem',
          }}>
            Full reading
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.85rem', fontWeight: 300,
            letterSpacing: '-0.01em', lineHeight: 1.2,
          }}>
            Your complete pattern
          </h1>
        </div>

        <GoldDivider />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {teaserParagraphs.map((para: string, i: number) => (
            <p key={i} className="animate-fade-up"
              style={{
                color: 'var(--text-primary)', fontSize: '1rem',
                lineHeight: 1.8, fontFamily: 'var(--font-body)',
                fontWeight: 300, animationDelay: `${i * 0.1}s`,
              }}>
              {para}
            </p>
          ))}

          {/* Divider between teaser and locked */}
          {lockedParagraphs.length > 0 && (
            <div style={{ padding: '0.5rem 0' }}>
              <div style={{
                height: 1, background: 'var(--border)',
                position: 'relative', overflow: 'visible',
              }}>
                <span style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%,-50%)',
                  background: 'var(--bg)', padding: '0 0.75rem',
                  color: 'var(--gold)', fontSize: '0.65rem',
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>
                  Deeper layer
                </span>
              </div>
            </div>
          )}

          {lockedParagraphs.map((para: string, i: number) => (
            <p key={`locked-${i}`}
              className="animate-fade-up"
              style={{
                color: 'var(--text-secondary)', fontSize: '1rem',
                lineHeight: 1.8, fontFamily: 'var(--font-body)',
                fontWeight: 300, animationDelay: `${(teaserParagraphs.length + i) * 0.1}s`,
              }}>
              {para}
            </p>
          ))}
        </div>

        <div style={{ height: '2rem' }} />
      </div>

      {/* Chat CTA */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '1rem 1.25rem 2rem',
        background: 'linear-gradient(to top, var(--bg) 60%, transparent)',
        zIndex: 10,
      }}>
        <div style={{ width: '100%', maxWidth: 420, margin: '0 auto' }}>
          <PremiumButton onClick={() => router.push('/chat')} size="lg">
            Ask your advisor →
          </PremiumButton>
        </div>
      </div>
    </main>
  )
}
