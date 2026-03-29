'use client'

import { useState, useRef, useCallback } from 'react'
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

  const selStyle: React.CSSProperties = {
    flex: 1, background: 'rgba(201,169,110,0.05)',
    border: '1px solid rgba(201,169,110,0.18)', borderRadius: '10px',
    padding: '12px 6px', fontFamily: 'var(--font-body)', fontSize: '12px',
    color: 'rgba(240,235,225,0.55)', outline: 'none', cursor: 'pointer',
    textAlign: 'center', WebkitAppearance: 'none' as never,
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
        <select style={selStyle} value={day} onChange={e => setDay(e.target.value)}>
          <option value="">Day</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select style={selStyle} value={month} onChange={e => handleMonthChange(e.target.value)}>
          <option value="">Month</option>
          {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <select style={selStyle} value={year} onChange={e => setYear(e.target.value)}>
          <option value="">Year</option>
          {Array.from({ length: 67 }, (_, i) => 2006 - i).map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
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

// ─── Palm Upload Screen ───────────────────────────────────────────────────────

function PalmUploadScreen({ onNext, stepNumber }: { onNext: () => void; stepNumber: number }) {
  const { setPalmImage, palmPreviewUrl } = useOnboardingStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    const preview = URL.createObjectURL(file)
    setPalmImage(preview, preview)
    setTimeout(() => { setUploading(false) }, 800)
  }, [setPalmImage])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="animate-fade-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem', paddingTop: '1rem' }}>
      <div>
        <p style={stepTag}>Step {stepNumber} of 7 — Your palm</p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 300, letterSpacing: '-0.01em', marginBottom: '0.6rem' }}>
          Scan your palm
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.65 }}>
          Hold your dominant hand open, palm facing the camera. This helps personalize your insight.
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          flex: 1, minHeight: 240,
          border: `1px dashed ${dragging ? 'var(--gold)' : palmPreviewUrl ? 'rgba(201,169,110,0.3)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-lg)', background: dragging ? 'var(--gold-glow)' : 'var(--bg-card)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.2s ease', overflow: 'hidden', position: 'relative',
        }}
      >
        {palmPreviewUrl ? (
          <>
            <img src={palmPreviewUrl} alt="Palm" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, opacity: 0.6 }} />
            <div style={{ position: 'relative', zIndex: 1, background: 'rgba(9,9,11,0.7)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', backdropFilter: 'blur(8px)' }}>
              <span style={{ color: 'var(--gold)', fontSize: '0.8rem', letterSpacing: '0.06em' }}>✓ Image captured</span>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: '1rem', opacity: 0.3 }}>
              <Orb size={64} intensity={1.5} animated={false} />
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', letterSpacing: '0.04em' }}>
              {uploading ? 'Processing...' : 'Tap to upload · or drag & drop'}
            </p>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      </div>

      <PremiumButton onClick={onNext} disabled={!palmPreviewUrl} size="lg">
        {palmPreviewUrl ? 'Continue' : 'Upload your palm to continue'}
      </PremiumButton>

      <button onClick={onNext} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.78rem', letterSpacing: '0.04em', fontFamily: 'var(--font-body)', marginTop: '-1rem', textDecoration: 'underline', textDecorationColor: 'var(--text-muted)' }}>
        Skip for now
      </button>
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
