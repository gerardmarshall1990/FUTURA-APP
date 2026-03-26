'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FuturaLogo, PremiumButton } from '@/components/shared'
import { useSessionStore } from '@/store'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// ─── Suggested Prompts ────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  'Tell me more about my pattern',
  'What is the shift coming up?',
  'What should I focus on this week?',
  'Explain my reading more deeply',
]

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      padding: '0.2rem 0',
    }}>
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
            width: 5, height: 5,
            borderRadius: '50%',
            background: 'var(--text-muted)',
            animation: 'blink 1.2s ease infinite',
            animationDelay: `${i * 0.18}s`,
          }} />
        ))}
      </div>
    </div>
  )
}

// ─── Upgrade Modal ────────────────────────────────────────────────────────────

function UpgradeModal({ onDismiss, onUpgrade }: { onDismiss: () => void; onUpgrade: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'flex-end', padding: '0 1.25rem 2rem',
    }}>
      <div className="animate-fade-up glass-card" style={{ width: '100%', maxWidth: 420, margin: '0 auto' }}>
        <p style={{
          color: 'var(--gold)', fontSize: '0.72rem',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          marginBottom: '0.75rem',
        }}>
          Deeper guidance available
        </p>

        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.6rem', fontWeight: 300,
          marginBottom: '0.75rem',
        }}>
          Continue your guidance
        </h2>

        <p style={{
          color: 'var(--text-secondary)', fontSize: '0.875rem',
          lineHeight: 1.65, marginBottom: '1.5rem',
        }}>
          There's a deeper layer to what your pattern is revealing. Unlock unlimited conversations with your personal advisor.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <PremiumButton onClick={onUpgrade} size="md">
            Unlock deeper guidance
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

export default function ChatPage() {
  const router = useRouter()
  const { userId, remainingMessages, isSubscribed, isUnlocked, decrementMessages } = useSessionStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [showSuggested, setShowSuggested] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!userId) { router.push('/'); return }

    // Opening message from advisor
    setMessages([{
      role: 'assistant',
      content: `I've reviewed your reading. What would you like to understand more deeply?`,
    }])
  }, [userId, router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  async function sendMessage(text: string) {
    if (!text.trim() || sending || !userId) return

    setShowSuggested(false)
    const userMessage: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setSending(true)

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, sessionId, message: text }),
      })

      if (res.status === 402) {
        setSending(false)
        setShowPaywall(true)
        return
      }

      const data = await res.json()

      if (data.paywallTriggered) {
        setSending(false)
        setShowPaywall(true)
        return
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      if (data.sessionId) setSessionId(data.sessionId)
      decrementMessages()

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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // Auto-resize textarea
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
        height: '100dvh', width: '100%', maxWidth: 420,
        margin: '0 auto',
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
              fontFamily: 'var(--font-body)', letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            ← Back
          </button>

          <FuturaLogo size="sm" />

          {/* Message counter */}
          {!isSubscribed && (
            <span style={{
              fontSize: '0.72rem', color: 'var(--text-muted)',
              letterSpacing: '0.04em',
            }}>
              {remainingMessages} left
            </span>
          )}
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '1.25rem',
          display: 'flex', flexDirection: 'column', gap: '0.25rem',
        }}>
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          {sending && <TypingIndicator />}

          {/* Suggested prompts (shown before first user message) */}
          {showSuggested && messages.length <= 1 && (
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <p style={{
                color: 'var(--text-muted)', fontSize: '0.72rem',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                marginBottom: '0.25rem',
              }}>
                Ask your advisor
              </p>
              {SUGGESTED_PROMPTS.map(prompt => (
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
                    fontWeight: 300,
                    fontSize: '0.875rem',
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

        {/* Input area */}
        <div style={{
          padding: '0.75rem 1.25rem 1.5rem',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          {isFree && remainingMessages <= 1 && remainingMessages > 0 && (
            <p style={{
              color: 'var(--gold)', fontSize: '0.72rem',
              letterSpacing: '0.04em', marginBottom: '0.6rem',
              textAlign: 'center',
            }}>
              {remainingMessages === 1 ? '1 message remaining' : ''} · <button
                onClick={() => router.push('/unlock')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--gold)', fontSize: '0.72rem',
                  fontFamily: 'var(--font-body)', textDecoration: 'underline',
                }}
              >
                Unlock unlimited
              </button>
            </p>
          )}

          <div style={{
            display: 'flex', gap: '0.6rem',
            alignItems: 'flex-end',
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
                width: 36, height: 36,
                borderRadius: '50%',
                background: input.trim() && !sending ? 'var(--gold)' : 'var(--bg-elevated)',
                border: 'none', cursor: input.trim() && !sending ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.2s ease',
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
          onDismiss={() => setShowPaywall(false)}
          onUpgrade={() => router.push('/unlock')}
        />
      )}
    </main>
  )
}
