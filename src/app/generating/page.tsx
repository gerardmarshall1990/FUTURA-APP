'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FuturaLogo, Orb } from '@/components/shared'
import { useOnboardingStore } from '@/store'

const STEPS = [
  'Mapping your palm lines',
  'Cross-referencing your star sign',
  'Interpreting emotional signals',
  'Analyzing decision patterns',
  'Identifying what is building',
  'Composing your personal reading',
]

const CHECKLIST = [
  'Palm analyzed',
  'Star sign applied',
  'Patterns identified',
  'Emotional signals read',
  'Reading composed',
]

export default function GeneratingPage() {
  const router = useRouter()
  const { name } = useOnboardingStore()
  const [stepIndex, setStepIndex] = useState(0)
  const [checkDone, setCheckDone] = useState<boolean[]>(new Array(CHECKLIST.length).fill(false))
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Cycle through loading messages at 1600ms
    const interval = setInterval(() => {
      setStepIndex(i => {
        if (i >= STEPS.length - 1) {
          clearInterval(interval)
          return i
        }
        return i + 1
      })
    }, 1600)

    // Tick checklist items
    CHECKLIST.forEach((_, i) => {
      setTimeout(() => {
        setCheckDone(prev => {
          const next = [...prev]
          next[i] = true
          return next
        })
      }, 1800 * (i + 1))
    })

    // Navigate after animation. The reading was generated before this page loaded,
    // so we go straight to /reading. If it's somehow not ready, /reading shows the
    // fallback teaser — no dead-end possible.
    const timeout = setTimeout(() => {
      setDone(true)
      setTimeout(() => router.replace('/reading'), 600)
    }, STEPS.length * 1600 + 800)

    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [router])

  const displayName = name || 'Seeker'

  return (
    <main
      className="page"
      style={{ justifyContent: 'center', alignItems: 'center', gap: 0 }}
    >
      {/* Background radial bloom */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(201,169,110,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', textAlign: 'center', gap: '2rem',
        opacity: done ? 0 : 1,
        transition: 'opacity 0.5s ease',
        maxWidth: 340,
      }}>

        {/* Logo */}
        <div className="animate-fade-in">
          <FuturaLogo size="sm" />
        </div>

        {/* Name heading */}
        <h2 className="animate-fade-up delay-100" style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.4rem', fontWeight: 300,
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
        }}>
          {displayName}, your reading is being built...
        </h2>

        {/* Animated orb with rotating ring */}
        <div style={{ position: 'relative' }}>
          <Orb size={160} intensity={1.4} animated />
          <div style={{
            position: 'absolute', inset: -16, borderRadius: '50%',
            border: '1px solid rgba(201,169,110,0.12)',
            borderTopColor: 'rgba(201,169,110,0.45)',
            animation: 'rotate-slow 3s linear infinite',
          }} />
          <div style={{
            position: 'absolute', inset: -6, borderRadius: '50%',
            border: '1px solid rgba(201,169,110,0.08)',
            borderBottomColor: 'rgba(201,169,110,0.3)',
            animation: 'rotate-slow 2s linear infinite reverse',
          }} />
        </div>

        {/* Animated status text */}
        <div style={{ minHeight: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <p
            key={stepIndex}
            className="animate-fade-up"
            style={{
              color: 'var(--text-primary)',
              fontSize: '0.88rem',
              letterSpacing: '0.04em',
              fontFamily: 'var(--font-body)',
              fontWeight: 300,
            }}
          >
            {STEPS[stepIndex]}
            <span style={{
              display: 'inline-block',
              animation: 'blink 1.2s ease infinite',
              marginLeft: 2,
              color: 'var(--gold)',
            }}>.</span>
          </p>
        </div>

        {/* Checklist */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
          alignItems: 'flex-start', width: '100%', paddingLeft: '1rem',
        }}>
          {CHECKLIST.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              opacity: checkDone[i] ? 1 : 0.3,
              transition: 'opacity 0.4s ease',
            }}>
              <span style={{
                color: checkDone[i] ? 'var(--gold)' : 'var(--text-muted)',
                fontSize: '0.75rem',
                transition: 'color 0.4s ease',
              }}>
                {checkDone[i] ? '✓' : '○'}
              </span>
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: '0.75rem',
                color: checkDone[i] ? 'var(--text-secondary)' : 'var(--text-muted)',
                letterSpacing: '0.03em',
                transition: 'color 0.4s ease',
              }}>
                {item}
              </span>
            </div>
          ))}
        </div>

      </div>
    </main>
  )
}
