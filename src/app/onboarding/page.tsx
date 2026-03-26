'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar, ProgressBar, PremiumButton, Orb } from '@/components/shared'
import { useOnboardingStore, useSessionStore } from '@/store'

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

// ─── Option Card ──────────────────────────────────────────────────────────────

function OptionCard({
  label, selected, onSelect,
}: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      style={{
        width: '100%',
        padding: '1rem 1.25rem',
        background: selected ? 'rgba(201,169,110,0.1)' : 'var(--bg-card)',
        border: `1px solid ${selected ? 'rgba(201,169,110,0.45)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-body)',
        fontWeight: 300,
        fontSize: '0.925rem',
        letterSpacing: '0.01em',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.2s var(--ease-out)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {label}
      {selected && (
        <span style={{ color: 'var(--gold)', fontSize: '0.8rem' }}>✓</span>
      )}
    </button>
  )
}

// ─── Palm Upload Screen ───────────────────────────────────────────────────────

function PalmUploadScreen({ onNext }: { onNext: () => void }) {
  const { setPalmImage, palmPreviewUrl } = useOnboardingStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    const preview = URL.createObjectURL(file)
    // In production: upload to Supabase Storage here
    // For MVP we store preview URL locally and pass actual URL after upload
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
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2rem', fontWeight: 300,
          letterSpacing: '-0.01em', marginBottom: '0.6rem',
        }}>
          Scan your palm
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.65 }}>
          Hold your dominant hand open, palm facing the camera. This helps personalize your insight.
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          flex: 1,
          minHeight: 240,
          border: `1px dashed ${dragging ? 'var(--gold)' : palmPreviewUrl ? 'rgba(201,169,110,0.3)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-lg)',
          background: dragging ? 'var(--gold-glow)' : 'var(--bg-card)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {palmPreviewUrl ? (
          <>
            <img
              src={palmPreviewUrl}
              alt="Palm"
              style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, opacity: 0.6 }}
            />
            <div style={{
              position: 'relative', zIndex: 1,
              background: 'rgba(9,9,11,0.7)', padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-full)', backdropFilter: 'blur(8px)',
            }}>
              <span style={{ color: 'var(--gold)', fontSize: '0.8rem', letterSpacing: '0.06em' }}>
                ✓ Image captured
              </span>
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
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="user"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>

      <PremiumButton onClick={onNext} disabled={!palmPreviewUrl} size="lg">
        {palmPreviewUrl ? 'Continue' : 'Upload your palm to continue'}
      </PremiumButton>

      <button
        onClick={onNext}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: '0.78rem',
          letterSpacing: '0.04em', fontFamily: 'var(--font-body)',
          marginTop: '-1rem', textDecoration: 'underline',
          textDecorationColor: 'var(--text-muted)',
        }}
      >
        Skip for now
      </button>
    </div>
  )
}

// ─── Question Screen ──────────────────────────────────────────────────────────

function QuestionScreen({
  question, options, selected, onSelect, onNext,
}: {
  question: string
  options: { value: string; label: string }[]
  selected: string | null
  onSelect: (v: string) => void
  onNext: () => void
}) {
  return (
    <div className="animate-fade-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingTop: '1rem' }}>
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.9rem', fontWeight: 300,
        letterSpacing: '-0.01em', lineHeight: 1.2,
      }}>
        {question}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
        {options.map(opt => (
          <OptionCard
            key={opt.value}
            label={opt.label}
            selected={selected === opt.value}
            onSelect={() => onSelect(opt.value)}
          />
        ))}
      </div>

      <PremiumButton onClick={onNext} disabled={!selected} size="lg">
        Continue
      </PremiumButton>
    </div>
  )
}

// ─── Main Onboarding Page ─────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const store = useOnboardingStore()
  const { userId } = useSessionStore()
  const [step, setStep] = useState(0) // 0 = palm, 1-4 = questions
  const [submitting, setSubmitting] = useState(false)

  const totalSteps = 5 // palm + 4 questions

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
      // Create profile
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
        }),
      })

      // Trigger reading generation
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

  const currentQuestion = step > 0 ? QUESTIONS[step - 1] : null

  return (
    <main className="page">
      <div className="page-inner">
        <TopBar showBack onBack={handleBack} />
        <ProgressBar step={step + 1} total={totalSteps} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: '2rem' }}>
          {step === 0 ? (
            <PalmUploadScreen onNext={handleNext} />
          ) : currentQuestion ? (
            <QuestionScreen
              key={currentQuestion.id}
              question={currentQuestion.question}
              options={currentQuestion.options}
              selected={answers[currentQuestion.id]}
              onSelect={setters[currentQuestion.id]}
              onNext={step === totalSteps - 1
                ? () => { if (!submitting) handleFinalNext() }
                : handleNext}
            />
          ) : null}
        </div>
      </div>
    </main>
  )
}
