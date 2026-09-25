import { NextRequest, NextResponse } from 'next/server'
import { buildChronicleMetadata, getChronicle, getRitualWalletFunded } from '@/lib/chronicles'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }>
}

function getOrigin(request: NextRequest) {
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (forwardedHost) return `${forwardedProto || 'https'}://${forwardedHost}`
  return request.nextUrl.origin
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id: rawId } = await context.params
  const id = Number(rawId)
  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid Chronicle id.' }, { status: 400 })
  }

  const record = getChronicle(id)
  if (!record) {
    return NextResponse.json({ error: 'Chronicle not found.' }, { status: 404 })
  }

  const funded = await getRitualWalletFunded(record.wallet)
  const imageUrl = `${getOrigin(request)}/api/chronicles/${record.id}/image.svg`
  const metadata = buildChronicleMetadata(record, funded, imageUrl)

  return NextResponse.json(metadata, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
