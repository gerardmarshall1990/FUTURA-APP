'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar, PremiumButton, GoldDivider } from '@/components/shared'
import { useSessionStore } from '@/store'

interface Reading {
  id: string
  teaserText: string
  cutLine: string
  lockedText: string | null
  isUnlocked: boolean
}

// ─── Reading Paragraph ────────────────────────────────────────────────────────

function ReadingParagraph({ text, index }: { text: string; index: number }) {
  return (
    <p
      className="animate-fade-up"
      style={{
        color: 'var(--text-primary)',
        fontSize: '1rem',
        lineHeight: 1.8,
        letterSpacing: '0.005em',
        fontFamily: 'var(--font-body)',
        fontWeight: 300,
        animationDelay: `${0.15 + index * 0.12}s`,
      }}
    >
      {text}
    </p>
  )
}

// ─── Blurred Cut Line ─────────────────────────────────────────────────────────

function BlurredCutLine({ text }: { text: string }) {
  return (
    <div style={{ position: 'relative', marginTop: '0.5rem' }}>
      {/* Fade gradient mask */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(to bottom, transparent 0%, var(--bg) 85%)',
        borderRadius: '4px',
      }} />
      <p style={{
        color: 'var(--text-secondary)',
        fontSize: '1rem',
        lineHeight: 1.8,
        fontFamily: 'var(--font-body)',
        fontWeight: 300,
        filter: 'blur(4px)',
        userSelect: 'none',
        pointerEvents: 'none',
      }}>
        {text}
      </p>
    </div>
  )
}

// ─── Main Reading Page ────────────────────────────────────────────────────────

export default function ReadingPage() {
  const router = useRouter()
  const { userId } = useSessionStore()
  const [reading, setReading] = useState<Reading | null>(null)
  const [loading, setLoading] = useState(true)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!userId) { router.push('/'); return }

    fetch(`/api/reading/latest?userId=${userId}`)
      .then(r => r.json())
      .then(data => {
        setReading(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [userId, router])

  // Show paywall CTA when user scrolls near bottom
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 120)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  if (loading) {
    return (
      <main className="page" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading your reading...</div>
      </main>
    )
  }

  const paragraphs = reading?.teaserText?.split('\n\n').filter(Boolean) ?? []

  return (
    <main className="page" style={{ paddingBottom: '7rem' }}>
      <div className="page-inner">
        <TopBar />

        {/* Header */}
        <div className="animate-fade-up" style={{ paddingTop: '1rem', paddingBottom: '1.5rem' }}>
          <p style={{
            color: 'var(--gold)', fontSize: '0.72rem',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            marginBottom: '0.6rem',
          }}>
            Your reading
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.85rem', fontWeight: 300,
            letterSpacing: '-0.01em', lineHeight: 1.2,
          }}>
            What the patterns reveal
          </h1>
        </div>

        <GoldDivider />

        {/* Reading content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {paragraphs.map((para, i) => (
            <ReadingParagraph key={i} text={para} index={i} />
          ))}

          {/* Cut + blur */}
          {reading?.cutLine && (
            <div className="animate-fade-up" style={{ animationDelay: `${0.15 + paragraphs.length * 0.12}s` }}>
              <BlurredCutLine text={reading.cutLine + ' ' + (reading.lockedText?.slice(0, 80) ?? '')} />
            </div>
          )}
        </div>

        {/* Spacer for sticky CTA */}
        <div style={{ height: '3rem' }} />
      </div>

      {/* Sticky unlock CTA */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '1rem 1.25rem 2rem',
        background: 'linear-gradient(to top, var(--bg) 60%, transparent)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '0.5rem', zIndex: 10,
        transform: scrolled ? 'translateY(0)' : 'translateY(4px)',
        transition: 'transform 0.4s var(--ease-out)',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <PremiumButton
            onClick={() => router.push('/unlock')}
            size="lg"
          >
            Unlock your full insight
          </PremiumButton>
          <p style={{
            textAlign: 'center', marginTop: '0.6rem',
            color: 'var(--text-muted)', fontSize: '0.72rem',
            letterSpacing: '0.03em',
          }}>
            See what happens next · One-time from $4.99
          </p>
        </div>
      </div>
    </main>
  )
}
