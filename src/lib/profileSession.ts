import { NextRequest } from 'next/server'
import { readSession } from '@/lib/profileAuth'
import { getUserByIdentity } from '@/lib/profileStore'

export function getAuthenticatedUser(request: NextRequest) {
  const session = readSession(request)
  if (!session) return null
  if (typeof session.uid !== 'string' || !session.uid.trim()) return null

  const user = getUserByIdentity(session.uid)
  if (!user) return null

  return { session, user }
}
