import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import {
  clearWalletChallenge,
  createSession,
  readWalletChallenge,
} from '@/lib/profileAuth'
import { addInteraction, ensureUserFromIdentity } from '@/lib/profileStore'

export const runtime = 'nodejs'

type WalletVerifyBody = {
  address?: unknown
  message?: unknown
  signature?: unknown
}

function isAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export async function POST(request: NextRequest) {
  let body: WalletVerifyBody
  try {
    body = (await request.json()) as WalletVerifyBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 })
  }

  const address = String(body.address ?? '').trim()
  const message = String(body.message ?? '')
  const signature = String(body.signature ?? '')

  if (!isAddress(address)) {
    return NextResponse.json({ ok: false, error: 'Invalid wallet address.' }, { status: 400 })
  }
  if (!message || !signature) {
    return NextResponse.json({ ok: false, error: 'Missing signature payload.' }, { status: 400 })
  }

  let challenge
  try {
    challenge = readWalletChallenge(request)
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: toErrorMessage(
          error,
          'Wallet auth server is not configured. Set AUTH_SECRET.'
        ),
      },
      { status: 500 }
    )
  }
  if (!challenge) {
    return NextResponse.json({ ok: false, error: 'Challenge expired. Try again.' }, { status: 401 })
  }

  const normalized = address.toLowerCase()
  if (challenge.address !== normalized) {
    return NextResponse.json({ ok: false, error: 'Wallet mismatch.' }, { status: 401 })
  }

  const nonceLine = `Nonce: ${challenge.nonce}`
  if (!message.includes(nonceLine)) {
    return NextResponse.json({ ok: false, error: 'Invalid challenge nonce.' }, { status: 401 })
  }

  let recovered = ''
  try {
    recovered = ethers.utils.verifyMessage(message, signature).toLowerCase()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid signature.' }, { status: 401 })
  }

  if (recovered !== challenge.address) {
    return NextResponse.json({ ok: false, error: 'Signature does not match address.' }, { status: 401 })
  }

  let user
  try {
    user = ensureUserFromIdentity({
      provider: 'wallet',
      providerUid: recovered,
      identifier: recovered,
    })
    addInteraction(user.id, { type: 'auth_login', value: 1, metadata: { provider: 'wallet' } })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to attach wallet account.'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }

  try {
    const now = Date.now()
    const response = NextResponse.json({
      ok: true,
      authenticated: true,
      session: {
        provider: 'wallet',
        uid: recovered,
        identifier: recovered,
        at: now,
      },
      user,
    })
    clearWalletChallenge(response)
    createSession(response, {
      provider: 'wallet',
      uid: recovered,
      identifier: recovered,
      at: now,
    })
    return response
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: toErrorMessage(
          error,
          'Wallet auth server is not configured. Set AUTH_SECRET.'
        ),
      },
      { status: 500 }
    )
  }
}
