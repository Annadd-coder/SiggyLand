import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

type RouteParams = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const manifestId = Number(id)

  if (!Number.isInteger(manifestId) || manifestId <= 0) {
    return NextResponse.json({ ok: false, error: 'Invalid manifest id.' }, { status: 400 })
  }

  const row = getDb()
    .prepare(
      `SELECT id, wallet_address, name, blueprint_id, skill_pack_id, manifest, manifest_hash, signature, created_at
       FROM agent_manifests
       WHERE id = ?`
    )
    .get(manifestId) as
    | {
        id: number
        wallet_address: string
        name: string
        blueprint_id: string
        skill_pack_id: string
        manifest: string
        manifest_hash: string
        signature: string
        created_at: number
      }
    | undefined

  if (!row) {
    return NextResponse.json({ ok: false, error: 'Manifest not found.' }, { status: 404 })
  }

  return NextResponse.json({
    name: row.name,
    owner: row.wallet_address,
    blueprintId: row.blueprint_id,
    skillPackId: row.skill_pack_id,
    manifestHash: row.manifest_hash,
    signature: row.signature,
    createdAt: new Date(row.created_at).toISOString(),
    manifest: row.manifest,
  })
}
