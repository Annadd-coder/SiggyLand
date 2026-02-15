import { NextResponse } from 'next/server'
import { clearAllAuth } from '@/lib/profileAuth'

export const runtime = 'nodejs'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  clearAllAuth(response)
  return response
}
