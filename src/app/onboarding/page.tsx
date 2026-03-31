'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar, ProgressBar, PremiumButton, Orb } from '@/components/shared'
import { useOnboardingStore, useSessionStore } from '@/store'

// ─── Life Path Number ─────────────────────────────────────────────────────────

function calcLifePath(day: number, month: number, year: number): number {
  const digits = `${day}${month}${year}`.split('').map(Number)
  let sum = digits.reduce((a, b) => a + b, 0)
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = sum.toString().split('').map(Number).reduce((a, b) => a + b, 0)
  }
  return sum
}

// ─── Star Sign Data ───────────────────────────────────────────────────────────

const SIGNS = [
  { name: 'Capricorn', icon: '♑', note: 'Ambitious & disciplined — your reading focuses on what you are building' },
  { name: 'Aquarius',  icon: '♒', note: 'Visionary & unconventional — your reading reflects your unique path' },
  { name: 'Pisces',    icon: '♓', note: 'Deeply intuitive — your reading speaks to what you already sense' },
  { name: 'Aries',     icon: '♈', note: 'Bold & decisive — your reading cuts straight to what is coming' },
  { name: 'Taurus',    icon: '♉', note: 'Grounded & determined — your reading focuses on what truly lasts' },
  { name: 'Gemini',    icon: '♊', note: 'Curious & adaptable — your reading reflects the tension you navigate' },
  { name: 'Cancer',    icon: '♋', note: 'Emotionally deep — your reading speaks to what lives beneath the surface' },
  { name: 'Leo',       icon: '♌', note: 'Magnetic & driven — your reading reflects the power moving around you' },
  { name: 'Virgo',     icon: '♍', note: 'Analytical & precise — your reading is exact and unflinching' },
  { name: 'Libra',     icon: '♎', note: 'Seeking balance — your reading addresses the tension pulling at you' },
  { name: 'Scorpio',   icon: '♏', note: 'Intense & transformative — your reading goes to the depths' },
  { name: 'Sagittarius', icon: '♐', note: 'Freedom-seeking — your reading reflects the expansion that is coming' },
]

// ─── Religion Data ────────────────────────────────────────────────────────────

const BELIEFS = [
  { icon: '✝️', label: 'Christian',   sub: 'Faith & divine plan',     tone: 'God has a plan for you — your reading reveals exactly where you stand in it right now' },
  { icon: '☪️', label: 'Muslim',      sub: 'Purpose & submission',    tone: 'Your path is written — your reading illuminates the signs already appearing around you' },
  { icon: '✨', label: 'Spiritual',   sub: 'Energy & universe',       tone: 'The universe has been sending you signals. Your reading translates what they mean' },
  { icon: '🕉️', label: 'Hindu',       sub: 'Karma & dharma',          tone: 'Your karma is speaking. Your reading shows where your dharmic path leads from here' },
  { icon: '☸️', label: 'Buddhist',    sub: 'Mindfulness & path',      tone: 'The pattern of your mind and your hand are one. Your reading shows where they align' },
  { icon: '🔬', label: 'No religion', sub: 'Logic & science',         tone: 'Science has identified these patterns for 5,000 years. Your reading maps what they mean for you' },
]

// ─── Question Definitions ─────────────────────────────────────────────────────

const QUESTIONS = [
  {
    id: 'focusArea',
    question: 'What do you want insight on?',
    options: [
      { value: 'love',           label: 'Love & relationships' },
      { value: 'money',          label: 'Money & opportunity' },
      { value: 'life_direction', label: 'Life direction' },
    ],
  },
  {
    id: 'currentState',
    question: 'Which feels closest right now?',
    options: [
      { value: 'feeling_stuck',       label: 'Feeling stuck' },
      { value: 'turning_point',       label: 'At a turning point' },
      { value: 'okay_but_uncertain',  label: 'Things are okay, but uncertain' },
    ],
  },
  {
    id: 'personalityTrait',
    question: 'Which sounds most like you?',
    options: [
      { value: 'overthink_decisions',    label: 'I overthink decisions' },
      { value: 'trust_people_easily',    label: 'I trust people easily' },
      { value: 'keep_things_to_myself',  label: 'I keep things to myself' },
    ],
  },
  {
    id: 'ageBand',
    question: 'Your age range',
    options: [
      { value: '18-24', label: '18 – 24' },
      { value: '25-34', label: '25 – 34' },
      { value: '35-44', label: '35 – 44' },
      { value: '45+',   label: '45+' },
    ],
  },
]

// ─── Shared styles ────────────────────────────────────────────────────────────

const stepTag: React.CSSProperties = {
  fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase',
  color: 'rgba(201,169,110,0.38)', marginBottom: '6px', fontFamily: 'var(--font-body)',
}

const qHead: React.CSSProperties = {
  fontFamily: 'var(--font-display)', fontSize: '27px', fontWeight: 300,
  lineHeight: 1.15, color: '#F0EBE1', letterSpacing: '-0.01em', marginBottom: '6px',
}

const qSub: React.CSSProperties = {
  fontSize: '11.5px', lineHeight: 1.6, color: 'rgba(240,235,225,0.35)',
  marginBottom: '20px', fontFamily: 'var(--font-body)',
}

const ctaBtn: React.CSSProperties = {
  width: '100%', padding: '15px', background: '#C9A96E', border: 'none',
  borderRadius: '100px', fontFamily: 'var(--font-body)', fontSize: '12px',
  fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
  color: '#080706', cursor: 'pointer',
  boxShadow: '0 8px 28px rgba(201,169,110,0.4)', marginBottom: '8px',
}

const trustTxt: React.CSSProperties = {
  fontSize: '9px', color: 'rgba(240,235,225,0.18)', textAlign: 'center',
  letterSpacing: '0.04em', fontFamily: 'var(--font-body)',
}

// ─── Screen 1: Name ───────────────────────────────────────────────────────────

function NameScreen({ onNext }: { onNext: () => void }) {
  const { name, setName } = useOnboardingStore()
  const [val, setVal] = useState(name ?? '')

  function handleNext() {
    if (!val.trim()) return
    setName(val.trim())
    onNext()
  }

  return (
    <div className="animate-fade-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: '1rem' }}>
      <p style={stepTag}>Step 1 of 7 — Who are you?</p>
      <h2 style={qHead}>
        What do we call you,{' '}
        <em style={{ fontStyle: 'italic', color: '#C9A96E' }}>seeker?</em>
      </h2>
      <p style={qSub}>Your name is placed at the heart of every reading. This is yours alone.</p>

      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleNext()}
        placeholder="Your first name..."
        style={{
          width: '100%', background: 'rgba(201,169,110,0.05)',
          border: '1px solid rgba(201,169,110,0.2)', borderRadius: '12px',
          padding: '15px 16px', fontFamily: 'var(--font-display)', fontSize: '22px',
          fontWeight: 300, color: '#F0EBE1', outline: 'none', marginBottom: '12px',
          fontStyle: val ? 'normal' : 'italic',
        }}
      />

      <p style={{ fontSize: '10px', color: 'rgba(201,169,110,0.3)', letterSpacing: '0.05em', marginBottom: '24px', fontFamily: 'var(--font-body)' }}>
        ✦ &nbsp; Every reading begins with your name — no one else's
      </p>

      <div style={{ flex: 1 }} />
      <button style={{ ...ctaBtn, opacity: val.trim() ? 1 : 0.5 }} onClick={handleNext}>
        This is me →
      </button>
      <p style={trustTxt}>Private · Never shared · Yours only</p>
    </div>
  )
}

// ─── Custom Select (no native dropdown — fully dark-themed) ──────────────────

function CustomSelect({
  value,
  placeholder,
  options,
  onChange,
}: {
  value: string
  placeholder: string
  options: Array<{ label: string; value: string | number }>
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Scroll selected item into view when opening
  useEffect(() => {
    if (open && value && listRef.current) {
      const selected = listRef.current.querySelector('[data-selected="true"]') as HTMLElement | null
      if (selected) selected.scrollIntoView({ block: 'center' })
    }
  }, [open, value])

  const selectedLabel = options.find(o => String(o.value) === value)?.label ?? placeholder

  return (
    <div ref={containerRef} style={{ flex: 1, position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: '100%',
          background: 'rgba(201,169,110,0.05)',
          border: `1px solid ${open ? 'rgba(201,169,110,0.5)' : value ? 'rgba(201,169,110,0.3)' : 'rgba(201,169,110,0.18)'}`,
          borderRadius: '10px',
          padding: '12px 8px',
          fontFamily: 'var(--font-body)',
          fontSize: '12px',
          color: value ? '#F0EBE1' : 'rgba(240,235,225,0.35)',
          cursor: 'pointer',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          transition: 'border-color 0.2s',
          boxShadow: open ? '0 0 0 1px rgba(201,169,110,0.12)' : 'none',
        }}
      >
        <span style={{ flex: 1, textAlign: 'center' }}>{selectedLabel}</span>
        <span style={{ fontSize: '8px', color: 'rgba(201,169,110,0.45)', flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            left: 0,
            right: 0,
            background: '#0F0E0C',
            border: '1px solid rgba(201,169,110,0.28)',
            borderRadius: '10px',
            maxHeight: '210px',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 12px 40px rgba(0,0,0,0.75)',
            scrollbarWidth: 'none',
          }}
        >
          {options.map(opt => {
            const isSelected = String(opt.value) === value
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                data-selected={isSelected}
                aria-selected={isSelected}
                onClick={() => { onChange(String(opt.value)); setOpen(false) }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: isSelected ? 'rgba(201,169,110,0.13)' : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid rgba(201,169,110,0.06)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  color: isSelected ? '#C9A96E' : 'rgba(240,235,225,0.68)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                {opt.label}
                {isSelected && <span style={{ fontSize: '10px', color: '#C9A96E' }}>✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Screen 2: Date of Birth ──────────────────────────────────────────────────

function DobScreen({ onNext }: { onNext: () => void }) {
  const { setDob } = useOnboardingStore()
  const [day, setDay] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [sign, setSign] = useState<typeof SIGNS[0] | null>(null)

  function handleMonthChange(m: string) {
    setMonth(m)
    const mi = parseInt(m)
    if (mi) setSign(SIGNS[mi - 1])
  }

  function handleNext() {
    if (!day || !month || !year) return
    const d = parseInt(day), mo = parseInt(month), y = parseInt(year)
    const s = SIGNS[mo - 1]
    const lp = calcLifePath(d, mo, y)
    setDob(d, mo, y, s.name, lp)
    onNext()
  }

  return (
    <div className="animate-fade-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: '1rem' }}>
      <p style={stepTag}>Step 2 of 7 — Your birth</p>
      <h2 style={qHead}>
        When did you arrive{' '}
        <em style={{ fontStyle: 'italic', color: '#C9A96E' }}>in this world?</em>
      </h2>
      <p style={qSub}>Your date of birth unlocks your star sign, life path number, and every cosmic pattern active in your life right now.</p>

      <div style={{ display: 'flex', gap: '7px', marginBottom: '10px' }}>
        <CustomSelect
          value={day}
          placeholder="Day"
          options={Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1), value: i + 1 }))}
          onChange={setDay}
        />
        <CustomSelect
          value={month}
          placeholder="Month"
          options={['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => ({ label: m, value: i + 1 }))}
          onChange={handleMonthChange}
        />
        <CustomSelect
          value={year}
          placeholder="Year"
          options={Array.from({ length: 87 }, (_, i) => 2006 - i).map(y => ({ label: String(y), value: y }))}
          onChange={setYear}
        />
      </div>

      {sign && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'rgba(201,169,110,0.07)', border: '1px solid rgba(201,169,110,0.22)',
          borderRadius: '10px', padding: '11px 14px', marginBottom: '14px',
        }}>
          <span style={{ fontSize: '22px' }}>{sign.icon}</span>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: '#C9A96E' }}>{sign.name}</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'rgba(240,235,225,0.32)', marginTop: '2px' }}>{sign.note}</p>
          </div>
        </div>
      )}

      <div style={{ flex: 1 }} />
      <button style={{ ...ctaBtn, opacity: day && month && year ? 1 : 0.5 }} onClick={handleNext}>
        Reveal my sign →
      </button>
      <p style={trustTxt}>Used only to enrich your reading</p>
    </div>
  )
}

// ─── Screen 3: Religion / World View ─────────────────────────────────────────

function BeliefScreen({ onNext }: { onNext: () => void }) {
  const { setBeliefSystem } = useOnboardingStore()
  const [selected, setSelected] = useState<typeof BELIEFS[0] | null>(null)

  function handleNext() {
    if (!selected) return
    setBeliefSystem(selected.label)
    onNext()
  }

  return (
    <div className="animate-fade-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: '1rem' }}>
      <p style={stepTag}>Step 3 of 7 — Your world view</p>
      <h2 style={qHead}>
        How do you understand{' '}
        <em style={{ fontStyle: 'italic', color: '#C9A96E' }}>the world?</em>
      </h2>
      <p style={qSub}>This shapes the language of your reading — every belief is honoured here.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px', marginBottom: '10px' }}>
        {BELIEFS.map(b => (
          <button
            key={b.label}
            onClick={() => setSelected(b)}
            style={{
              background: selected?.label === b.label ? 'rgba(201,169,110,0.09)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${selected?.label === b.label ? 'rgba(201,169,110,0.32)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: '10px', padding: '11px 10px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: '3px',
              transition: 'all 0.2s', textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '17px', marginBottom: '2px' }}>{b.icon}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 600, color: 'rgba(240,235,225,0.78)' }}>{b.label}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '9.5px', color: 'rgba(240,235,225,0.28)', lineHeight: 1.4 }}>{b.sub}</span>
          </button>
        ))}
      </div>

      {selected && (
        <div style={{
          borderLeft: '2px solid rgba(201,169,110,0.55)',
          borderTop: '1px solid rgba(201,169,110,0.1)',
          borderRight: '1px solid rgba(201,169,110,0.1)',
          borderBottom: '1px solid rgba(201,169,110,0.1)',
          borderRadius: '0 10px 10px 0', padding: '10px 13px', marginBottom: '12px',
        }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '9px', letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.38)', marginBottom: '5px' }}>
            Your reading will say...
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontStyle: 'italic', lineHeight: 1.55, color: 'rgba(240,235,225,0.55)' }}>
            {selected.tone}
          </p>
        </div>
      )}

      <div style={{ flex: 1 }} />
      <button style={{ ...ctaBtn, opacity: selected ? 1 : 0.5 }} onClick={handleNext}>
        This is how I see the world →
      </button>
      <p style={trustTxt}>No belief excluded · All are equal here</p>
    </div>
  )
}

// ─── Palm Scan Screen ─────────────────────────────────────────────────────────

type ScanPhase    = 'start' | 'camera' | 'processing' | 'result'
type CameraSignal = 'ready' | 'good' | 'warn' | 'dark' | 'bright'
type ScanQuality  = 'good' | 'okay' | 'bad'

function palmDelay(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

const SIGNAL_COLOR: Record<CameraSignal, string> = {
  ready:  'rgba(201,169,110,0.55)',
  good:   '#3ecf8e',
  warn:   'rgba(201,169,110,0.55)',  // neutral gold — not alarming
  dark:   '#ef4444',
  bright: '#f59e0b',
}

const SIGNAL_TEXT: Record<CameraSignal, string> = {
  ready:  'Position your palm in the frame',
  good:   'Ready — tap to scan',
  warn:   'Place your palm in the frame',
  dark:   'A little more light would help',
  bright: 'Step away from direct light',
}

const PROCESSING_STEPS = ['Detecting palm', 'Checking clarity', 'Mapping lines']

function PalmUploadScreen({ onNext, stepNumber }: { onNext: () => void; stepNumber: number }) {
  const { setPalmImage, palmPreviewUrl } = useOnboardingStore()
  const { userId } = useSessionStore()

  const [phase,         setPhase]         = useState<ScanPhase>('start')
  const [signal,        setSignal]        = useState<CameraSignal>('ready')
  const [procStep,      setProcStep]      = useState(0)
  const [scanQuality,   setScanQuality]   = useState<ScanQuality | null>(null)
  const [feedback,      setFeedback]      = useState('')
  const [retakeCount,   setRetakeCount]   = useState(0)
  const [cameraBlocked, setCameraBlocked] = useState(false)

  const videoRef     = useRef<HTMLVideoElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const streamRef    = useRef<MediaStream | null>(null)
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const galleryRef   = useRef<HTMLInputElement>(null)

  // Attach stream after camera phase renders the video element
  useEffect(() => {
    if (phase === 'camera' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [phase])

  // Stop camera when leaving the screen
  useEffect(() => () => stopStream(), [])

  function stopStream() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  async function openCamera() {
    setCameraBlocked(false)
    if (!navigator.mediaDevices?.getUserMedia) { setCameraBlocked(true); return }
    try {
      let stream: MediaStream
      // Prefer rear/environment camera on mobile; fall back to any camera (desktop webcam)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
      }
      streamRef.current = stream
      setPhase('camera')
      timerRef.current = setInterval(analyzeFrame, 800)
    } catch {
      setCameraBlocked(true)
    }
  }

  function analyzeFrame() {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2 || !video.videoWidth) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    // Sample center 40% of frame
    const sw = Math.max(1, Math.floor(canvas.width  * 0.4))
    const sh = Math.max(1, Math.floor(canvas.height * 0.4))
    const sx = Math.floor((canvas.width  - sw) / 2)
    const sy = Math.floor((canvas.height - sh) / 2)
    const d  = ctx.getImageData(sx, sy, sw, sh).data
    const n  = sw * sh
    let r = 0, g = 0, b = 0
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i+1]; b += d[i+2] }
    r /= n; g /= n; b /= n
    const lum = 0.299 * r + 0.587 * g + 0.114 * b

    // Only flag genuinely extreme conditions — everything in normal range is good
    if      (lum < 30)  setSignal('dark')
    else if (lum > 230) setSignal('bright')
    else                setSignal('good')
  }

  async function capture() {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width  = video.videoWidth  || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    stopStream()
    canvas.toBlob(blob => { if (blob) processImage(blob) }, 'image/jpeg', 0.92)
  }

  async function processImage(data: Blob | File) {
    const preview = URL.createObjectURL(data)
    setPalmImage(preview, preview)
    setPhase('processing')
    setProcStep(0); await palmDelay(650)
    setProcStep(1); await palmDelay(650)
    setProcStep(2); await palmDelay(800)
    await uploadAndAnalyze(data, preview)
  }

  async function uploadAndAnalyze(data: Blob | File, preview: string) {
    try {
      const fd = new FormData()
      fd.append('palm', data, 'palm.jpg')
      fd.append('userId', userId ?? '')
      const res  = await fetch('/api/palm/analyze', { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({}))

      // Distinguish error types — never blame the user's palm for a service problem
      if (res.status >= 500) {
        // Infrastructure / network failure — not the user's fault
        setScanQuality('okay')
        setFeedback('Our system is taking a moment — you can continue or try again')
        setPhase('result')
        return
      }

      if (res.status === 400) {
        // Corrupted or non-image file — the only case we genuinely can't proceed
        setScanQuality('bad')
        setFeedback('That file doesn\'t look like a photo — try again')
        setPhase('result')
        return
      }

      const quality: ScanQuality = json.quality ?? 'good'
      if (json.publicUrl) setPalmImage(json.publicUrl, preview)
      setScanQuality(quality)
      setFeedback(json.feedback ?? '')
      setPhase('result')
      if (quality === 'good') { await palmDelay(800); onNext() }
    } catch {
      // Network error — service problem, not a palm quality problem
      setScanQuality('okay')
      setFeedback('Something interrupted the connection — you can continue or try again')
      setPhase('result')
    }
  }

  function doRetake() {
    setRetakeCount(c => c + 1)
    setScanQuality(null)
    setFeedback('')
    setProcStep(0)
    setPalmImage('', '')
    stopStream()
    setSignal('ready')
    setPhase('start')
  }

  // ── Phase: start ─────────────────────────────────────────────────────────────
  if (phase === 'start') return (
    <div className="animate-fade-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: '1rem' }}>
      <p style={stepTag}>Step {stepNumber} of 7 — Your palm</p>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 300, letterSpacing: '-0.01em', marginBottom: '0.5rem' }}>
        Scan your palm
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.65, marginBottom: '1.8rem' }}>
        Your palm lines are the anchor of your reading. Hold your dominant hand flat, fingers spread.
      </p>

      {/* Camera CTA */}
      <button type="button" onClick={openCamera} style={{
        width: '100%', padding: '18px 16px',
        background: 'rgba(201,169,110,0.07)',
        border: '1px solid rgba(201,169,110,0.35)',
        borderRadius: '16px', marginBottom: '10px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '14px',
        transition: 'all 0.2s',
      }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(201,169,110,0.12)', border: '1px solid rgba(201,169,110,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '20px' }}>✋</span>
        </div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, letterSpacing: '0.05em', color: '#C9A96E', margin: 0 }}>Scan palm now</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '10.5px', color: 'rgba(240,235,225,0.35)', margin: '2px 0 0', letterSpacing: '0.02em' }}>Opens in-app camera · guided</p>
        </div>
        <span style={{ marginLeft: 'auto', color: 'rgba(201,169,110,0.45)', fontSize: '16px' }}>›</span>
      </button>

      {/* Upload fallback */}
      <button type="button" onClick={() => galleryRef.current?.click()} style={{
        width: '100%', padding: '13px 16px', background: 'transparent',
        border: '1px solid rgba(201,169,110,0.1)', borderRadius: '14px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        transition: 'all 0.2s',
      }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(240,235,225,0.38)', letterSpacing: '0.04em' }}>
          Upload existing photo instead
        </span>
      </button>
      <input ref={galleryRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) processImage(f); e.target.value = '' }} />

      {cameraBlocked && (
        <div style={{ marginTop: '12px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '10px 14px' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'rgba(245,158,11,0.85)', margin: 0, lineHeight: 1.5 }}>
            Camera isn't available — tap below to upload your palm photo instead.
          </p>
        </div>
      )}

      <div style={{ flex: 1 }} />
      <p style={{ textAlign: 'center', fontSize: '0.68rem', color: 'rgba(240,235,225,0.18)', fontFamily: 'var(--font-body)', letterSpacing: '0.04em' }}>
        Your palm is the foundation of your reading — it cannot be skipped
      </p>
    </div>
  )

  // ── Phase: camera ─────────────────────────────────────────────────────────────
  if (phase === 'camera') {
    const borderCol = SIGNAL_COLOR[signal]
    const signalText = SIGNAL_TEXT[signal]
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: '0.5rem' }}>
        <p style={{ ...stepTag, marginBottom: '10px' }}>Step {stepNumber} of 7 — Your palm</p>

        {/* Camera viewport */}
        <div style={{
          position: 'relative', width: '100%', aspectRatio: '3/4',
          borderRadius: '18px', overflow: 'hidden',
          border: `1.5px solid ${borderCol}`,
          boxShadow: `0 0 24px ${borderCol}33`,
          background: '#000',
          transition: 'border-color 0.4s, box-shadow 0.4s',
          flexShrink: 0,
        }}>
          {/* Live video stream */}
          <video ref={videoRef} playsInline muted style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover',
          }} />

          {/* Hidden canvas for frame analysis + capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Viewfinder overlay */}
          <svg
            viewBox="0 0 300 400"
            width="100%" height="100%"
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Corner brackets */}
            {[
              'M 48 20 L 20 20 L 20 60',  // top-left
              'M 252 20 L 280 20 L 280 60', // top-right
              'M 48 380 L 20 380 L 20 340', // bottom-left
              'M 252 380 L 280 380 L 280 340', // bottom-right
            ].map((d, i) => (
              <path key={i} d={d} fill="none" stroke={borderCol} strokeWidth="2.5" strokeLinecap="round"
                style={{ transition: 'stroke 0.4s' }} />
            ))}
            {/* Palm guide oval */}
            <ellipse cx="150" cy="200" rx="90" ry="115" fill="none"
              stroke={borderCol} strokeWidth="1" strokeDasharray="6 4" opacity="0.45"
              style={{ transition: 'stroke 0.4s' }} />
          </svg>

          {/* Signal badge */}
          <div style={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(8,7,6,0.82)', backdropFilter: 'blur(12px)',
            padding: '6px 16px', borderRadius: '100px',
            border: `1px solid ${borderCol}55`,
            display: 'flex', alignItems: 'center', gap: '7px',
            transition: 'all 0.3s', whiteSpace: 'nowrap',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: borderCol, display: 'inline-block', transition: 'background 0.3s' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '11.5px', color: 'rgba(240,235,225,0.82)', letterSpacing: '0.04em' }}>
              {signalText}
            </span>
          </div>
        </div>

        {/* Capture + cancel row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
          {/* Cancel */}
          <button type="button" onClick={() => { stopStream(); setPhase('start') }} style={{
            background: 'none', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '50%',
            width: 44, height: 44, cursor: 'pointer', color: 'rgba(240,235,225,0.35)', fontSize: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} aria-label="Cancel">✕</button>

          {/* Capture shutter */}
          <button type="button" onClick={capture} aria-label="Capture" style={{
            width: 68, height: 68, borderRadius: '50%',
            background: 'rgba(201,169,110,0.12)',
            border: `3px solid ${SIGNAL_COLOR[signal]}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: `0 0 20px ${SIGNAL_COLOR[signal]}44`,
            transition: 'all 0.3s',
          }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: SIGNAL_COLOR[signal], transition: 'background 0.3s' }} />
          </button>

          {/* Upload fallback (right of shutter) */}
          <button type="button" onClick={() => { stopStream(); setPhase('start'); setTimeout(() => galleryRef.current?.click(), 50) }} style={{
            background: 'none', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '50%',
            width: 44, height: 44, cursor: 'pointer', color: 'rgba(240,235,225,0.35)', fontSize: '15px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} aria-label="Upload from gallery">↑</button>
        </div>

        <p style={{ textAlign: 'center', marginTop: '10px', fontFamily: 'var(--font-body)', fontSize: '10px', color: 'rgba(240,235,225,0.22)', letterSpacing: '0.04em' }}>
          Align palm · keep fingers visible · tap to capture
        </p>
      </div>
    )
  }

  // ── Phase: processing ─────────────────────────────────────────────────────────
  if (phase === 'processing') return (
    <div className="animate-fade-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: '0.5rem' }}>
      <p style={stepTag}>Step {stepNumber} of 7 — Your palm</p>

      <div style={{
        position: 'relative', width: '100%', aspectRatio: '3/4',
        borderRadius: '18px', overflow: 'hidden',
        border: '1px solid rgba(201,169,110,0.2)',
        background: '#000', flexShrink: 0,
      }}>
        {palmPreviewUrl && (
          <img src={palmPreviewUrl} alt="Palm" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} />
        )}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '22px' }}>
          {/* Spinner */}
          <div style={{ width: 52, height: 52, borderRadius: '50%', border: '2px solid rgba(201,169,110,0.1)', borderTopColor: '#C9A96E', animation: 'rotate-slow 1s linear infinite' }} />
          {/* Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            {PROCESSING_STEPS.map((label, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '9px', opacity: i <= procStep ? 1 : 0.2, transition: 'opacity 0.5s' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: i < procStep ? '#3ecf8e' : i === procStep ? '#C9A96E' : 'rgba(201,169,110,0.3)', transition: 'background 0.4s' }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: i === procStep ? '#C9A96E' : i < procStep ? 'rgba(62,207,142,0.8)' : 'rgba(240,235,225,0.3)', letterSpacing: '0.06em', transition: 'color 0.4s' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // ── Phase: result ─────────────────────────────────────────────────────────────
  const canForcePass = retakeCount >= 1  // after 1 forced retry, never block again

  const resultConfig = {
    good:  { color: '#3ecf8e', icon: '✓', label: 'Palm captured' },
    okay:  { color: '#f59e0b', icon: '◐', label: 'Captured — quality could be better' },
    bad:   { color: '#ef4444', icon: '✕', label: feedback || 'Could not read palm clearly' },
  }
  const rc = resultConfig[scanQuality ?? 'okay']

  return (
    <div className="animate-fade-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: '0.5rem' }}>
      <p style={stepTag}>Step {stepNumber} of 7 — Your palm</p>

      <div style={{
        position: 'relative', width: '100%', aspectRatio: '3/4',
        borderRadius: '18px', overflow: 'hidden',
        border: `1.5px solid ${rc.color}55`,
        background: '#000', flexShrink: 0,
      }}>
        {palmPreviewUrl && (
          <img src={palmPreviewUrl} alt="Palm" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }} />
        )}
        {/* Result badge */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(8,7,6,0.95) 0%, transparent 100%)', padding: '32px 20px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px', color: rc.color }}>{rc.icon}</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'rgba(240,235,225,0.85)', letterSpacing: '0.03em' }}>{rc.label}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
        {/* GOOD: auto-advancing, show passive confirmation */}
        {scanQuality === 'good' && (
          <div style={{ textAlign: 'center', padding: '10px', color: '#3ecf8e', fontFamily: 'var(--font-body)', fontSize: '12px', letterSpacing: '0.06em' }}>
            Continuing...
          </div>
        )}

        {/* OKAY: proceed or retake */}
        {scanQuality === 'okay' && (
          <>
            <PremiumButton onClick={onNext} size="lg">Continue anyway</PremiumButton>
            <button type="button" onClick={doRetake} style={{ background: 'none', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '100px', padding: '12px', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(240,235,225,0.4)', cursor: 'pointer', letterSpacing: '0.05em' }}>
              Retake for better results
            </button>
            {feedback && <p style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '11px', color: 'rgba(245,158,11,0.6)', marginTop: '2px' }}>{feedback}</p>}
          </>
        )}

        {/* BAD: forced retake first time, allow pass after */}
        {scanQuality === 'bad' && (
          <>
            {canForcePass && (
              <PremiumButton onClick={onNext} size="lg">Continue anyway</PremiumButton>
            )}
            <button type="button" onClick={doRetake} style={{
              background: canForcePass ? 'none' : 'rgba(201,169,110,0.07)',
              border: `1px solid ${canForcePass ? 'rgba(201,169,110,0.15)' : 'rgba(201,169,110,0.3)'}`,
              borderRadius: '100px', padding: '14px',
              fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: canForcePass ? 400 : 600,
              color: canForcePass ? 'rgba(240,235,225,0.4)' : '#C9A96E', cursor: 'pointer', letterSpacing: '0.05em',
            }}>
              {canForcePass ? 'Try again' : 'Retake — get a clearer shot'}
            </button>
            {feedback && <p style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '11px', color: 'rgba(239,68,68,0.6)', marginTop: '2px' }}>{feedback}</p>}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Option Card ──────────────────────────────────────────────────────────────

function OptionCard({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      style={{
        width: '100%', padding: '1rem 1.25rem',
        background: selected ? 'rgba(201,169,110,0.1)' : 'var(--bg-card)',
        border: `1px solid ${selected ? 'rgba(201,169,110,0.45)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)', color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: '0.925rem',
        letterSpacing: '0.01em', textAlign: 'left', cursor: 'pointer',
        transition: 'all 0.2s var(--ease-out)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}
    >
      {label}
      {selected && <span style={{ color: 'var(--gold)', fontSize: '0.8rem' }}>✓</span>}
    </button>
  )
}

// ─── Question Screen ──────────────────────────────────────────────────────────

function QuestionScreen({ question, options, selected, onSelect, onNext, stepNumber }: {
  question: string; options: { value: string; label: string }[]
  selected: string | null; onSelect: (v: string) => void; onNext: () => void; stepNumber: number
}) {
  return (
    <div className="animate-fade-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingTop: '1rem' }}>
      <p style={stepTag}>Step {stepNumber} of 7</p>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 300, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
        {question}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
        {options.map(opt => (
          <OptionCard key={opt.value} label={opt.label} selected={selected === opt.value} onSelect={() => onSelect(opt.value)} />
        ))}
      </div>
      <PremiumButton onClick={onNext} disabled={!selected} size="lg">Continue</PremiumButton>
    </div>
  )
}

// ─── Main Onboarding Page ─────────────────────────────────────────────────────
// Steps: 0=name, 1=dob, 2=belief, 3=palm, 4-7=questions

export default function OnboardingPage() {
  const router = useRouter()
  const store = useOnboardingStore()
  const { userId } = useSessionStore()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const totalSteps = 8 // 3 new + palm + 4 questions

  const answers: Record<string, string | null> = {
    focusArea: store.focusArea,
    currentState: store.currentState,
    personalityTrait: store.personalityTrait,
    ageBand: store.ageBand,
  }

  const setters: Record<string, (v: string) => void> = {
    focusArea: store.setFocusArea,
    currentState: store.setCurrentState,
    personalityTrait: store.setPersonalityTrait,
    ageBand: store.setAgeBand,
  }

  async function handleFinalNext() {
    setSubmitting(true)
    try {
      await fetch('/api/profile/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          focusArea: store.focusArea,
          currentState: store.currentState,
          personalityTrait: store.personalityTrait,
          ageBand: store.ageBand,
          palmImageUrl: store.palmImageUrl,
          name: store.name,
          dobDay: store.dobDay,
          dobMonth: store.dobMonth,
          dobYear: store.dobYear,
          starSign: store.starSign,
          lifePathNumber: store.lifePathNumber,
          beliefSystem: store.beliefSystem,
        }),
      })

      await fetch('/api/reading/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      router.push('/generating')
    } catch {
      setSubmitting(false)
    }
  }

  function handleNext() {
    if (step < totalSteps - 1) {
      setStep(s => s + 1)
    } else {
      handleFinalNext()
    }
  }

  function handleBack() {
    if (step > 0) setStep(s => s - 1)
    else router.push('/')
  }

  // steps 4-7 map to QUESTIONS[0-3]
  const questionIndex = step - 4
  const currentQuestion = questionIndex >= 0 && questionIndex < QUESTIONS.length ? QUESTIONS[questionIndex] : null

  return (
    <main className="page">
      <div className="page-inner">
        <TopBar showBack onBack={handleBack} />
        <ProgressBar step={step + 1} total={totalSteps} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: '2rem' }}>
          {step === 0 && <NameScreen onNext={handleNext} />}
          {step === 1 && <DobScreen onNext={handleNext} />}
          {step === 2 && <BeliefScreen onNext={handleNext} />}
          {step === 3 && <PalmUploadScreen onNext={handleNext} stepNumber={4} />}
          {currentQuestion && (
            <QuestionScreen
              key={currentQuestion.id}
              question={currentQuestion.question}
              options={currentQuestion.options}
              selected={answers[currentQuestion.id]}
              onSelect={setters[currentQuestion.id]}
              onNext={step === totalSteps - 1 ? () => { if (!submitting) handleFinalNext() } : handleNext}
              stepNumber={step + 1}
            />
          )}
        </div>
      </div>
    </main>
  )
}
