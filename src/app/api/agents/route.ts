import { NextResponse } from 'next/server'
import { listAgentBlueprints } from '@/lib/agentFoundry'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({ ok: true, agents: listAgentBlueprints() })
}
