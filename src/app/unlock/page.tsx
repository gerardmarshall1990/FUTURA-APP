'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TopBar, PremiumButton, GoldDivider } from '@/components/shared'
import { useSessionStore } from '@/store'
import { buildPaywallCopy, type PaywallSource, type PaywallContext } from '@/lib/paywallCopy'
import { track } from '@/lib/clientAnalytics'

// ─── Withheld Preview Card ─────────────────────────────────────────────────────
// Shows the blurred cut line — makes the withheld content tangible and specific.

function WithheldCard({ label, text, continuation }: {
  label: string
  text: string
  continuation?: string
}) {
  return (
    <div style={{
      background: 'rgba(201,169,110,0.04)',
      border: '1px solid rgba(201,169,110,0.15)',
      borderRadius: 'var(--radius-md)',
      padding: '1.1rem',
      marginBottom: '1rem',
    }}>
      <p style={{
        fontSize: '0.65rem', letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'rgba(201,169,110,0.5)',
        fontFamily: 'var(--font-body)', marginBottom: '0.65rem',
      }}>
        {label}
      </p>

      <div style={{ position: 'relative' }}>
        {/* Fade overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(to bottom, transparent 10%, var(--bg) 90%)',
          borderRadius: '4px',
        }} />
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '0.95rem', lineHeight: 1.7,
          fontFamily: 'var(--font-body)', fontWeight: 300,
          filter: 'blur(4.5px)',
          userSelect: 'none', pointerEvents: 'none',
        }}>
          {text}
        </p>
      </div>

      {continuation && (
        <p style={{
          color: 'rgba(201,169,110,0.45)',
          fontSize: '0.72rem', marginTop: '0.5rem',
          fontFamily: 'var(--font-body)', fontStyle: 'italic',
        }}>
          {continuation}
        </p>
      )}
    </div>
  )
}

// ─── Feature Row ───────────────────────────────────────────────────────────────

function FeatureRow({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
      <span style={{ color: 'var(--gold)', fontSize: '0.75rem', marginTop: '0.15rem', flexShrink: 0 }}>◆</span>
      <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5 }}>{text}</span>
    </div>
  )
}

// ─── Unlock Page Inner ─────────────────────────────────────────────────────────

function UnlockPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { userId } = useSessionStore()

  const source      = (params.get('source') ?? 'default') as PaywallSource
  const showBeta    = params.get('beta') === 'true'   // visible only with ?beta=true

  const [selected, setSelected] = useState<'unlock' | 'subscription'>('unlock')
  const [loading, setLoading] = useState(false)
  const [ctx, setCtx] = useState<PaywallContext>({})
  const [ctxLoaded, setCtxLoaded] = useState(false)

  // Beta activation state — only relevant when ?beta=true
  const [betaCode,    setBetaCode]    = useState('')
  const [betaStatus,  setBetaStatus]  = useState<'idle' | 'loading' | 'success' | 'invalid'>('idle')

  async function handleBetaActivate() {
    if (!userId || !betaCode.trim()) return
    setBetaStatus('loading')
    try {
      const res = await fetch('/api/beta/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: betaCode.trim() }),
      })
      if (res.ok) {
        setBetaStatus('success')
        // Give user a moment to read the success message then redirect home
        setTimeout(() => router.replace('/home'), 1800)
      } else {
        setBetaStatus('invalid')
      }
    } catch {
      setBetaStatus('invalid')
    }
  }

  useEffect(() => {
    if (!userId) { router.push('/'); return }

    fetch(`/api/unlock/context?userId=${userId}`)
      .then(r => r.json())
      .then(data => {
        setCtx({
          firstName:         data.firstName         ?? null,
          focusArea:         data.focusArea          ?? null,
          emotionalPattern:  data.emotionalPattern   ?? null,
          cutLine:           data.cutLine            ?? null,
          hoursRemaining:    data.hoursRemaining     ?? null,
          palmReadingAnchor: data.palmReadingAnchor  ?? null,
          exposureCount:     data.exposureCount      ?? 0,
        })
        // Fire paywall_viewed with source so funnel queries can segment by entry point
        track(userId, 'paywall_viewed', {
          source,
          focusArea: data.focusArea ?? null,
          exposure_count: data.exposureCount ?? 0,
        })
      })
      .catch(() => {})
      .finally(() => setCtxLoaded(true))
  }, [userId, router])

  const copy = buildPaywallCopy(source, ctx)
  const features = selected === 'unlock' ? copy.unlockFeatures : copy.subFeatures
  const ctaText  = selected === 'unlock' ? copy.ctaUnlock : copy.ctaSub

  async function handlePurchase() {
    if (!userId) return
    setLoading(true)

    track(userId, 'unlock_clicked', { type: selected, source, focusArea: ctx.focusArea ?? null })

    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, type: selected }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {
      setLoading(false)
    }
  }

  return (
    <main className="page" style={{ paddingBottom: '3rem' }}>
      <div className="page-inner">
        <TopBar showBack onBack={() => router.back()} />

        {/* Hero — eyebrow + headline + subtext from copy engine */}
        <div className="animate-fade-up" style={{ paddingTop: '1rem', paddingBottom: '1.25rem' }}>
          <p style={{
            color: 'var(--gold)', fontSize: '0.68rem',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            marginBottom: '0.6rem',
          }}>
            {copy.eyebrow}
          </p>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.85rem', fontWeight: 300,
            letterSpacing: '-0.01em', lineHeight: 1.2,
            marginBottom: '0.75rem',
          }}>
            {copy.headline}
          </h1>

          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.9rem', lineHeight: 1.65,
          }}>
            {copy.subtext}
          </p>
        </div>

        {/* Withheld content preview — only when cut line is available */}
        {ctxLoaded && copy.withheldText && (
          <div className="animate-fade-up delay-100">
            <WithheldCard
              label={copy.withheldLabel ?? 'Your reading continues'}
              text={copy.withheldText}
              continuation={copy.withheldContinuation}
            />
          </div>
        )}

        {/* Urgency line — only when present (hours remaining or daily insight) */}
        {ctxLoaded && copy.urgencyLine && (
          <div className="animate-fade-up delay-150" style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            marginBottom: '1rem',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--gold)', flexShrink: 0,
            }} />
            <p style={{
              color: 'var(--gold)', fontSize: '0.72rem',
              letterSpacing: '0.04em', fontFamily: 'var(--font-body)',
            }}>
              {copy.urgencyLine}
            </p>
          </div>
        )}

        <GoldDivider />

        {/* Plan toggle */}
        <div className="animate-fade-up delay-200" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {(['unlock', 'subscription'] as const).map(plan => (
            <button
              key={plan}
              onClick={() => setSelected(plan)}
              style={{
                flex: 1, padding: '0.7rem',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${selected === plan ? 'rgba(201,169,110,0.45)' : 'var(--border)'}`,
                background: selected === plan ? 'rgba(201,169,110,0.08)' : 'var(--bg-card)',
                color: selected === plan ? 'var(--text-primary)' : 'var(--text-muted)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.8rem', fontWeight: 400,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                cursor: 'pointer', transition: 'all 0.2s ease',
              }}
            >
              {plan === 'unlock' ? 'One-time' : 'Monthly'}
            </button>
          ))}
        </div>

        {/* Plan card — features from copy engine */}
        <div className="animate-fade-up delay-300 glass-card" style={{ marginBottom: '1rem' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', marginBottom: '1.25rem',
          }}>
            <div>
              <p style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.4rem', fontWeight: 400,
              }}>
                {selected === 'unlock' ? 'Unlock Your Reading' : 'Ongoing Guidance'}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                {selected === 'unlock' ? 'One-time · No subscription' : 'Cancel anytime'}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.8rem', fontWeight: 300,
                color: 'var(--gold)',
              }}>
                {selected === 'unlock' ? '$4.99' : '$9.99'}
              </p>
              {selected === 'subscription' && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>/month</p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {features.map((f, i) => <FeatureRow key={i} text={f} />)}
          </div>
        </div>

        {/* CTA */}
        <div className="animate-fade-up delay-400">
          <PremiumButton onClick={handlePurchase} loading={loading} size="lg">
            {ctaText}
          </PremiumButton>

          {selected === 'unlock' && (
            <button
              onClick={() => setSelected('subscription')}
              style={{
                width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: '0.8rem',
                fontFamily: 'var(--font-body)', marginTop: '0.75rem',
                letterSpacing: '0.02em', textDecoration: 'underline',
                textDecorationColor: 'var(--text-muted)',
              }}
            >
              Or get unlimited guidance from $9.99/mo
            </button>
          )}

          <p style={{
            textAlign: 'center', marginTop: '1.25rem',
            color: 'var(--text-muted)', fontSize: '0.7rem',
            letterSpacing: '0.03em', lineHeight: 1.6,
          }}>
            Secure checkout via Stripe · Instant access
          </p>
        </div>

        {/* Beta code entry — only visible when ?beta=true. Not shown to normal users. */}
        {showBeta && (
          <div style={{
            marginTop: '2rem',
            borderTop: '1px solid var(--border)',
            paddingTop: '1.25rem',
          }}>
            {betaStatus === 'success' ? (
              <p style={{
                textAlign: 'center',
                color: '#3ecf8e',
                fontFamily: 'var(--font-body)',
                fontSize: '0.82rem',
                letterSpacing: '0.04em',
              }}>
                ✓ Beta access activated — redirecting...
              </p>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    value={betaCode}
                    onChange={e => { setBetaCode(e.target.value); setBetaStatus('idle') }}
                    onKeyDown={e => e.key === 'Enter' && handleBetaActivate()}
                    placeholder="Beta access code"
                    autoComplete="off"
                    style={{
                      flex: 1,
                      background: 'var(--bg-card)',
                      border: `1px solid ${betaStatus === 'invalid' ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '0.7rem 0.9rem',
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.875rem',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      letterSpacing: '0.06em',
                    }}
                  />
                  <button
                    onClick={handleBetaActivate}
                    disabled={betaStatus === 'loading' || !betaCode.trim()}
                    style={{
                      padding: '0.7rem 1rem',
                      background: 'rgba(201,169,110,0.12)',
                      border: '1px solid rgba(201,169,110,0.3)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--gold)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.75rem',
                      letterSpacing: '0.08em',
                      cursor: betaStatus === 'loading' ? 'default' : 'pointer',
                      opacity: betaStatus === 'loading' ? 0.6 : 1,
                      flexShrink: 0,
                    }}
                  >
                    {betaStatus === 'loading' ? '...' : 'Activate'}
                  </button>
                </div>
                {betaStatus === 'invalid' && (
                  <p style={{
                    marginTop: '0.4rem',
                    color: 'rgba(239,68,68,0.75)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.72rem',
                    letterSpacing: '0.02em',
                  }}>
                    Invalid code — check and try again
                  </p>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </main>
  )
}

export default function UnlockPage() {
  return (
    <Suspense>
      <UnlockPageInner />
    </Suspense>
  )
}
