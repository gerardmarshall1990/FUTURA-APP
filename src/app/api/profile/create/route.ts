import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { normalizeProfile } from '@/services/profileNormalizationService'
import { seedMemoryFromOnboarding } from '@/services/stripeService'
import { seedMemoriesFromOnboarding } from '@/services/memoryService'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId, focusArea, currentState, personalityTrait, ageBand, palmImageUrl,
      name, dobDay, dobMonth, dobYear, starSign, lifePathNumber, beliefSystem,
    } = body

    if (!userId || !focusArea || !currentState || !personalityTrait || !ageBand) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const normalized = normalizeProfile({ focusArea, currentState, personalityTrait, ageBand })

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .upsert(
        {
          user_id: userId,
          focus_area: focusArea,
          current_state: currentState,
          personality_trait: personalityTrait,
          age_band: ageBand,
          palm_image_url: palmImageUrl ?? null,
          core_pattern: normalized.corePattern,
          emotional_pattern: normalized.emotionalPattern,
          decision_pattern: normalized.decisionPattern,
          future_theme: normalized.futureTheme,
          identity_summary: normalized.identitySummary,
          first_name: name ?? null,
          dob_day: dobDay ?? null,
          dob_month: dobMonth ?? null,
          dob_year: dobYear ?? null,
          star_sign: starSign ?? null,
          life_path_number: lifePathNumber ?? null,
          belief_system: beliefSystem ?? null,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (error) throw error

    await Promise.all([
      seedMemoryFromOnboarding(userId, focusArea, personalityTrait, currentState),
      seedMemoriesFromOnboarding(userId, {
        name: name ?? undefined,
        starSign: starSign ?? undefined,
        lifePathNumber: lifePathNumber ?? undefined,
        beliefSystem: beliefSystem ?? undefined,
        focusArea,
        personalityTrait,
        currentState,
        ageBand,
      }),
    ])

    return NextResponse.json({ profile })
  } catch (err) {
    console.error('[profile/create]', err)
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
  }
}
