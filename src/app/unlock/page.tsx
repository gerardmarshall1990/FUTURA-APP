'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar, Orb, PremiumButton, GoldDivider } from '@/components/shared'
import { useSessionStore } from '@/store'

const UNLOCK_FEATURES = [
  'The deeper layer of your reading',
  'What your pattern predicts for the next weeks',
  '10 conversations with your personal advisor',
]

const SUB_FEATURES = [
  'Everything in the one-time unlock',
  'Unlimited advisor conversations',
  'Daily insight updates',
  'Priority pattern analysis',
]

export default function UnlockPage() {
  const router = useRouter()
  const { userId } = useSessionStore()
  const [selected, setSelected] = useState<'unlock' | 'subscription'>('unlock')
  const [loading, setLoading] = useState(false)

  async function handlePurchase() {
    if (!userId) return
    setLoading(true)
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

        {/* Hero */}
        <div className="animate-fade-up" style={{ textAlign: 'center', padding: '1.5rem 0 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.75rem' }}>
            <Orb size={110} intensity={1.6} />
          </div>

          <p style={{
            color: 'var(--gold)', fontSize: '0.72rem',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            marginBottom: '0.75rem',
          }}>
            There's more
          </p>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.2rem', fontWeight: 300,
            letterSpacing: '-0.01em', lineHeight: 1.15,
            marginBottom: '0.75rem',
          }}>
            Reveal what<br />happens next
          </h1>

          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.9rem', lineHeight: 1.65,
            maxWidth: '300px', margin: '0 auto',
          }}>
            There's a deeper layer to your pattern than what you've seen.
          </p>
        </div>

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

        {/* Plan card */}
        <div
          className="animate-fade-up delay-300 glass-card"
          style={{ marginBottom: '1rem' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
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
            {(selected === 'unlock' ? UNLOCK_FEATURES : SUB_FEATURES).map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--gold)', fontSize: '0.75rem', marginTop: '0.15rem', flexShrink: 0 }}>◆</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="animate-fade-up delay-400">
          <PremiumButton onClick={handlePurchase} loading={loading} size="lg">
            {selected === 'unlock' ? 'Unlock deeper guidance' : 'Start ongoing guidance'}
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

      </div>
    </main>
  )
}
