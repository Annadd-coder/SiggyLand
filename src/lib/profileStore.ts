import { getDb } from '@/lib/db'
import { computeQuestProgress } from '@/lib/profileQuests'
import type { AuthProvider } from '@/lib/profileAuth'

export type ProfileUser = {
  id: number
  email: string
  discord: string
  twitter: string
  wallet: string
  createdAt: number
  updatedAt: number
}

type AuthIdentityRow = {
  id: number
  user_id: number
  provider: string
  provider_uid: string
  identifier: string
}

type UserRow = {
  id: number
  email: string | null
  discord_username: string | null
  twitter_username: string | null
  wallet_address: string | null
  created_at: number
  updated_at: number
}

type EventRow = {
  id: number
  type: string
  value: number
  metadata: string | null
  created_at: number
}

export type InteractionPayload = {
  type: string
  value?: number
  metadata?: Record<string, unknown> | null
}

function nowMs() {
  return Date.now()
}

function normWallet(wallet: string) {
  return wallet.trim().toLowerCase()
}

function normHandle(handle: string) {
  const cleaned = handle.trim().replace(/^@+/, '')
  return cleaned ? `@${cleaned}` : ''
}

function toProfileUser(row: UserRow): ProfileUser {
  return {
    id: Number(row.id),
    email: row.email || '',
    discord: row.discord_username || '',
    twitter: row.twitter_username || '',
    wallet: row.wallet_address || '',
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

function getUserById(userId: number): UserRow | null {
  const db = getDb()
  const row = db.prepare(`
    SELECT id, email, discord_username, twitter_username, wallet_address, created_at, updated_at
    FROM users
    WHERE id = ?
  `).get(userId) as UserRow | undefined
  return row ?? null
}

function findIdentity(providerUid: string): AuthIdentityRow | null {
  const db = getDb()
  const row = db.prepare(`
    SELECT id, user_id, provider, provider_uid, identifier
    FROM auth_identities
    WHERE provider = ? AND provider_uid = ?
  `).get('wallet', providerUid) as AuthIdentityRow | undefined
  return row ?? null
}

function findUserByWallet(identifier: string): UserRow | null {
  const db = getDb()
  const row = db.prepare(`
    SELECT id, email, discord_username, twitter_username, wallet_address, created_at, updated_at
    FROM users
    WHERE wallet_address = ?
  `).get(normWallet(identifier)) as UserRow | undefined
  return row ?? null
}

function createUser(identifier: string): UserRow {
  const db = getDb()
  const now = nowMs()

  const runResult = db.prepare(`
    INSERT INTO users (email, discord_username, twitter_username, wallet_address, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(null, null, null, normWallet(identifier), now, now)

  const idRaw = runResult.lastInsertRowid
  const id = typeof idRaw === 'bigint' ? Number(idRaw) : Number(idRaw || 0)
  const created = getUserById(id)
  if (!created) throw new Error('Failed to create user.')
  return created
}

function updateUserWalletFromProvider(userId: number, identifier: string) {
  const db = getDb()
  const now = nowMs()

  db.prepare(`UPDATE users SET wallet_address = ?, updated_at = ? WHERE id = ?`)
    .run(normWallet(identifier), now, userId)
}

export function ensureUserFromIdentity(input: {
  provider: AuthProvider
  providerUid: string
  identifier: string
}) {
  const db = getDb()
  const providerUid = input.providerUid.trim()
  const identifier = input.identifier.trim()
  const now = nowMs()
  if (!providerUid || !identifier) throw new Error('Invalid identity payload.')

  const existingIdentity = findIdentity(providerUid)
  if (existingIdentity) {
    db.prepare(`
      UPDATE auth_identities
      SET identifier = ?, updated_at = ?
      WHERE id = ?
    `).run(identifier, now, existingIdentity.id)
    updateUserWalletFromProvider(existingIdentity.user_id, identifier)
    const user = getUserById(existingIdentity.user_id)
    if (!user) throw new Error('User not found for identity.')
    return toProfileUser(user)
  }

  const candidate = findUserByWallet(identifier)
  const user = candidate ?? createUser(identifier)

  db.prepare(`
    INSERT INTO auth_identities (user_id, provider, provider_uid, identifier, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(user.id, 'wallet', providerUid, identifier, now, now)

  updateUserWalletFromProvider(user.id, identifier)
  const fresh = getUserById(user.id)
  if (!fresh) throw new Error('Failed to reload user.')
  return toProfileUser(fresh)
}

export function getUserByIdentity(providerUid: string) {
  const identity = findIdentity(providerUid.trim())
  if (!identity) return null
  const user = getUserById(identity.user_id)
  return user ? toProfileUser(user) : null
}

export function updateUserProfile(userId: number, patch: Partial<ProfileUser>) {
  const db = getDb()
  const current = getUserById(userId)
  if (!current) throw new Error('User not found.')

  const nextEmail = patch.email !== undefined ? patch.email.trim().toLowerCase() : current.email || ''
  const nextDiscord = patch.discord !== undefined ? normHandle(patch.discord || '') : current.discord_username || ''
  const nextTwitter = patch.twitter !== undefined ? normHandle(patch.twitter || '') : current.twitter_username || ''
  const nextWallet = patch.wallet !== undefined ? normWallet(patch.wallet || '') : current.wallet_address || ''
  const now = nowMs()

  db.prepare(`
    UPDATE users
    SET email = ?, discord_username = ?, twitter_username = ?, wallet_address = ?, updated_at = ?
    WHERE id = ?
  `).run(
    nextEmail || null,
    nextDiscord || null,
    nextTwitter || null,
    nextWallet || null,
    now,
    userId
  )

  // Keep wallet identity in sync with profile wallet field.
  if (nextWallet) {
    db.prepare(`
      INSERT INTO auth_identities (user_id, provider, provider_uid, identifier, created_at, updated_at)
      VALUES (?, 'wallet', ?, ?, ?, ?)
      ON CONFLICT(provider, provider_uid)
      DO UPDATE SET identifier = excluded.identifier, updated_at = excluded.updated_at
    `).run(userId, nextWallet, nextWallet, now, now)
  }

  const updated = getUserById(userId)
  if (!updated) throw new Error('User update failed.')
  return toProfileUser(updated)
}

export function addInteraction(userId: number, payload: InteractionPayload) {
  const db = getDb()
  const type = String(payload.type || '').trim()
  if (!type) throw new Error('Interaction type is required.')
  const value = Math.max(1, Math.floor(Number(payload.value || 1)))
  const metadata = payload.metadata ? JSON.stringify(payload.metadata) : null
  const now = nowMs()
  db.prepare(`
    INSERT INTO interaction_events (user_id, type, value, metadata, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, type, value, metadata, now)
}

export function listRecentInteractions(userId: number, limit = 20) {
  const db = getDb()
  const capped = Math.max(1, Math.min(200, Math.floor(limit)))
  const rows = db.prepare(`
    SELECT id, type, value, metadata, created_at
    FROM interaction_events
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(userId, capped) as EventRow[]

  return rows.map((row) => ({
    id: Number(row.id),
    type: row.type,
    value: Number(row.value || 0),
    metadata: row.metadata ? parseJsonSafe(row.metadata) : null,
    ts: Number(row.created_at),
  }))
}

export function getInteractionTotals(userId: number) {
  const db = getDb()
  const rows = db.prepare(`
    SELECT type, SUM(value) AS total
    FROM interaction_events
    WHERE user_id = ?
    GROUP BY type
  `).all(userId) as Array<{ type: string; total: number }>

  const totals: Record<string, number> = {}
  for (const row of rows) {
    totals[row.type] = Number(row.total || 0)
  }
  return totals
}

export function getMarketResultStats(userId: number) {
  const db = getDb()
  const rows = db.prepare(`
    SELECT type, metadata
    FROM interaction_events
    WHERE user_id = ? AND type IN ('market_trade', 'market_resolve')
    ORDER BY created_at ASC
  `).all(userId) as Array<{ type: string; metadata: string | null }>

  const exposureByMarket = new Map<string, { yes: number; no: number }>()
  const resolvedByMarket = new Map<string, 'YES' | 'NO'>()
  const tradedMarkets = new Set<string>()
  let totalShares = 0
  let totalNotional = 0

  for (const row of rows) {
    if (!row.metadata) continue
    const meta = parseJsonSafe(row.metadata)
    if (!meta || typeof meta !== 'object') continue
    const marketId = String((meta as Record<string, unknown>).marketId || '').trim()
    if (!marketId) continue

    if (row.type === 'market_trade') {
      const side = String((meta as Record<string, unknown>).side || '')
      const outcome = String((meta as Record<string, unknown>).outcome || '')
      const shares = Number((meta as Record<string, unknown>).shares || 0)
      const notional = Number((meta as Record<string, unknown>).notional || 0)
      if ((side !== 'BUY' && side !== 'SELL') || (outcome !== 'YES' && outcome !== 'NO')) continue
      if (!Number.isFinite(shares) || shares <= 0) continue

      const prev = exposureByMarket.get(marketId) || { yes: 0, no: 0 }
      const delta = side === 'BUY' ? shares : -shares
      if (outcome === 'YES') prev.yes += delta
      else prev.no += delta
      exposureByMarket.set(marketId, prev)
      tradedMarkets.add(marketId)
      totalShares += Math.abs(shares)
      if (Number.isFinite(notional) && notional > 0) totalNotional += Math.abs(notional)
      continue
    }

    const resolved = String((meta as Record<string, unknown>).outcome || '')
    if (resolved === 'YES' || resolved === 'NO') {
      resolvedByMarket.set(marketId, resolved)
    }
  }

  let wins = 0
  let losses = 0
  let resolvedWithExposure = 0
  for (const [marketId, outcome] of resolvedByMarket.entries()) {
    const exposure = exposureByMarket.get(marketId)
    if (!exposure) continue
    const net = outcome === 'YES' ? exposure.yes - exposure.no : exposure.no - exposure.yes
    if (Math.abs(net) < 1e-9) continue
    resolvedWithExposure += 1
    if (net > 0) wins += 1
    else losses += 1
  }

  return {
    marketsPlayed: tradedMarkets.size,
    totalShares,
    totalNotional,
    wins,
    losses,
    resolvedWithExposure,
    winRate: resolvedWithExposure > 0 ? (wins / resolvedWithExposure) * 100 : 0,
  }
}

export function buildProfileSnapshot(userId: number) {
  const user = getUserById(userId)
  if (!user) throw new Error('User not found.')

  const totals = getInteractionTotals(userId)
  const quests = computeQuestProgress(totals)
  const marketWin = getMarketResultStats(userId)
  const {
    marketsPlayed,
    totalShares,
    totalNotional,
    wins,
    losses,
    resolvedWithExposure,
    winRate,
  } = marketWin
  const recent = listRecentInteractions(userId, 20)

  return {
    user: toProfileUser(user),
    stats: {
      chat: {
        prompts: totals.ask_prompt || 0,
        replies: totals.ask_reply || 0,
        totalMessages: (totals.ask_prompt || 0) + (totals.ask_reply || 0),
      },
      market: {
        trades: totals.market_trade || 0,
        creates: totals.market_create || 0,
        resolves: totals.market_resolve || 0,
        redeems: totals.market_redeem || 0,
        marketsPlayed,
        totalShares,
        totalNotional,
        wins,
        losses,
        resolvedWithExposure,
        winRate,
      },
    },
    quests,
    recent,
  }
}

function parseJsonSafe(raw: string) {
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}
