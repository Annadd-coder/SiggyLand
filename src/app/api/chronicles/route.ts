import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { createChronicle } from '@/lib/chronicles'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ChronicleBody = {
  wallet?: unknown
  title?: unknown
  idea?: unknown
  recipe?: unknown
  primitives?: unknown
  primitiveMask?: unknown
  signature?: unknown
}

function buildSigningMessage(body: ChronicleBody) {
  return [
    'Siggy Chronicle metadata request',
    JSON.stringify({
      wallet: String(body.wallet ?? '').trim().toLowerCase(),
      title: String(body.title ?? ''),
      idea: String(body.idea ?? ''),
      recipe: String(body.recipe ?? ''),
      primitives: Array.isArray(body.primitives) ? body.primitives.map(String) : [],
      primitiveMask: Number(body.primitiveMask ?? 0),
    }),
  ].join('\n')
}

function getOrigin(request: NextRequest) {
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (forwardedHost) return `${forwardedProto || 'https'}://${forwardedHost}`
  return request.nextUrl.origin
}

export async function POST(request: NextRequest) {
  let body: ChronicleBody
  try {
    body = (await request.json()) as ChronicleBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 })
  }

  try {
    const wallet = String(body.wallet ?? '').trim()
    const signature = String(body.signature ?? '').trim()
    if (!signature) {
      return NextResponse.json({ ok: false, error: 'Missing wallet signature.' }, { status: 400 })
    }

    const recovered = ethers.utils.verifyMessage(buildSigningMessage(body), signature)
    if (recovered.toLowerCase() !== wallet.toLowerCase()) {
      return NextResponse.json({ ok: false, error: 'Signature does not match wallet.' }, { status: 401 })
    }

    const record = await createChronicle({
      wallet,
      title: String(body.title ?? ''),
      idea: String(body.idea ?? ''),
      recipe: String(body.recipe ?? ''),
      primitives: Array.isArray(body.primitives) ? body.primitives.map(String) : [],
      primitiveMask: Number(body.primitiveMask ?? 0),
    })

    const origin = getOrigin(request)
    const metadataUri = `${origin}/api/chronicles/${record.id}/metadata`

    return NextResponse.json({
      ok: true,
      chronicle: record,
      metadataUri,
      contentHash: record.contentHash,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create Chronicle.'
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}
