import { NextRequest, NextResponse } from 'next/server'
import { addInteraction } from '@/lib/profileStore'
import { getAuthenticatedUser } from '@/lib/profileSession'

export const runtime = 'nodejs'

type TrackBody = {
  type?: unknown
  value?: unknown
  metadata?: unknown
}

function isValidType(type: string) {
  return /^[a-z][a-z0-9_]{1,63}$/.test(type)
}

export async function POST(request: NextRequest) {
  const auth = getAuthenticatedUser(request)
  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: TrackBody
  try {
    body = (await request.json()) as TrackBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 })
  }

  const type = String(body.type ?? '').trim()
  if (!isValidType(type)) {
    return NextResponse.json({ ok: false, error: 'Invalid interaction type.' }, { status: 400 })
  }

  const numericValue = Number(body.value ?? 1)
  const value = Number.isFinite(numericValue) ? Math.max(1, Math.floor(numericValue)) : 1
  const metadata = typeof body.metadata === 'object' && body.metadata !== null
    ? (body.metadata as Record<string, unknown>)
    : null

  addInteraction(auth.user.id, { type, value, metadata })
  return NextResponse.json({ ok: true }, { status: 200 })
}
