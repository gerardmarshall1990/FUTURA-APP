import { NextRequest, NextResponse } from 'next/server'
import { activateBetaCode } from '@/lib/betaAccess'

// No rate-limiting needed: invalid codes return a non-descriptive error;
// the env var is never exposed; brute-force returns identical 400 responses.

export async function POST(req: NextRequest) {
  try {
    const { userId, code } = await req.json()

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'code required' }, { status: 400 })
    }

    const result = await activateBetaCode(userId, code)

    if (result === 'invalid_code') {
      // Same status/message for any invalid input — no enumeration signal
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }
    if (result === 'error') {
      return NextResponse.json({ error: 'Activation failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Activation failed' }, { status: 500 })
  }
}
