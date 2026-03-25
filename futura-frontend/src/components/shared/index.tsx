'use client'

import { useState } from 'react'

// ─── FuturaLogo ───────────────────────────────────────────────────────────────

export function FuturaLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: '1.1rem', md: '1.4rem', lg: '2rem' }
  return (
    <span
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: sizes[size],
        fontWeight: 400,
        letterSpacing: '0.18em',
        color: 'var(--text-primary)',
        textTransform: 'uppercase',
      }}
    >
      Futura
    </span>
  )
}

// ─── Orb ─────────────────────────────────────────────────────────────────────

export function Orb({
  size = 280,
  intensity = 1,
  animated = true,
}: {
  size?: number
  intensity?: number
  animated?: boolean
}) {
  return (
    <div
      className={animated ? 'animate-pulse-orb' : ''}
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
      }}
    >
      {/* Outer ring */}
      <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        border: `1px solid rgba(201,169,110,${0.08 * intensity})`,
      }} />
      {/* Mid ring */}
      <div style={{
        position: 'absolute',
        inset: size * 0.1,
        borderRadius: '50%',
        border: `1px solid rgba(201,169,110,${0.12 * intensity})`,
      }} />
      {/* Inner ring */}
      <div style={{
        position: 'absolute',
        inset: size * 0.22,
        borderRadius: '50%',
        border: `1px solid rgba(201,169,110,${0.18 * intensity})`,
        background: `radial-gradient(circle, rgba(201,169,110,${0.1 * intensity}) 0%, transparent 70%)`,
      }} />
      {/* Core glow */}
      <div style={{
        position: 'absolute',
        inset: size * 0.35,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(201,169,110,${0.22 * intensity}) 0%, rgba(201,169,110,${0.06 * intensity}) 60%, transparent 100%)`,
      }} />
      {/* Center dot */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 4, height: 4,
        borderRadius: '50%',
        background: `rgba(201,169,110,${0.7 * intensity})`,
        boxShadow: `0 0 12px rgba(201,169,110,${0.5 * intensity})`,
      }} />
    </div>
  )
}

// ─── PremiumButton ────────────────────────────────────────────────────────────

interface PremiumButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
}

export function PremiumButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
}: PremiumButtonProps) {
  const [pressed, setPressed] = useState(false)

  const paddings = { sm: '0.6rem 1.2rem', md: '0.85rem 1.6rem', lg: '1.05rem 2rem' }
  const fontSizes = { sm: '0.8rem', md: '0.875rem', lg: '0.95rem' }

  const base: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    width: fullWidth ? '100%' : 'auto',
    padding: paddings[size],
    fontSize: fontSizes[size],
    fontFamily: 'var(--font-body)',
    fontWeight: 400,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    borderRadius: 'var(--radius-full)',
    border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s var(--ease-out)',
    transform: pressed ? 'scale(0.98)' : 'scale(1)',
    opacity: disabled ? 0.4 : 1,
    outline: 'none',
  }

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--gold)',
      color: '#09090B',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
    },
    outline: {
      background: 'transparent',
      color: 'var(--text-primary)',
      border: '1px solid var(--border)',
    },
  }

  return (
    <button
      onClick={disabled || loading ? undefined : onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{ ...base, ...variants[variant] }}
    >
      {loading ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LoadingDots />
        </span>
      ) : children}
    </button>
  )
}

// ─── LoadingDots ──────────────────────────────────────────────────────────────

export function LoadingDots() {
  return (
    <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 4, height: 4,
            borderRadius: '50%',
            background: 'currentColor',
            animation: 'blink 1.2s ease infinite',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </span>
  )
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export function TopBar({ showBack = false, onBack }: { showBack?: boolean; onBack?: () => void }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1.5rem 0 1rem',
      width: '100%',
    }}>
      {showBack ? (
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: '0.8rem',
            letterSpacing: '0.06em', fontFamily: 'var(--font-body)',
            textTransform: 'uppercase',
          }}
        >
          ← Back
        </button>
      ) : <div />}
      <FuturaLogo size="sm" />
      <div style={{ width: 40 }} />
    </div>
  )
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────

export function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div style={{
      display: 'flex',
      gap: '6px',
      width: '100%',
      padding: '0.5rem 0',
    }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1, height: 2,
            borderRadius: 1,
            background: i < step ? 'var(--gold)' : 'var(--border)',
            transition: 'background 0.4s ease',
          }}
        />
      ))}
    </div>
  )
}

// ─── GoldDivider ─────────────────────────────────────────────────────────────

export function GoldDivider() {
  return (
    <div style={{
      width: 28, height: 1,
      background: 'var(--gold)',
      opacity: 0.45,
      margin: '1.75rem auto',
    }} />
  )
}
