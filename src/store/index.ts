import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Session Store ────────────────────────────────────────────────────────────

interface SessionState {
  userId: string | null
  guestId: string | null
  isUnlocked: boolean
  isSubscribed: boolean
  remainingMessages: number
  setSession: (userId: string, guestId: string) => void
  setUnlocked: () => void
  setSubscribed: () => void
  decrementMessages: () => void
  setRemainingMessages: (n: number) => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      userId: null,
      guestId: null,
      isUnlocked: false,
      isSubscribed: false,
      remainingMessages: 2,
      setSession: (userId, guestId) => set({ userId, guestId }),
      setUnlocked: () => set({ isUnlocked: true, remainingMessages: 10 }),
      setSubscribed: () => set({ isSubscribed: true, isUnlocked: true, remainingMessages: 999 }),
      decrementMessages: () => set(s => ({ remainingMessages: Math.max(0, s.remainingMessages - 1) })),
      setRemainingMessages: (n) => set({ remainingMessages: n }),
    }),
    { name: 'futura-session' }
  )
)

// ─── Onboarding Store ─────────────────────────────────────────────────────────

interface OnboardingState {
  focusArea: string | null
  currentState: string | null
  personalityTrait: string | null
  ageBand: string | null
  palmImageUrl: string | null
  palmPreviewUrl: string | null
  name: string | null
  dobDay: number | null
  dobMonth: number | null
  dobYear: number | null
  starSign: string | null
  lifePathNumber: number | null
  beliefSystem: string | null
  setFocusArea: (v: string) => void
  setCurrentState: (v: string) => void
  setPersonalityTrait: (v: string) => void
  setAgeBand: (v: string) => void
  setPalmImage: (url: string, preview: string) => void
  setName: (v: string) => void
  setDob: (day: number, month: number, year: number, starSign: string, lifePathNumber: number) => void
  setBeliefSystem: (v: string) => void
  reset: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      focusArea: null,
      currentState: null,
      personalityTrait: null,
      ageBand: null,
      palmImageUrl: null,
      palmPreviewUrl: null,
      name: null,
      dobDay: null,
      dobMonth: null,
      dobYear: null,
      starSign: null,
      lifePathNumber: null,
      beliefSystem: null,
      setFocusArea: (v) => set({ focusArea: v }),
      setCurrentState: (v) => set({ currentState: v }),
      setPersonalityTrait: (v) => set({ personalityTrait: v }),
      setAgeBand: (v) => set({ ageBand: v }),
      setPalmImage: (url, preview) => set({ palmImageUrl: url, palmPreviewUrl: preview }),
      setName: (v) => set({ name: v }),
      setDob: (day, month, year, starSign, lifePathNumber) => set({ dobDay: day, dobMonth: month, dobYear: year, starSign, lifePathNumber }),
      setBeliefSystem: (v) => set({ beliefSystem: v }),
      reset: () => set({
        focusArea: null, currentState: null,
        personalityTrait: null, ageBand: null,
        palmImageUrl: null, palmPreviewUrl: null,
        name: null, dobDay: null, dobMonth: null, dobYear: null,
        starSign: null, lifePathNumber: null, beliefSystem: null,
      }),
    }),
    { name: 'futura-onboarding' }
  )
)
