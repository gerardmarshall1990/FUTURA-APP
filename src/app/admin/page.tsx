'use client'

import { useState, useEffect } from 'react'
import { useSessionStore } from '@/store'

export default function AdminPage() {
  const { userId, setSubscribed, setRemainingMessages } = useSessionStore()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  // Also auto-detect userId from store
  const [displayId, setDisplayId] = useState<string>('loading...')
  useEffect(() => {
    setDisplayId(userId ?? 'not found — try refreshing')
  }, [userId])

  async function grantAccess() {
    setStatus('loading')
    try {
      const url = userId
        ? `/api/admin/seed-beta?userId=${userId}`
        : `/api/admin/seed-beta`
      const res = await fetch(url)
      const data = await res.json()
      setResult(data)
      if (data.success) {
        // Update the local store immediately
        setSubscribed()
        setRemainingMessages(999)
        setStatus('success')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <main style={{
      minHeight: '100dvh',
      background: '#09090B',
      color: '#fff',
      fontFamily: 'monospace',
      padding: '2rem 1.5rem',
    }}>
      <h1 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#C9A96E' }}>
        FUTURA · Admin Access
      </h1>

      <div style={{
        background: '#18181B',
        border: '1px solid #333',
        borderRadius: 8,
        padding: '1rem',
        marginBottom: '1.5rem',
      }}>
        <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.3rem' }}>
          YOUR USER ID
        </p>
        <p style={{
          fontSize: '0.8rem',
          color: '#fff',
          wordBreak: 'break-all',
          margin: 0,
        }}>
          {displayId}
        </p>
      </div>

      <button
        onClick={grantAccess}
        disabled={status === 'loading' || status === 'success'}
        style={{
          width: '100%',
          padding: '0.9rem',
          borderRadius: 8,
          border: 'none',
          background: status === 'success' ? '#166534' : status === 'loading' ? '#333' : '#C9A96E',
          color: status === 'success' ? '#fff' : status === 'loading' ? '#888' : '#09090B',
          fontSize: '0.9rem',
          fontFamily: 'monospace',
          cursor: status === 'loading' || status === 'success' ? 'default' : 'pointer',
          marginBottom: '1rem',
        }}
      >
        {status === 'loading' && 'Granting access...'}
        {status === 'success' && '✓ Full access granted'}
        {status === 'error' && 'Failed — tap to retry'}
        {status === 'idle' && 'Grant me full beta access'}
      </button>

      {status === 'success' && (
        <div style={{
          background: '#14532D',
          border: '1px solid #166534',
          borderRadius: 8,
          padding: '1rem',
          marginBottom: '1rem',
        }}>
          <p style={{ margin: '0 0 0.5rem', color: '#86EFAC', fontSize: '0.85rem' }}>
            ✓ Done. Your account is now fully unlocked.
          </p>
          <a
            href="/full-reading"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '0.7rem',
              background: '#C9A96E',
              color: '#09090B',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: '0.85rem',
              marginTop: '0.75rem',
            }}
          >
            Go to full reading →
          </a>
          <a
            href="/chat"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '0.7rem',
              background: 'transparent',
              color: '#C9A96E',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: '0.85rem',
              marginTop: '0.5rem',
              border: '1px solid #C9A96E33',
            }}
          >
            Go to chat →
          </a>
        </div>
      )}

      {status === 'error' && result && (
        <div style={{
          background: '#450A0A',
          border: '1px solid #7F1D1D',
          borderRadius: 8,
          padding: '1rem',
          fontSize: '0.75rem',
          color: '#FCA5A5',
        }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {status === 'success' && result && (
        <details style={{ marginTop: '1rem' }}>
          <summary style={{ color: '#555', fontSize: '0.7rem', cursor: 'pointer' }}>
            Raw response
          </summary>
          <pre style={{
            marginTop: '0.5rem',
            fontSize: '0.65rem',
            color: '#555',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>
      )}
    </main>
  )
}
