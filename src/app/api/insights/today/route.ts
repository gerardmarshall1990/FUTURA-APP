import { NextRequest, NextResponse } from 'next/server'
import { generateAndStoreInsight, getTodaysInsight } from '@/services/insightService'

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Try to get existing, or generate new
    let insight = await getTodaysInsight(userId)
    if (!insight) {
      insight = await generateAndStoreInsight(userId)
    }

    return NextResponse.json({ insight })
  } catch (err) {
    console.error('[insights/today]', err)
    return NextResponse.json({ error: 'Failed to get insight' }, { status: 500 })
  }
}
