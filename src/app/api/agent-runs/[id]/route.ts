import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

type RouteParams = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const runId = Number(id)

  if (!Number.isInteger(runId) || runId <= 0) {
    return NextResponse.json({ ok: false, error: 'Invalid run id.' }, { status: 400 })
  }

  const row = getDb()
    .prepare(
      `SELECT id, wallet_address, agent_name, blueprint_id, skill_pack_id, task, output, output_hash, signature, created_at
       FROM agent_runs
       WHERE id = ?`
    )
    .get(runId) as
    | {
        id: number
        wallet_address: string
        agent_name: string
        blueprint_id: string
        skill_pack_id: string
        task: string
        output: string
        output_hash: string
        signature: string
        created_at: number
      }
    | undefined

  if (!row) {
    return NextResponse.json({ ok: false, error: 'Run not found.' }, { status: 404 })
  }

  return NextResponse.json({
    agentName: row.agent_name,
    owner: row.wallet_address,
    blueprintId: row.blueprint_id,
    skillPackId: row.skill_pack_id,
    task: row.task,
    output: row.output,
    outputHash: row.output_hash,
    signature: row.signature,
    createdAt: new Date(row.created_at).toISOString(),
  })
}
