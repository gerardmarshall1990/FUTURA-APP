'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FuturaLogo, Orb } from '@/components/shared'

const STEPS = [
  'Analyzing your patterns',
  'Interpreting emotional signals',
  'Mapping what\'s building',
  'Composing your reading',
]

export default function GeneratingPage() {
  const router = useRouter()
  const [stepIndex, setStepIndex] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Cycle through loading messages
    const interval = setInterval(() => {
      setStepIndex(i => {
        if (i >= STEPS.length - 1) {
          clearInterval(interval)
          return i
        }
        return i + 1
      })
    }, 950)

    // Navigate after full animation
    const timeout = setTimeout(() => {
      setDone(true)
      setTimeout(() => router.push('/reading'), 600)
    }, 4200)

    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [router])

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
        alignItems: 'center', textAlign: 'center', gap: '2.5rem',
        opacity: done ? 0 : 1,
        transition: 'opacity 0.5s ease',
      }}>

        {/* Logo */}
        <div className="animate-fade-in">
          <FuturaLogo size="sm" />
        </div>

        {/* Animated orb with rotating ring */}
        <div style={{ position: 'relative' }}>
          <Orb size={180} intensity={1.4} animated />

          {/* Outer rotating ring */}
          <div style={{
            position: 'absolute',
            inset: -16,
            borderRadius: '50%',
            border: '1px solid rgba(201,169,110,0.12)',
            borderTopColor: 'rgba(201,169,110,0.45)',
            animation: 'rotate-slow 3s linear infinite',
          }} />

          {/* Inner counter-rotating ring */}
          <div style={{
            position: 'absolute',
            inset: -6,
            borderRadius: '50%',
            border: '1px solid rgba(201,169,110,0.08)',
            borderBottomColor: 'rgba(201,169,110,0.3)',
            animation: 'rotate-slow 2s linear infinite reverse',
          }} />
        </div>

        {/* Animated status text */}
        <div style={{ minHeight: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <p
            key={stepIndex}
            className="animate-fade-up"
            style={{
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
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

          {/* Dot progress indicators */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '0.5rem' }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === stepIndex ? 16 : 4,
                  height: 4,
                  borderRadius: 2,
                  background: i <= stepIndex ? 'var(--gold)' : 'var(--border)',
                  transition: 'all 0.4s var(--ease-out)',
                  opacity: i <= stepIndex ? 1 : 0.4,
                }}
              />
            ))}
          </div>
        </div>

      </div>
    </main>
  )
}
