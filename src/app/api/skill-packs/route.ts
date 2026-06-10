import { NextResponse } from 'next/server'
import { SKILL_PACKS } from '@/lib/skillPacks'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({ ok: true, skillPacks: SKILL_PACKS })
}
