import { NextResponse } from 'next/server'
import { createWalletChallenge, randomToken } from '@/lib/profileAuth'

export const runtime = 'nodejs'

type WalletChallengeBody = {
  address?: unknown
}

function isAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export async function POST(request: Request) {
  let body: WalletChallengeBody
  try {
    body = (await request.json()) as WalletChallengeBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 })
  }

  const address = String(body.address ?? '').trim()
  if (!isAddress(address)) {
    return NextResponse.json({ ok: false, error: 'Invalid wallet address.' }, { status: 400 })
  }

  const nonce = randomToken(12)
  const message = [
    'Sign in to Siggy Profile',
    `Address: ${address}`,
    `Nonce: ${nonce}`,
  ].join('\n')

  const response = NextResponse.json({
    ok: true,
    message,
    nonce,
    address,
  })
  try {
    createWalletChallenge(response, address, nonce)
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
  return response
}
