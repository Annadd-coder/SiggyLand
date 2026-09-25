import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { getDb } from '@/lib/db'

type ManifestRequest = {
  wallet?: string
  name?: string
  blueprintId?: string
  skillPackId?: string
  manifest?: string
  signature?: string
}

function signingMessage(input: {
  wallet: string
  name: string
  blueprintId: string
  skillPackId: string
  manifestHash: string
}) {
  return [
    'Siggy Agent manifest request',
    JSON.stringify({
      wallet: input.wallet.trim().toLowerCase(),
      name: input.name,
      blueprintId: input.blueprintId,
      skillPackId: input.skillPackId,
      manifestHash: input.manifestHash,
    }),
  ].join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ManifestRequest
    const wallet = body.wallet?.trim().toLowerCase() || ''
    const name = body.name?.trim() || ''
    const blueprintId = body.blueprintId?.trim() || ''
    const skillPackId = body.skillPackId?.trim() || ''
    const manifest = body.manifest?.trim() || ''
    const signature = body.signature?.trim() || ''

    if (!ethers.utils.isAddress(wallet)) {
      return NextResponse.json({ ok: false, error: 'Invalid wallet address.' }, { status: 400 })
    }

    if (name.length < 3 || name.length > 96) {
      return NextResponse.json({ ok: false, error: 'Invalid agent name.' }, { status: 400 })
    }

    if (blueprintId.length < 3 || blueprintId.length > 64 || skillPackId.length < 3 || skillPackId.length > 64) {
      return NextResponse.json({ ok: false, error: 'Invalid blueprint or skill pack.' }, { status: 400 })
    }

    if (manifest.length < 32 || manifest.length > 24000) {
      return NextResponse.json({ ok: false, error: 'Invalid manifest length.' }, { status: 400 })
    }

    if (!signature) {
      return NextResponse.json({ ok: false, error: 'Missing wallet signature.' }, { status: 400 })
    }

    const manifestHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(manifest))
    const recovered = ethers.utils.verifyMessage(
      signingMessage({ wallet, name, blueprintId, skillPackId, manifestHash }),
      signature
    )

    if (recovered.toLowerCase() !== wallet) {
      return NextResponse.json({ ok: false, error: 'Signature does not match wallet.' }, { status: 401 })
    }

    const now = Date.now()
    const result = getDb()
      .prepare(
        `INSERT INTO agent_manifests (
          wallet_address,
          name,
          blueprint_id,
          skill_pack_id,
          manifest,
          manifest_hash,
          signature,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(manifest_hash) DO UPDATE SET
          wallet_address = excluded.wallet_address,
          name = excluded.name,
          blueprint_id = excluded.blueprint_id,
          skill_pack_id = excluded.skill_pack_id,
          signature = excluded.signature
        RETURNING id`
      )
      .get(wallet, name, blueprintId, skillPackId, manifest, manifestHash, signature, now) as
      | { id?: number | bigint }
      | undefined

    const id = Number(result?.id || 0)
    if (!id) throw new Error('Could not store manifest.')

    return NextResponse.json({
      ok: true,
      manifestHash,
      manifestUri: `${request.nextUrl.origin}/api/agent-manifests/${id}`,
      manifest: { id, name, blueprintId, skillPackId },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create agent manifest.'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
