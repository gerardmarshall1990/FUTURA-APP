export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { analyzePalm } from '@/services/palmAnalysisService'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('palm') as File | null
    const userId = formData.get('userId') as string | null

    if (!file || !userId) {
      return NextResponse.json({ error: 'palm image and userId required' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // ── 1. Upload to Supabase Storage ──────────────────────────────────────────
    const ext = file.name.split('.').pop() ?? 'jpg'
    const storagePath = `palms/${userId}/palm_${Date.now()}.${ext}`
    const bytes = await file.arrayBuffer()

    const { error: uploadError } = await getAdminClient().storage
      .from('user-palms')
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('[palm/analyze] storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload palm image' }, { status: 500 })
    }

    // ── 2. Get public URL ──────────────────────────────────────────────────────
    const { data: urlData } = getAdminClient().storage
      .from('user-palms')
      .getPublicUrl(storagePath)

    const publicUrl = urlData.publicUrl

    // ── 3. Run vision analysis ─────────────────────────────────────────────────
    let features = null
    let quality: 'good' | 'okay' | 'bad' = 'good'
    let qualityFeedback = ''

    try {
      features = await analyzePalm(publicUrl)

      // Quality determined by line_clarity — bias toward accepting
      if (features.line_clarity === 'deep' || features.line_clarity === 'medium') {
        quality = 'good'
        qualityFeedback = ''
      } else {
        // faint or mixed — still fully usable for a reading
        quality = 'okay'
        qualityFeedback = 'Your lines are subtle — your reading will still be deeply personal'
      }
    } catch (analysisErr) {
      console.error('[palm/analyze] vision error:', analysisErr)
      // Model/service failure — not a reflection of image quality
      // Always return okay so the user isn't blocked by a transient error
      quality = 'okay'
      qualityFeedback = 'We have your palm — your reading will be built from what you shared'
    }

    // ── 4. Store features + URL in user_profiles ───────────────────────────────
    const { error: dbError } = await getAdminClient()
      .from('user_profiles')
      .upsert(
        {
          user_id: userId,
          palm_image_url: publicUrl,
          ...(features ? { palm_features_json: features } : {}),
        },
        { onConflict: 'user_id' }
      )

    if (dbError) {
      console.error('[palm/analyze] db error:', dbError)
      // Non-fatal — return result even if store fails
    }

    return NextResponse.json({ publicUrl, features, quality, feedback: qualityFeedback })
  } catch (err) {
    console.error('[palm/analyze]', err)
    return NextResponse.json({ error: 'Palm analysis failed' }, { status: 500 })
  }
}
