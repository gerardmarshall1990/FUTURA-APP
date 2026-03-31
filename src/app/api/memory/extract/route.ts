import { NextRequest, NextResponse } from 'next/server'
import { extractMemoryThemes } from '@/services/aiService'
import { writeMemory, getMemories } from '@/services/memoryService'

export async function POST(req: NextRequest) {
  try {
    const { userId, chatHistory, identitySummary } = await req.json()

    if (!userId || !chatHistory || !identitySummary) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const existingMemories = await getMemories(userId, 'behavioral')
    const existingKeys = existingMemories.map(m => m.key)

    const themes = await extractMemoryThemes(chatHistory, identitySummary, existingKeys)

    if (themes.length > 0) {
      await Promise.all(
        themes.map(t =>
          writeMemory({
            user_id: userId,
            memory_type: 'behavioral',
            key: t.key_theme,
            value: t.description,
            confidence: 0.7,
            source: 'chat',
          })
        )
      )
    }

    return NextResponse.json({ extracted: themes.length, themes })
  } catch (err) {
    console.error('[memory/extract]', err)
    return NextResponse.json({ error: 'Failed to extract memories' }, { status: 500 })
  }
}
