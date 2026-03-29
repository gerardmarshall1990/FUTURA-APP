'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FuturaLogo, Orb, PremiumButton } from '@/components/shared'
import { useSessionStore } from '@/store'

// ─── Feature Cards Data ──────────────────────────────────────────────────────

const FEATURES = [
  { icon: '🤚', label: 'Palm Reading', tag: '', desc: 'AI-powered palmistry from a single photo of your hand' },
  { icon: '💬', label: 'Ask Anything', tag: 'LIVE CHAT', desc: 'A personal advisor that already knows your patterns' },
  { icon: '📅', label: 'Daily Insight', tag: 'NEW DAILY', desc: 'A fresh personal insight delivered every morning' },
  { icon: '📡', label: 'Life Events', tag: 'SUBSCRIBERS', desc: 'Pattern alerts when shifts are approaching your timeline' },
]

// ─── Proof Strip Data ────────────────────────────────────────────────────────

const PROOF = [
  { value: '5K Yrs', label: 'proven' },
  { value: '1 Palm.', label: 'Yours.' },
  { value: '∞', label: 'Questions' },
]

export default function LandingPage() {
  const router = useRouter()
  const { setSession, userId } = useSessionStore()
  const [loading, setLoading] = useState(false)
  const [orbRotation, setOrbRotation] = useState(0)

  useEffect(() => {
    if (userId) router.prefetch('/onboarding')
  }, [userId, router])

  useEffect(() => {
    const interval = setInterval(() => {
      setOrbRotation(r => r + 0.5)
    }, 50)
    return () => clearInterval(interval)
  }, [])

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
    <main className="page" style={{ justifyContent: 'flex-start', paddingTop: '2.5rem', paddingBottom: '3rem', gap: 0 }}>

      {/* ── Element 1: Slogan ── */}
      <div className="animate-fade-in" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <FuturaLogo size="sm" />
        <p style={{
          fontFamily: 'var(--font-display)', fontStyle: 'italic',
          fontSize: '0.82rem', color: 'var(--text-muted)',
          letterSpacing: '0.02em', marginTop: '0.6rem',
        }}>
          Your future, written in the palm of your hand.
        </p>
      </div>

      {/* ── Element 2: Orb with rotating arc rings + palm ghost ── */}
      <div className="animate-fade-in delay-200" style={{
        position: 'relative', width: 220, height: 220,
        margin: '0 auto 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Orb size={180} intensity={1.3} />

        {/* Outer arc ring — clockwise */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 220, height: 220,
          borderRadius: '50%',
          border: '1px solid rgba(201,169,110,0.08)',
          borderTopColor: 'rgba(201,169,110,0.35)',
          borderRightColor: 'rgba(201,169,110,0.15)',
          transform: `translate(-50%,-50%) rotate(${orbRotation}deg)`,
        }} />

        {/* Inner arc ring — counter-clockwise */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 190, height: 190,
          borderRadius: '50%',
          border: '1px solid rgba(201,169,110,0.05)',
          borderBottomColor: 'rgba(201,169,110,0.25)',
          borderLeftColor: 'rgba(201,169,110,0.1)',
          transform: `translate(-50%,-50%) rotate(${-orbRotation * 0.7}deg)`,
        }} />

        {/* Palm ghost emoji */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          fontSize: '3rem', opacity: 0.15,
          animation: 'palm-pulse 4s ease-in-out infinite',
          pointerEvents: 'none',
        }}>
          🤚
        </div>
      </div>

      {/* ── Element 3: Eyebrow ── */}
      <p className="animate-fade-up delay-300" style={{
        textAlign: 'center', fontSize: '0.68rem',
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'var(--text-muted)', marginBottom: '0.8rem',
      }}>
        5,000 years of wisdom &middot; AI precision
      </p>

      {/* ── Element 4: Headline ── */}
      <h1 className="animate-fade-up delay-300" style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(1.9rem, 7vw, 2.6rem)',
        fontWeight: 300, lineHeight: 1.1,
        letterSpacing: '-0.02em',
        color: 'var(--text-primary)',
        textAlign: 'center',
        marginBottom: '0.8rem',
        maxWidth: 380,
      }}>
        The one question every human cannot stop asking —{' '}
        <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>answered.</em>
      </h1>

      {/* ── Element 5: Subline ── */}
      <p className="animate-fade-up delay-400" style={{
        textAlign: 'center', color: 'var(--text-secondary)',
        fontSize: '0.88rem', lineHeight: 1.7,
        maxWidth: 320, marginBottom: '1.5rem',
      }}>
        <strong style={{ color: 'var(--text-primary)', fontWeight: 400 }}>Your future is not a mystery.</strong>{' '}
        It is a pattern — and your palm holds the map.
      </p>

      {/* ── Element 6: Curiosity quote box ── */}
      <div className="animate-fade-up delay-400" style={{
        borderLeft: '2px solid rgba(201,169,110,0.4)',
        padding: '0.8rem 1rem',
        marginBottom: '2rem',
        maxWidth: 360, width: '100%',
      }}>
        <p style={{
          fontFamily: 'var(--font-display)', fontStyle: 'italic',
          fontSize: '0.95rem', color: 'rgba(240,235,225,0.55)',
          lineHeight: 1.6,
        }}>
          &ldquo;What if the next 72 hours could change everything — and your palm already knows it?&rdquo;
        </p>
      </div>

      {/* ── Element 7: Feature Cards ── */}
      <div className="animate-fade-up delay-500" style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '8px', width: '100%', maxWidth: 400,
        marginBottom: '2rem',
      }}>
        {FEATURES.map(f => (
          <div key={f.label} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.9rem 0.8rem',
            position: 'relative', overflow: 'hidden',
          }}>
            {f.tag && (
              <span style={{
                position: 'absolute', top: 6, right: 6,
                fontSize: '0.5rem', letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--gold)',
                background: 'rgba(201,169,110,0.1)',
                padding: '2px 5px', borderRadius: '3px',
                fontFamily: 'var(--font-body)', fontWeight: 500,
              }}>
                {f.tag}
              </span>
            )}
            <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: '0.4rem' }}>{f.icon}</span>
            <p style={{
              fontFamily: 'var(--font-body)', fontWeight: 500,
              fontSize: '0.78rem', color: 'var(--text-primary)',
              marginBottom: '0.2rem',
            }}>{f.label}</p>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '0.65rem',
              color: 'var(--text-muted)', lineHeight: 1.5,
            }}>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Element 8: Proof Strip ── */}
      <div className="animate-fade-up delay-500" style={{
        display: 'flex', justifyContent: 'center',
        gap: '2rem', marginBottom: '2rem',
        width: '100%',
      }}>
        {PROOF.map((p, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.2rem', fontWeight: 400,
              color: 'var(--gold)',
            }}>{p.value}</p>
            <p style={{
              fontSize: '0.6rem', letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--text-muted)',
            }}>{p.label}</p>
          </div>
        ))}
      </div>

      {/* ── Element 9: Blurred Preview Card ── */}
      <div className="animate-fade-up delay-600" style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.2rem 1rem',
        maxWidth: 380, width: '100%',
        marginBottom: '2rem',
        position: 'relative', overflow: 'hidden',
      }}>
        <p style={{
          fontSize: '0.6rem', letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--gold)',
          marginBottom: '0.5rem', fontFamily: 'var(--font-body)',
        }}>
          ✦ Sample from a real reading
        </p>
        <p style={{
          fontFamily: 'var(--font-display)', fontStyle: 'italic',
          fontSize: '0.9rem', color: 'var(--text-secondary)',
          lineHeight: 1.65,
        }}>
          There is a pattern in how you process decisions that most people around you
          don&apos;t see. You carry things longer than necessary because part of you
          already knows the answer, but you wait for certainty that never fully arrives.
          Within the next 72 hours will...
        </p>
        {/* Blur overlay at bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: '60px',
          background: 'linear-gradient(transparent, var(--bg-card))',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          paddingBottom: '0.6rem',
        }}>
          <span style={{
            fontSize: '0.6rem', letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--gold)',
            fontFamily: 'var(--font-body)',
          }}>
            Unlock to continue reading →
          </span>
        </div>
      </div>

      {/* ── Element 10: CTA ── */}
      <div className="animate-fade-up delay-600" style={{ width: '100%', maxWidth: 400 }}>
        <PremiumButton onClick={handleStart} loading={loading} size="lg">
          Read my future — free
        </PremiumButton>
      </div>

      {/* ── Element 11: Trust Line ── */}
      <p className="animate-fade-up delay-700" style={{
        textAlign: 'center', marginTop: '0.8rem',
        color: 'var(--text-muted)', fontSize: '0.68rem',
        letterSpacing: '0.04em',
      }}>
        90 seconds &middot; No account &middot; Private &middot; Free to start
      </p>

    </main>
  )
}
