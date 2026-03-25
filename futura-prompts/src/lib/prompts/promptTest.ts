/**
 * promptTest.ts
 *
 * Dev-only prompt testing harness.
 * Run with: npx ts-node src/lib/prompts/promptTest.ts
 *
 * Tests all 9 identity combinations (3 traits × 3 states) across
 * all 3 focus areas to verify reading quality before launch.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... npx ts-node --project tsconfig.json src/lib/prompts/promptTest.ts
 */

import OpenAI from 'openai'
import { normalizeProfile } from '../services/profileNormalizationService'
import { selectReadingBlocks } from '../services/readingBlockService'
import { composeReading } from '../services/readingCompositionService'
import {
  READING_POLISH_SYSTEM_PROMPT,
  LOCKED_POLISH_SYSTEM_PROMPT,
  buildPolishUserPrompt,
  buildLockedPolishUserPrompt,
} from './readingPrompt'
import {
  buildAdvisorSystemPrompt,
  buildAdvisorOpeningMessage,
} from './advisorPrompt'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Test matrix ──────────────────────────────────────────────────────────────

const TEST_CASES = [
  { trait: 'overthink_decisions', state: 'feeling_stuck',      focus: 'love' },
  { trait: 'overthink_decisions', state: 'turning_point',      focus: 'money' },
  { trait: 'overthink_decisions', state: 'okay_but_uncertain', focus: 'life_direction' },
  { trait: 'trust_people_easily', state: 'feeling_stuck',      focus: 'love' },
  { trait: 'trust_people_easily', state: 'turning_point',      focus: 'money' },
  { trait: 'trust_people_easily', state: 'okay_but_uncertain', focus: 'life_direction' },
  { trait: 'keep_things_to_myself', state: 'feeling_stuck',    focus: 'love' },
  { trait: 'keep_things_to_myself', state: 'turning_point',    focus: 'money' },
  { trait: 'keep_things_to_myself', state: 'okay_but_uncertain', focus: 'life_direction' },
] as const

// ─── Test runner ──────────────────────────────────────────────────────────────

async function testCase(
  trait: typeof TEST_CASES[number]['trait'],
  state: typeof TEST_CASES[number]['state'],
  focus: typeof TEST_CASES[number]['focus'],
  userId = 'test-user-abc123'
) {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`TRAIT: ${trait} | STATE: ${state} | FOCUS: ${focus}`)
  console.log('═'.repeat(60))

  const profile = normalizeProfile({
    focusArea: focus,
    currentState: state,
    personalityTrait: trait,
    ageBand: '25-34',
  })

  console.log('\n📋 IDENTITY SUMMARY:')
  console.log(profile.identitySummary)
  console.log(`\nPattern: ${profile.corePattern}`)
  console.log(`Future theme: ${profile.futureTheme}`)

  // Select + compose blocks
  const blocks = selectReadingBlocks(profile, focus, state, trait, userId)
  const composed = composeReading(blocks)

  console.log('\n📄 RAW BLOCKS:')
  console.log(composed.teaserRaw)
  console.log(`\n[CUT LINE]: ${composed.cutLine}`)
  console.log(`\n[LOCKED RAW]: ${composed.lockedRaw}`)

  // Polish (calls OpenAI)
  const [teaserPolished, lockedPolished] = await Promise.all([
    openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 600,
      temperature: 0.68,
      messages: [
        { role: 'system', content: READING_POLISH_SYSTEM_PROMPT },
        { role: 'user',   content: buildPolishUserPrompt({ teaserRaw: composed.teaserRaw, cutLine: composed.cutLine, lockedRaw: composed.lockedRaw, identitySummary: profile.identitySummary, focusArea: focus }) },
      ],
    }),
    openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 400,
      temperature: 0.7,
      messages: [
        { role: 'system', content: LOCKED_POLISH_SYSTEM_PROMPT },
        { role: 'user',   content: buildLockedPolishUserPrompt(composed.lockedRaw, profile.identitySummary, focus, profile.futureTheme) },
      ],
    }),
  ])

  console.log('\n✨ POLISHED TEASER:')
  console.log(teaserPolished.choices[0].message.content)
  console.log(`\n[CUT]: ${composed.cutLine}`)
  console.log('\n🔒 POLISHED LOCKED:')
  console.log(lockedPolished.choices[0].message.content)

  // Advisor opening
  const advisorCtx = {
    identitySummary:  profile.identitySummary,
    corePattern:      profile.corePattern,
    emotionalPattern: profile.emotionalPattern,
    decisionPattern:  profile.decisionPattern,
    futureTheme:      profile.futureTheme,
    focusArea:        focus,
    teaserText:       teaserPolished.choices[0].message.content ?? '',
    lockedText:       lockedPolished.choices[0].message.content ?? '',
    isUnlocked:       true,
    isSubscribed:     false,
  }

  console.log('\n💬 ADVISOR OPENING MESSAGE:')
  console.log(buildAdvisorOpeningMessage(advisorCtx))

  console.log('\n🔧 ADVISOR SYSTEM PROMPT (first 400 chars):')
  console.log(buildAdvisorSystemPrompt(advisorCtx).slice(0, 400) + '...')
}

async function runAll() {
  const singleTest = process.argv[2] ? parseInt(process.argv[2]) : null
  const cases = singleTest !== null ? [TEST_CASES[singleTest]] : TEST_CASES

  console.log(`\n🚀 Running ${cases.length} test case(s)...\n`)

  for (const tc of cases) {
    await testCase(tc.trait, tc.state, tc.focus)
    // Small delay between cases to avoid rate limiting
    await new Promise(r => setTimeout(r, 500))
  }

  console.log('\n\n✅ All tests complete.')
}

runAll().catch(console.error)
