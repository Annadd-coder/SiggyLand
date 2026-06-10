import { NextRequest, NextResponse } from 'next/server'
import { buildChronicleImage, getChronicle, getRitualWalletFunded } from '@/lib/chronicles'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id: rawId } = await context.params
  const id = Number(rawId)
  if (!Number.isSafeInteger(id) || id <= 0) {
    return new NextResponse('Invalid Chronicle id.', { status: 400 })
  }

  const record = getChronicle(id)
  if (!record) {
    return new NextResponse('Chronicle not found.', { status: 404 })
  }

  const funded = await getRitualWalletFunded(record.wallet)
  const svg = buildChronicleImage(record, funded)

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
