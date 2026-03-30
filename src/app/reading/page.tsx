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
  firstName: string | null
  focusArea: string | null
  hoursRemaining: number | null
}

const FOCUS_DEPTH_LABELS: Record<string, string> = {
  love:           'what is building in your love life',
  money:          'the financial timing window your pattern is approaching',
  life_direction: 'the specific shift your pattern is moving toward',
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

// ─── Cut Zone ─────────────────────────────────────────────────────────────────

function CutZone({ cutLine, lockedPreview, focusArea }: {
  cutLine: string
  lockedPreview: string
  focusArea: string | null
}) {
  const depthLabel = focusArea ? FOCUS_DEPTH_LABELS[focusArea] : 'what is coming next in your pattern'

  return (
    <div style={{ position: 'relative', marginTop: '0.75rem' }}>
      {/* Context label above the blur */}
      <p style={{
        fontSize: '0.72rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'rgba(201,169,110,0.5)',
        fontFamily: 'var(--font-body)',
        marginBottom: '0.6rem',
      }}>
        Your reading continues — {depthLabel}
      </p>

      {/* Blurred cut line + locked preview */}
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(to bottom, transparent 0%, var(--bg) 80%)',
          borderRadius: '4px',
        }} />
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '1rem',
          lineHeight: 1.8,
          fontFamily: 'var(--font-body)',
          fontWeight: 300,
          filter: 'blur(5px)',
          userSelect: 'none',
          pointerEvents: 'none',
        }}>
          {cutLine} {lockedPreview}
        </p>
      </div>
    </div>
  )
}

// ─── Main Reading Page ────────────────────────────────────────────────────────

export default function ReadingPage() {
  const router = useRouter()
  const { userId } = useSessionStore()
  const [reading, setReading] = useState<Reading | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { router.push('/'); return }

    fetch(`/api/reading/latest?userId=${userId}`)
      .then(r => r.json())
      .then(data => {
        setReading(data)
        setLoading(false)
        // Track reading viewed — updates last_active_at for lifecycle state
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, eventName: 'teaser_viewed' }),
        }).catch(() => {})
      })
      .catch(() => setLoading(false))
  }, [userId, router])

  if (loading) {
    return (
      <main className="page" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading your reading...</div>
      </main>
    )
  }

  const paragraphs = reading?.teaserText?.split('\n\n').filter(Boolean) ?? []
  const name = reading?.firstName
  const focusArea = reading?.focusArea ?? null
  const hoursRemaining = reading?.hoursRemaining

  // Navigate to unlock with source context so paywall copy is relevant
  function goToUnlock() {
    router.push('/unlock?source=reading')
  }

  return (
    <main className="page" style={{ paddingBottom: '8rem' }}>
      <div className="page-inner">
        <TopBar />

        {/* Header */}
        <div className="animate-fade-up" style={{ paddingTop: '1rem', paddingBottom: '1.5rem' }}>
          <p style={{
            color: 'var(--gold)', fontSize: '0.72rem',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            marginBottom: '0.6rem',
          }}>
            {name ? `${name}'s reading` : 'Your reading'}
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

          {/* Cut zone with context */}
          {reading?.cutLine && (
            <div className="animate-fade-up" style={{ animationDelay: `${0.15 + paragraphs.length * 0.12}s` }}>
              <CutZone
                cutLine={reading.cutLine}
                lockedPreview={reading.lockedText?.slice(0, 90) ?? ''}
                focusArea={focusArea}
              />
            </div>
          )}
        </div>

        <div style={{ height: '3rem' }} />
      </div>

      {/* Sticky unlock CTA — visible on load */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '1rem 1.25rem 2rem',
        background: 'linear-gradient(to top, var(--bg) 65%, transparent)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '0.4rem', zIndex: 10,
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <PremiumButton onClick={goToUnlock} size="lg">
            {name ? `Continue ${name}'s reading` : 'Continue my reading'}
          </PremiumButton>

          {/* Urgency / trust line */}
          <p style={{
            textAlign: 'center', marginTop: '0.5rem',
            color: 'var(--text-muted)', fontSize: '0.7rem',
            letterSpacing: '0.03em',
          }}>
            {hoursRemaining && hoursRemaining > 0
              ? `Held for you · ${hoursRemaining} hours remaining · One-time from $4.99`
              : 'One-time from $4.99 · No subscription required'}
          </p>
        </div>
      </div>
    </main>
  )
}
