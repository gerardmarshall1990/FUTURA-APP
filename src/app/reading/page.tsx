'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar, PremiumButton, GoldDivider } from '@/components/shared'
import { useSessionStore } from '@/store'
import { track } from '@/lib/clientAnalytics'

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

// ─── Fallback teaser — shown when DB teaser is empty/null ─────────────────────
// Covers: failed reading generation, null teaser_text, API error response

function buildFallbackTeaser(name: string | null, focusArea: string | null): string[] {
  const who = name ?? 'You'
  const focusMap: Record<string, string> = {
    love:
      'The pattern in your connections is not random. It follows a sequence that your palm and your history make visible — and that sequence is about to complete a cycle.',
    money:
      'The timing window in your finances is more specific than you realise. Your palm shows a formation that appears in people approaching a financial shift — and your numbers align with it now.',
    life_direction:
      'The uncertainty you feel about direction is not a sign of being lost. It is a sign that something is completing. Your reading shows what is ending and what is beginning to take its place.',
  }
  const focusPara =
    (focusArea && focusMap[focusArea]) ??
    'The patterns in your palm and in your life reflect the same underlying sequence — and that sequence has a specific next step your reading makes visible.'

  return [
    `${who}, the lines in your palm are not vague. They are specific — and what they show about the next period of your life is not something most people ever discover.`,
    focusPara,
    'What follows this point in your reading is what you came here for.',
  ]
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
    <div style={{ marginTop: '0.25rem' }}>
      {/* Cut line — visible, creates the hook. Not blurred. */}
      <p style={{
        color: 'var(--text-primary)',
        fontSize: '1rem',
        lineHeight: 1.8,
        letterSpacing: '0.005em',
        fontFamily: 'var(--font-body)',
        fontWeight: 300,
        fontStyle: 'italic',
        opacity: 0.85,
      }}>
        {cutLine}
      </p>

      {/* Lock indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        margin: '1rem 0 0.75rem',
      }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(201,169,110,0.2)' }} />
        <p style={{
          fontSize: '0.62rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(201,169,110,0.45)',
          fontFamily: 'var(--font-body)',
          flexShrink: 0,
        }}>
          Reading locked · {depthLabel}
        </p>
        <div style={{ flex: 1, height: '1px', background: 'rgba(201,169,110,0.2)' }} />
      </div>

      {/* Blurred locked preview */}
      {lockedPreview && (
        <div style={{ position: 'relative' }}>
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
            filter: 'blur(5px)',
            userSelect: 'none',
            pointerEvents: 'none',
          }}>
            {lockedPreview}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Main Reading Page ────────────────────────────────────────────────────────

export default function ReadingPage() {
  const router = useRouter()
  const { userId } = useSessionStore()
  const [reading, setReading] = useState<Reading | null>(null)
  const [loading, setLoading] = useState(true)
  const cutZoneRef = useRef<HTMLDivElement>(null)
  const cutTrackedRef = useRef(false)

  useEffect(() => {
    if (!userId) { router.push('/'); return }

    fetch(`/api/reading/latest?userId=${userId}`)
      .then(r => r.json())
      .then(data => {
        // Guard: only accept a valid reading object (not an error response)
        if (data && typeof data.teaserText !== 'undefined') {
          setReading(data)
        } else {
          // API returned an error or empty response — set partial object so
          // we can still render the fallback teaser with any available fields
          setReading({
            id: '',
            teaserText: '',
            cutLine: '',
            lockedText: null,
            isUnlocked: false,
            firstName: data?.firstName ?? null,
            focusArea: data?.focusArea ?? null,
            hoursRemaining: null,
          })
        }
        setLoading(false)
        track(userId, 'reading_viewed', { focusArea: data?.focusArea ?? null })
      })
      .catch(() => {
        setReading(null)
        setLoading(false)
      })
  }, [userId, router])

  // Track cut_reached when the cut zone scrolls into view
  useEffect(() => {
    if (!cutZoneRef.current || cutTrackedRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !cutTrackedRef.current) {
          cutTrackedRef.current = true
          track(userId, 'cut_reached', { focusArea: reading?.focusArea ?? null })
          observer.disconnect()
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(cutZoneRef.current)
    return () => observer.disconnect()
  }, [userId, reading, loading])

  if (loading) {
    return (
      <main className="page" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading your reading...</div>
      </main>
    )
  }

  const name = reading?.firstName ?? null
  const focusArea = reading?.focusArea ?? null
  const hoursRemaining = reading?.hoursRemaining ?? null

  // Use DB teaser paragraphs if present; fall back to generated teaser
  const rawParagraphs = reading?.teaserText?.split('\n\n').filter(Boolean) ?? []
  const paragraphs = rawParagraphs.length > 0
    ? rawParagraphs
    : buildFallbackTeaser(name, focusArea)

  // Use DB cut line if present; fall back to a standard interruption signal
  const cutLine = reading?.cutLine || 'What follows from this is the part most people do not see until after the window has already passed —'

  function goToUnlock() {
    track(userId, 'paywall_viewed', { source: 'reading', focusArea })
    router.push('/unlock?source=reading')
  }

  function goToFullReading() {
    router.push('/full-reading')
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

        {/* Reading content — always renders (DB text or fallback) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {paragraphs.map((para, i) => (
            <ReadingParagraph key={i} text={para} index={i} />
          ))}

          {/* Cut zone with context — always shown. ref used for cut_reached event. */}
          <div ref={cutZoneRef} className="animate-fade-up" style={{ animationDelay: `${0.15 + paragraphs.length * 0.12}s` }}>
            <CutZone
              cutLine={cutLine}
              lockedPreview={reading?.lockedText?.slice(0, 90) ?? ''}
              focusArea={focusArea}
            />
          </div>
        </div>

        <div style={{ height: '3rem' }} />
      </div>

      {/* Sticky CTA — unlocked users go to full reading; locked users go to paywall */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '1rem 1.25rem 2rem',
        background: 'linear-gradient(to top, var(--bg) 65%, transparent)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '0.4rem', zIndex: 10,
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {reading?.isUnlocked ? (
            <>
              <PremiumButton onClick={goToFullReading} size="lg">
                {name ? `Read ${name}'s full reading` : 'Read full reading'}
              </PremiumButton>
              <p style={{
                textAlign: 'center', marginTop: '0.5rem',
                color: 'var(--text-muted)', fontSize: '0.7rem',
                letterSpacing: '0.03em',
              }}>
                Full reading unlocked
              </p>
            </>
          ) : (
            <>
              <PremiumButton onClick={goToUnlock} size="lg">
                {name ? `Continue ${name}'s reading` : 'Continue my reading'}
              </PremiumButton>
              <p style={{
                textAlign: 'center', marginTop: '0.5rem',
                color: 'var(--text-muted)', fontSize: '0.7rem',
                letterSpacing: '0.03em',
              }}>
                {hoursRemaining && hoursRemaining > 0
                  ? `Still held for you · One-time from $4.99`
                  : 'One-time from $4.99 · No subscription required'}
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

