'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FuturaLogo, PremiumButton } from '@/components/shared'
import { useSessionStore } from '@/store'
import { Suspense } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// ─── Fallback suggested prompts — replaced by API on load ────────────────────

const FALLBACK_PROMPTS = [
  'What pattern keeps showing up in my life?',
  'What shift is building right now?',
  'What am I avoiding that I already know about?',
  'What does my reading say about the next few weeks?',
]

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', padding: '0.2rem 0' }}>
      <div style={{
        maxWidth: '82%',
        padding: isUser ? '0.7rem 1rem' : '0.9rem 1rem',
        borderRadius: isUser
          ? 'var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg)'
          : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm)',
        background: isUser ? 'rgba(201,169,110,0.12)' : 'var(--bg-card)',
        border: `1px solid ${isUser ? 'rgba(201,169,110,0.25)' : 'var(--border)'}`,
        color: isUser ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontSize: '0.925rem',
        lineHeight: 1.7,
        fontFamily: 'var(--font-body)',
        fontWeight: 300,
        letterSpacing: '0.005em',
      }}>
        {message.content}
      </div>
    </div>
  )
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '0.2rem 0' }}>
      <div style={{
        padding: '0.8rem 1.1rem',
        borderRadius: 'var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        display: 'flex', gap: '5px', alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 5, height: 5, borderRadius: '50%',
            background: 'var(--text-muted)',
            animation: 'blink 1.2s ease infinite',
            animationDelay: `${i * 0.18}s`,
          }} />
        ))}
      </div>
    </div>
  )
}

// ─── Upgrade Modal ─────────────────────────────────────────────────────────────
// Copy is personalized using name, focusArea, and emotionalPattern.
// Navigates to /unlock?source=chat so the unlock page renders the chat variant.

function UpgradeModal({
  name,
  focusArea,
  emotionalPattern,
  lastMessage,
  onDismiss,
  onUpgrade,
}: {
  name: string | null
  focusArea: string | null
  emotionalPattern: string | null
  lastMessage: string | null
  onDismiss: () => void
  onUpgrade: () => void
}) {
  const focusLabel = focusArea
    ? { love: 'love life', money: 'financial pattern', life_direction: 'life direction' }[focusArea] ?? focusArea.replace(/_/g, ' ')
    : null

  const emotional = emotionalPattern?.replace(/_/g, ' ')

  const headline = name
    ? `${name}, this is where it was about to land`
    : 'This is where it was about to land'

  // Body references what was specifically being asked about
  const topicPhrase = lastMessage
    ? lastMessage.trim().split(/\s+/).slice(0, 6).join(' ').replace(/[?.!]+$/, '')
    : null

  const body = emotional && focusLabel
    ? `The ${emotional} pattern — the one you've been asking about — tends to circle before it resolves. ${topicPhrase ? `"${topicPhrase}..." — that's exactly where the pattern was about to get specific.` : `The next message is where it would have resolved.`}`
    : focusLabel
      ? `What you've been asking about your ${focusLabel} was building toward a specific point. ${topicPhrase ? `That question — "${topicPhrase}..." — was the one that would have landed.` : 'That point is in the next message.'}`
      : `The conversation was at the edge of something specific. That's where it stopped.`

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(9,9,11,0.88)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'flex-end', padding: '0 1.25rem 2rem',
    }}>
      <div className="animate-fade-up glass-card" style={{ width: '100%', maxWidth: 420, margin: '0 auto' }}>
        <p style={{
          color: 'var(--gold)', fontSize: '0.68rem',
          letterSpacing: '0.14em', textTransform: 'uppercase',
          marginBottom: '0.65rem',
        }}>
          Conversation limit reached
        </p>

        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.55rem', fontWeight: 300,
          lineHeight: 1.2, marginBottom: '0.7rem',
        }}>
          {headline}
        </h2>

        <p style={{
          color: 'var(--text-secondary)', fontSize: '0.875rem',
          lineHeight: 1.65, marginBottom: '1.5rem',
        }}>
          {body}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <PremiumButton onClick={onUpgrade} size="md">
            Send the next message
          </PremiumButton>
          <button
            onClick={onDismiss}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: '0.8rem',
              fontFamily: 'var(--font-body)', letterSpacing: '0.02em',
            }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Chat Page ────────────────────────────────────────────────────────────────

function ChatPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { userId, remainingMessages, isSubscribed, isUnlocked, decrementMessages } = useSessionStore()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [showSuggested, setShowSuggested] = useState(true)
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>(FALLBACK_PROMPTS)
  const [followUpPrompts, setFollowUpPrompts] = useState<string[]>([])

  // User context for personalized paywall modal
  const [advisorName, setAdvisorName] = useState<string | null>(null)
  const [userFocusArea, setUserFocusArea] = useState<string | null>(null)
  const [userEmotionalPattern, setUserEmotionalPattern] = useState<string | null>(null)
  const [paywallLastMessage, setPaywallLastMessage] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!userId) { router.push('/'); return }

    // Show typing indicator while fetching personalized opening message
    setSending(true)

    // Track chat_started
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, eventName: 'chat_started' }),
    }).catch(() => {})

    // Fetch personalized opening message and suggested prompts in parallel
    Promise.all([
      fetch(`/api/chat/opening?userId=${userId}`).then(r => r.json()),
      fetch(`/api/prompts/suggested?userId=${userId}`).then(r => r.json()).catch(() => ({ prompts: [] })),
    ])
      .then(([openingData, promptsData]) => {
        setMessages([{ role: 'assistant', content: openingData.message }])
        if (openingData.name) setAdvisorName(openingData.name)
        if (openingData.focusArea) setUserFocusArea(openingData.focusArea)
        if (openingData.emotionalPattern) setUserEmotionalPattern(openingData.emotionalPattern)

        const apiPrompts: string[] = (promptsData.prompts ?? []).map((p: { text: string }) => p.text)
        if (apiPrompts.length > 0) setSuggestedPrompts(apiPrompts)
      })
      .catch(() => {
        setMessages([{ role: 'assistant', content: FALLBACK_PROMPTS[0] }])
      })
      .finally(() => setSending(false))

    // If arriving from home with a pre-filled prompt, send it immediately
    const prePrompt = params.get('prompt')
    if (prePrompt) {
      // Will be handled after messages are set — deferred
      setTimeout(() => sendMessage(prePrompt), 1200)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  async function sendMessage(text: string) {
    if (!text.trim() || sending || !userId) return

    setShowSuggested(false)
    setFollowUpPrompts([])
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInput('')
    setSending(true)

    // Track message_sent
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        eventName: 'message_sent',
        properties: { focusArea: userFocusArea },
      }),
    }).catch(() => {})

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, sessionId, message: text }),
      })

      if (res.status === 402) {
        const data = await res.json().catch(() => ({}))
        if (data.lastMessage) setPaywallLastMessage(data.lastMessage)
        // Track paywall hit
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            eventName: 'paywall_triggered_chat',
            properties: { source: 'chat', focusArea: userFocusArea },
          }),
        }).catch(() => {})
        setSending(false); setShowPaywall(true); return
      }

      const data = await res.json()
      if (data.paywallTriggered) {
        if (data.lastMessage) setPaywallLastMessage(data.lastMessage)
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            eventName: 'paywall_triggered_chat',
            properties: { source: 'chat', focusArea: userFocusArea },
          }),
        }).catch(() => {})
        setSending(false); setShowPaywall(true); return
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      if (data.sessionId) setSessionId(data.sessionId)
      decrementMessages()

      // Generate follow-up prompts non-blocking — response renders first,
      // prompts appear ~500ms later once the AI call resolves
      fetch('/api/prompts/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userMessage: text, advisorResponse: data.response }),
      })
        .then(r => r.json())
        .then(d => { if (Array.isArray(d.prompts) && d.prompts.length > 0) setFollowUpPrompts(d.prompts) })
        .catch(() => {})
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Something interrupted the connection. Try again.',
      }])
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const isFree = !isUnlocked && !isSubscribed

  return (
    <main className="page" style={{ padding: 0 }}>
      <div style={{
        display: 'flex', flexDirection: 'column',
        height: '100dvh', width: '100%', maxWidth: 420, margin: '0 auto',
      }}>

        {/* Header */}
        <div style={{
          padding: '1.25rem 1.25rem 1rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexShrink: 0,
        }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: '0.8rem',
              fontFamily: 'var(--font-body)', letterSpacing: '0.06em', textTransform: 'uppercase',
            }}
          >
            ← Back
          </button>

          <FuturaLogo size="sm" />

          {/* Message counter — framed as remaining sessions, not a countdown */}
          {isFree && (
            <button
              onClick={() => router.push('/unlock?source=chat')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.68rem', color: remainingMessages <= 2 ? 'var(--gold)' : 'var(--text-muted)',
                letterSpacing: '0.04em', fontFamily: 'var(--font-body)',
              }}
            >
              {remainingMessages} left
            </button>
          )}
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '1.25rem',
          display: 'flex', flexDirection: 'column', gap: '0.25rem',
        }}>
          {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
          {sending && <TypingIndicator />}

          {/* Follow-up prompts — shown after each advisor response, aligned with the hook */}
          {!sending && messages.length > 1 && messages[messages.length - 1]?.role === 'assistant' && followUpPrompts.length > 0 && (
            <div className="animate-fade-up" style={{ marginTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {followUpPrompts.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(201,169,110,0.18)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.55rem 0.9rem',
                    color: 'rgba(201,169,110,0.65)',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 300, fontSize: '0.825rem',
                    textAlign: 'left', cursor: 'pointer',
                    letterSpacing: '0.01em',
                    transition: 'border-color 0.2s ease, color 0.2s ease',
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Suggested prompts — shown before first user message, uses API prompts */}
          {showSuggested && messages.length === 1 && !sending && (
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <p style={{
                color: 'var(--text-muted)', fontSize: '0.68rem',
                letterSpacing: '0.1em', textTransform: 'uppercase',
                marginBottom: '0.2rem',
              }}>
                Ask your advisor
              </p>
              {suggestedPrompts.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 300, fontSize: '0.875rem',
                    textAlign: 'left', cursor: 'pointer',
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Low-message nudge — advisor-voice, not system warning */}
        {isFree && remainingMessages === 1 && (
          <div style={{
            padding: '0.6rem 1.25rem 0',
            borderTop: '1px solid var(--border)',
          }}>
            <p style={{
              fontSize: '0.72rem', color: 'var(--gold)',
              letterSpacing: '0.03em', textAlign: 'center',
              fontFamily: 'var(--font-body)',
            }}>
              1 conversation remaining —{' '}
              <button
                onClick={() => router.push('/unlock?source=chat')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--gold)', fontSize: '0.72rem',
                  fontFamily: 'var(--font-body)', textDecoration: 'underline',
                }}
              >
                unlock unlimited
              </button>
            </p>
          </div>
        )}

        {/* Input area */}
        <div style={{
          padding: '0.75rem 1.25rem 1.5rem',
          borderTop: isFree && remainingMessages === 1 ? 'none' : '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', gap: '0.6rem', alignItems: 'flex-end',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.6rem 0.6rem 0.6rem 1rem',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask your advisor..."
              rows={1}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                resize: 'none', color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)', fontWeight: 300,
                fontSize: '0.925rem', lineHeight: 1.55,
                minHeight: '24px', maxHeight: '120px',
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || sending}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: input.trim() && !sending ? 'var(--gold)' : 'var(--bg-elevated)',
                border: 'none', cursor: input.trim() && !sending ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 0.2s ease',
                color: input.trim() && !sending ? '#09090B' : 'var(--text-muted)',
                fontSize: '0.9rem',
              }}
            >
              ↑
            </button>
          </div>
        </div>
      </div>

      {showPaywall && (
        <UpgradeModal
          name={advisorName}
          focusArea={userFocusArea}
          emotionalPattern={userEmotionalPattern}
          lastMessage={paywallLastMessage}
          onDismiss={() => setShowPaywall(false)}
          onUpgrade={() => router.push('/unlock?source=chat')}
        />
      )}
    </main>
  )
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatPageInner />
    </Suspense>
  )
}
