import { NextRequest, NextResponse } from 'next/server'
import { markChronicleMinted } from '@/lib/chronicles'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }>
}

type MintedBody = {
  txHash?: unknown
  tokenId?: unknown
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: rawId } = await context.params
  const id = Number(rawId)
  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: 'Invalid Chronicle id.' }, { status: 400 })
  }

  let body: MintedBody
  try {
    body = (await request.json()) as MintedBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 })
  }

  try {
    const chronicle = markChronicleMinted({
      id,
      txHash: String(body.txHash ?? ''),
      tokenId: body.tokenId === undefined ? undefined : String(body.tokenId),
    })

    return NextResponse.json({ ok: true, chronicle })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark Chronicle minted.'
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}
