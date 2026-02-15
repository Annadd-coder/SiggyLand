import { NextRequest, NextResponse } from 'next/server'
import { addInteraction, buildProfileSnapshot, updateUserProfile } from '@/lib/profileStore'
import { getAuthenticatedUser } from '@/lib/profileSession'

export const runtime = 'nodejs'

type ProfilePatchBody = {
  email?: unknown
  discord?: unknown
  twitter?: unknown
  wallet?: unknown
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidDiscord(handle: string) {
  const normalized = handle.replace(/^@+/, '')
  return !normalized || /^[a-zA-Z0-9._-]{2,32}$/.test(normalized)
}

function isValidTwitter(handle: string) {
  const normalized = handle.replace(/^@+/, '')
  return !normalized || /^[a-zA-Z0-9_]{1,15}$/.test(normalized)
}

function isValidWallet(wallet: string) {
  return !wallet || /^0x[a-fA-F0-9]{40}$/.test(wallet)
}

export async function GET(request: NextRequest) {
  const auth = getAuthenticatedUser(request)
  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const snapshot = buildProfileSnapshot(auth.user.id)
  return NextResponse.json({
    ok: true,
    user: snapshot.user,
    stats: snapshot.stats,
    quests: snapshot.quests,
    recent: snapshot.recent,
    session: auth.session,
  })
}

export async function PATCH(request: NextRequest) {
  const auth = getAuthenticatedUser(request)
  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: ProfilePatchBody
  try {
    body = (await request.json()) as ProfilePatchBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 })
  }

  const email = String(body.email ?? '').trim().toLowerCase()
  const discord = String(body.discord ?? '').trim()
  const twitter = String(body.twitter ?? '').trim()
  const wallet = String(body.wallet ?? '').trim()

  if (email && !isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: 'Invalid email format.' }, { status: 400 })
  }
  if (!isValidDiscord(discord)) {
    return NextResponse.json({ ok: false, error: 'Invalid Discord handle.' }, { status: 400 })
  }
  if (!isValidTwitter(twitter)) {
    return NextResponse.json({ ok: false, error: 'Invalid Twitter handle.' }, { status: 400 })
  }
  if (!isValidWallet(wallet)) {
    return NextResponse.json({ ok: false, error: 'Invalid wallet address.' }, { status: 400 })
  }

  try {
    const user = updateUserProfile(auth.user.id, {
      email,
      discord,
      twitter,
      wallet,
    })
    addInteraction(auth.user.id, { type: 'profile_update', value: 1 })

    const snapshot = buildProfileSnapshot(auth.user.id)
    return NextResponse.json({ ok: true, user, stats: snapshot.stats, quests: snapshot.quests, recent: snapshot.recent })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Profile update failed.'
    if (message.toLowerCase().includes('unique')) {
      return NextResponse.json({ ok: false, error: 'This contact is already linked to another profile.' }, { status: 409 })
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
