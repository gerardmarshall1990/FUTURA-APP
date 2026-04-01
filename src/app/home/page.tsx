'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FuturaLogo, Orb, PremiumButton, GoldDivider } from '@/components/shared'
import { useSessionStore, useOnboardingStore } from '@/store'

interface DailyInsight {
  insight_text: string
  insight_date: string
}

interface SuggestedPrompt {
  text: string
  category: string
}

interface LifecycleTrigger {
  id: string
  trigger_type: string
  trigger_data: { headline: string; subtext: string }
}

export default function HomePage() {
  const router = useRouter()
  const { userId, isUnlocked, isSubscribed } = useSessionStore()
  const { name } = useOnboardingStore()
  const [insight, setInsight] = useState<DailyInsight | null>(null)
  const [prompts, setPrompts] = useState<SuggestedPrompt[]>([])
  const [triggers, setTriggers] = useState<LifecycleTrigger[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      router.push('/')
      return
    }

    // Track app_opened on every home page visit
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, eventName: 'app_opened' }),
    }).catch(() => {})

    async function loadDashboard() {
      try {
        const [insightRes, promptsRes, triggersRes] = await Promise.all([
          fetch(`/api/insights/today?userId=${userId}`).then(r => r.json()).catch(() => ({ insight: null })),
          fetch(`/api/prompts/suggested?userId=${userId}`).then(r => r.json()).catch(() => ({ prompts: [] })),
          fetch(`/api/lifecycle/triggers?userId=${userId}`).then(r => r.json()).catch(() => ({ triggers: [] })),
        ])

        setInsight(insightRes.insight)
        setPrompts(promptsRes.prompts ?? [])
        setTriggers(triggersRes.triggers ?? [])
      } catch {
        // Silent fail — show what we can
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [userId, router])

  const displayName = name || 'Seeker'
  const greeting = getGreeting()

  // Loading skeleton — prevents blank screen during dashboard fetch
  if (loading) {
    return (
      <main className="page" style={{ paddingTop: '2rem', paddingBottom: '3rem', gap: 0 }}>
        <div className="page-inner" style={{ gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <FuturaLogo size="sm" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ height: '0.75rem', width: '5rem', background: 'var(--bg-elevated)', borderRadius: 4 }} />
            <div style={{ height: '1.8rem', width: '8rem', background: 'var(--bg-elevated)', borderRadius: 4 }} />
          </div>
          {[1, 2].map(i => (
            <div key={i} style={{
              height: '5rem', width: '100%',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', animation: 'blink 1.4s ease infinite',
              animationDelay: `${i * 0.15}s`,
            }} />
          ))}
        </div>
      </main>
    )
  }

  return (
    <main className="page" style={{ paddingTop: '2rem', paddingBottom: '3rem', gap: 0 }}>
      <div className="page-inner" style={{ gap: '1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <FuturaLogo size="sm" />
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(201,169,110,0.12)',
            border: '1px solid rgba(201,169,110,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', color: 'var(--gold)',
            fontFamily: 'var(--font-body)', fontWeight: 500,
          }}>
            {displayName.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Greeting */}
        <div className="animate-fade-up">
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '0.72rem',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--text-muted)', marginBottom: '0.3rem',
          }}>
            {greeting}
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.8rem', fontWeight: 300,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}>
            {displayName}
          </h1>
        </div>

        {/* Daily Insight Card — subscribers see full insight, non-subscribers see locked teaser */}
        {insight && isSubscribed ? (
          <div
            className="animate-fade-up delay-200"
            onClick={() => {
              fetch('/api/analytics/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, eventName: 'insight_viewed' }),
              }).catch(() => {})
            }}
            style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.2rem',
            width: '100%',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              marginBottom: '0.6rem',
            }}>
              <span style={{ fontSize: '0.85rem' }}>✦</span>
              <p style={{
                fontFamily: 'var(--font-body)', fontSize: '0.65rem',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--gold)',
              }}>
                Today&apos;s Insight
              </p>
            </div>
            <p style={{
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
              fontSize: '0.95rem', color: 'var(--text-secondary)',
              lineHeight: 1.65,
            }}>
              {insight.insight_text}
            </p>
          </div>
        ) : !isSubscribed ? (
          /* Locked insight card — drives to paywall with insight source context */
          <button
            className="animate-fade-up delay-200"
            onClick={() => router.push('/unlock?source=insight')}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.2rem',
              width: '100%',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '0.6rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem' }}>✦</span>
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: '0.65rem',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'var(--gold)',
                }}>
                  Today&apos;s Insight
                </p>
              </div>
              <p style={{
                fontFamily: 'var(--font-body)', fontSize: '0.65rem',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'rgba(201,169,110,0.5)',
              }}>
                New today
              </p>
            </div>

            {/* Blurred preview */}
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', inset: 0, zIndex: 1,
                background: 'linear-gradient(to bottom, transparent 20%, var(--bg-card) 85%)',
                borderRadius: '4px',
              }} />
              <p style={{
                fontFamily: 'var(--font-display)', fontStyle: 'italic',
                fontSize: '0.95rem', color: 'var(--text-secondary)',
                lineHeight: 1.65,
                filter: 'blur(4px)',
                userSelect: 'none', pointerEvents: 'none',
              }}>
                {insight?.insight_text ?? 'A new pattern observation was generated for you today.'}
              </p>
            </div>

            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '0.72rem',
              color: 'rgba(201,169,110,0.65)', marginTop: '0.5rem',
              letterSpacing: '0.03em',
            }}>
              Read today&apos;s insight →
            </p>
          </button>
        ) : null}

        {/* Lifecycle Triggers (FOMO / Reactivation Cards) */}
        {triggers.length > 0 && triggers.map((trigger, i) => (
          <div
            key={trigger.id || i}
            className="animate-fade-up delay-300"
            style={{
              background: 'linear-gradient(135deg, rgba(201,169,110,0.08) 0%, rgba(201,169,110,0.02) 100%)',
              border: '1px solid rgba(201,169,110,0.2)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem 1.2rem',
              width: '100%',
              cursor: 'pointer',
            }}
            onClick={() => {
              fetch('/api/analytics/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId,
                  eventName: 'trigger_clicked',
                  properties: { trigger_type: trigger.trigger_type, source: 'home' },
                }),
              }).catch(() => {})
              if (trigger.trigger_type.startsWith('fomo')) router.push('/unlock?source=trigger')
              else router.push('/chat')
            }}
          >
            <p style={{
              fontFamily: 'var(--font-body)', fontWeight: 500,
              fontSize: '0.85rem', color: 'var(--text-primary)',
              marginBottom: '0.3rem',
            }}>
              {trigger.trigger_data.headline}
            </p>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '0.72rem',
              color: 'var(--text-muted)',
            }}>
              {trigger.trigger_data.subtext}
            </p>
          </div>
        ))}

        <GoldDivider />

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
          <QuickAction icon="💬" label="Chat" sub="Ask anything" onClick={() => router.push('/chat')} />
          <QuickAction icon="🤚" label="Reading" sub="View your reading" onClick={() => router.push(isUnlocked ? '/full-reading' : '/reading')} />
          <QuickAction icon="📅" label="Insights" sub={isSubscribed ? 'Daily insight' : 'Subscribe for daily'} onClick={() => router.push(isSubscribed ? '/home' : '/unlock?source=insight')} />
          <QuickAction icon="📡" label="Patterns" sub="Your patterns" onClick={() => router.push('/chat')} />
        </div>

        {/* Suggested Prompts */}
        {prompts.length > 0 && (
          <div className="animate-fade-up delay-400" style={{ width: '100%' }}>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '0.65rem',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--text-muted)', marginBottom: '0.6rem',
            }}>
              Ask your advisor
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {prompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => router.push(`/chat?prompt=${encodeURIComponent(p.text)}`)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.7rem 0.9rem',
                    textAlign: 'left', cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-body)', fontSize: '0.82rem',
                    fontWeight: 300, letterSpacing: '0.01em',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {p.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CTA for non-subscribers */}
        {!isSubscribed && (
          <div className="animate-fade-up delay-500" style={{ width: '100%', marginTop: '0.5rem' }}>
            <PremiumButton onClick={() => router.push('/unlock?source=default')} variant="outline" size="md">
              Unlock full access
            </PremiumButton>
          </div>
        )}
      </div>
    </main>
  )
}

// ─── Helper Components ───────────────────────────────────────────────────────

function QuickAction({ icon, label, sub, onClick }: { icon: string; label: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '0.9rem 0.8rem',
        textAlign: 'left', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: '0.3rem',
        transition: 'all 0.2s ease',
      }}
    >
      <span style={{ fontSize: '1.2rem' }}>{icon}</span>
      <span style={{
        fontFamily: 'var(--font-body)', fontWeight: 500,
        fontSize: '0.78rem', color: 'var(--text-primary)',
      }}>{label}</span>
      <span style={{
        fontFamily: 'var(--font-body)', fontSize: '0.62rem',
        color: 'var(--text-muted)',
      }}>{sub}</span>
    </button>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
