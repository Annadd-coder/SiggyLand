import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/profileSession'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = getAuthenticatedUser(request)
  if (!auth) {
    return NextResponse.json({ ok: true, authenticated: false, session: null }, { status: 200 })
  }

  return NextResponse.json(
    {
      ok: true,
      authenticated: true,
      session: {
        provider: auth.session.provider,
        uid: auth.session.uid,
        identifier: auth.session.identifier,
        at: auth.session.at,
      },
      user: auth.user,
    },
    { status: 200 }
  )
}
