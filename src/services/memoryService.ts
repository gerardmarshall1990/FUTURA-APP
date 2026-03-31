/**
 * memoryService.ts
 *
 * Persistent Memory System — the backbone of personalization.
 * Manages 5 memory types: identity, preference, emotional, event, behavioral.
 * Every AI interaction reads from and writes to this layer.
 */

import { getAdminClient } from '@/lib/supabase/admin'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MemoryType = 'identity' | 'preference' | 'emotional' | 'event' | 'behavioral'

export interface UserMemory {
  id?: string
  user_id: string
  memory_type: MemoryType
  key: string
  value: string
  confidence: number
  source: 'onboarding' | 'chat' | 'reading' | 'insight' | 'system'
  created_at?: string
  updated_at?: string
}

export interface MemorySnapshot {
  identity: UserMemory[]
  preference: UserMemory[]
  emotional: UserMemory[]
  event: UserMemory[]
  behavioral: UserMemory[]
}

// ─── Write Memory ────────────────────────────────────────────────────────────

export async function writeMemory(memory: Omit<UserMemory, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
  await getAdminClient()
    .from('user_memories')
    .upsert(
      {
        user_id: memory.user_id,
        memory_type: memory.memory_type,
        key: memory.key,
        value: memory.value,
        confidence: memory.confidence,
        source: memory.source,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,memory_type,key' }
    )
}

export async function writeMemories(memories: Omit<UserMemory, 'id' | 'created_at' | 'updated_at'>[]): Promise<void> {
  if (memories.length === 0) return
  await Promise.all(memories.map(m => writeMemory(m)))
}

// ─── Read Memories ───────────────────────────────────────────────────────────

export async function getMemories(userId: string, type?: MemoryType): Promise<UserMemory[]> {
  let query = getAdminClient()
    .from('user_memories')
    .select('*')
    .eq('user_id', userId)
    .order('confidence', { ascending: false })

  if (type) query = query.eq('memory_type', type)

  const { data } = await query
  return data ?? []
}

export async function getMemorySnapshot(userId: string): Promise<MemorySnapshot> {
  const all = await getMemories(userId)
  return {
    identity: all.filter(m => m.memory_type === 'identity'),
    preference: all.filter(m => m.memory_type === 'preference'),
    emotional: all.filter(m => m.memory_type === 'emotional'),
    event: all.filter(m => m.memory_type === 'event'),
    behavioral: all.filter(m => m.memory_type === 'behavioral'),
  }
}

// ─── Memory String for Prompt Injection ──────────────────────────────────────

export function buildMemoryContext(snapshot: MemorySnapshot): string {
  const sections: string[] = []

  if (snapshot.identity.length > 0) {
    sections.push(`IDENTITY MEMORIES:\n${snapshot.identity.map(m => `- ${m.key}: ${m.value}`).join('\n')}`)
  }
  if (snapshot.preference.length > 0) {
    sections.push(`PREFERENCES:\n${snapshot.preference.map(m => `- ${m.key}: ${m.value}`).join('\n')}`)
  }
  if (snapshot.emotional.length > 0) {
    sections.push(`EMOTIONAL CONTEXT:\n${snapshot.emotional.map(m => `- ${m.key}: ${m.value}`).join('\n')}`)
  }
  if (snapshot.event.length > 0) {
    sections.push(`RECENT EVENTS:\n${snapshot.event.slice(0, 5).map(m => `- ${m.key}: ${m.value}`).join('\n')}`)
  }
  if (snapshot.behavioral.length > 0) {
    sections.push(`BEHAVIORAL PATTERNS:\n${snapshot.behavioral.map(m => `- ${m.key}: ${m.value}`).join('\n')}`)
  }

  // Surface the most recently updated themes from sessions — gives the advisor
  // immediate awareness of what's been learned in recent conversations
  const recentSessionThemes = [
    ...snapshot.behavioral,
    ...snapshot.emotional,
    ...snapshot.event,
  ]
    .filter(m => m.source === 'chat' && m.updated_at)
    .sort((a, b) => new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime())
    .slice(0, 5)

  if (recentSessionThemes.length > 0) {
    sections.push(
      `RECENT SESSION THEMES (most recent first):\n${recentSessionThemes.map(m => `- ${m.key}: ${m.value}`).join('\n')}`
    )
  }

  return sections.join('\n\n')
}

// ─── Continuity Context for Chat ─────────────────────────────────────────────
// Separate from buildMemoryContext() — this surfaces UNRESOLVED and RECURRING
// themes specifically for the advisor to use as continuity anchors.
//
// Difference from buildMemoryContext():
// - buildMemoryContext()    → complete memory dump, used in all AI calls
// - buildContinuityContext() → focused on what the user keeps returning to,
//                              used ONLY in chat advisor to enable active continuity

export function buildContinuityContext(snapshot: MemorySnapshot): string {
  // "What they've been circling" = chat-sourced themes, most recently updated
  const activeThemes = [
    ...snapshot.behavioral,
    ...snapshot.emotional,
    ...snapshot.event,
  ]
    .filter(m => m.source === 'chat' && m.updated_at)
    .sort((a, b) => new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime())
    .slice(0, 4)

  // "Cross-domain resonance" = same concept appearing in both behavioral AND emotional
  // layers. These are themes that are both felt and enacted — highest unresolved signal.
  const behavioralKeys = new Set(snapshot.behavioral.map(m => m.key))
  const emotionalKeys  = new Set(snapshot.emotional.map(m => m.key))
  const crossDomain    = snapshot.behavioral.map(m => m.key).filter(k => emotionalKeys.has(k))

  if (activeThemes.length === 0 && crossDomain.length === 0) return ''

  const lines: string[] = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `CONTINUITY CONTEXT`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
  ]

  if (activeThemes.length > 0) {
    lines.push(`\nWhat this person has been returning to (most recent first):`)
    for (const m of activeThemes) {
      lines.push(`- ${m.key.replace(/_/g, ' ')}: ${m.value}`)
    }
  }

  if (crossDomain.length > 0) {
    lines.push(`\nCross-domain themes — appear in both behavioral and emotional layers (highest unresolved signal):`)
    for (const k of crossDomain) {
      const bEntry = snapshot.behavioral.find(m => m.key === k)
      const eEntry = snapshot.emotional.find(m => m.key === k)
      if (bEntry && eEntry) {
        lines.push(`- ${k.replace(/_/g, ' ')}: enacted as "${bEntry.value}" / felt as "${eEntry.value}"`)
      } else {
        lines.push(`- ${k.replace(/_/g, ' ')}`)
      }
    }
  }

  lines.push(`
CONTINUITY USE: When the current message connects to any theme above, name the connection naturally — "This is the same thing that came up before, from a different angle" or "You've been sitting with this for a while." Reference continuity when it genuinely deepens the current response. Not every message — roughly 1 in 4, when the thread is clearly present.`)

  return lines.join('\n')
}

// ─── Seed from Onboarding ────────────────────────────────────────────────────

export async function seedMemoriesFromOnboarding(
  userId: string,
  profile: {
    name?: string
    starSign?: string
    lifePathNumber?: number
    beliefSystem?: string
    focusArea: string
    personalityTrait: string
    currentState: string
    ageBand: string
  }
): Promise<void> {
  const memories: Omit<UserMemory, 'id' | 'created_at' | 'updated_at'>[] = []

  if (profile.name) {
    memories.push({ user_id: userId, memory_type: 'identity', key: 'first_name', value: profile.name, confidence: 1, source: 'onboarding' })
  }
  if (profile.starSign) {
    memories.push({ user_id: userId, memory_type: 'identity', key: 'star_sign', value: profile.starSign, confidence: 1, source: 'onboarding' })
  }
  if (profile.lifePathNumber) {
    memories.push({ user_id: userId, memory_type: 'identity', key: 'life_path_number', value: String(profile.lifePathNumber), confidence: 1, source: 'onboarding' })
  }
  if (profile.beliefSystem) {
    memories.push({ user_id: userId, memory_type: 'preference', key: 'belief_system', value: profile.beliefSystem, confidence: 1, source: 'onboarding' })
  }

  memories.push(
    { user_id: userId, memory_type: 'preference', key: 'focus_area', value: profile.focusArea, confidence: 1, source: 'onboarding' },
    { user_id: userId, memory_type: 'behavioral', key: 'personality_trait', value: profile.personalityTrait, confidence: 1, source: 'onboarding' },
    { user_id: userId, memory_type: 'emotional', key: 'current_state', value: profile.currentState, confidence: 1, source: 'onboarding' },
    { user_id: userId, memory_type: 'identity', key: 'age_band', value: profile.ageBand, confidence: 1, source: 'onboarding' },
  )

  await writeMemories(memories)
}
