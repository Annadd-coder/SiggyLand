import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { getDb } from '@/lib/db'

type AgentRunRequest = {
  wallet?: string
  agentName?: string
  blueprintId?: string
  skillPackId?: string
  task?: string
  output?: string
  signature?: string
}

function signingMessage(input: {
  wallet: string
  agentName: string
  blueprintId: string
  skillPackId: string
  outputHash: string
}) {
  return [
    'Siggy Agent run record',
    JSON.stringify({
      wallet: input.wallet.trim().toLowerCase(),
      agentName: input.agentName,
      blueprintId: input.blueprintId,
      skillPackId: input.skillPackId,
      outputHash: input.outputHash,
    }),
  ].join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AgentRunRequest
    const wallet = body.wallet?.trim().toLowerCase() || ''
    const agentName = body.agentName?.trim() || ''
    const blueprintId = body.blueprintId?.trim() || ''
    const skillPackId = body.skillPackId?.trim() || ''
    const task = body.task?.trim() || ''
    const output = body.output?.trim() || ''
    const signature = body.signature?.trim() || ''

    if (!ethers.utils.isAddress(wallet)) {
      return NextResponse.json({ ok: false, error: 'Invalid wallet address.' }, { status: 400 })
    }

    if (agentName.length < 3 || agentName.length > 96) {
      return NextResponse.json({ ok: false, error: 'Invalid agent name.' }, { status: 400 })
    }

    if (blueprintId.length < 3 || blueprintId.length > 64 || skillPackId.length < 3 || skillPackId.length > 64) {
      return NextResponse.json({ ok: false, error: 'Invalid agent configuration.' }, { status: 400 })
    }

    if (task.length < 3 || task.length > 12000 || output.length < 3 || output.length > 24000) {
      return NextResponse.json({ ok: false, error: 'Invalid run content.' }, { status: 400 })
    }

    const outputHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`${task}\n\n${output}`))
    const recovered = ethers.utils.verifyMessage(
      signingMessage({ wallet, agentName, blueprintId, skillPackId, outputHash }),
      signature
    )

    if (recovered.toLowerCase() !== wallet) {
      return NextResponse.json({ ok: false, error: 'Signature does not match wallet.' }, { status: 401 })
    }

    const result = getDb()
      .prepare(
        `INSERT INTO agent_runs (
          wallet_address,
          agent_name,
          blueprint_id,
          skill_pack_id,
          task,
          output,
          output_hash,
          signature,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(output_hash) DO UPDATE SET
          wallet_address = excluded.wallet_address,
          signature = excluded.signature
        RETURNING id`
      )
      .get(wallet, agentName, blueprintId, skillPackId, task, output, outputHash, signature, Date.now()) as
      | { id?: number | bigint }
      | undefined

    const id = Number(result?.id || 0)
    if (!id) throw new Error('Could not store agent run.')

    return NextResponse.json({
      ok: true,
      outputHash,
      outputUri: `${request.nextUrl.origin}/api/agent-runs/${id}`,
      run: { id, agentName, blueprintId, skillPackId },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create agent run.'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
