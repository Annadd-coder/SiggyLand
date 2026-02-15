'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ethers } from 'ethers'
import { getChainId, hasEthereum, requestAccounts } from '@/lib/eth'
import { trackInteraction } from '@/lib/trackInteraction'
import type { AuthSession } from '@/lib/profileAuth'
import styles from './profile.page.module.css'

type ProfileUser = {
  id: number
  email: string
  discord: string
  twitter: string
  wallet: string
  createdAt: number
  updatedAt: number
}

type ProfileStats = {
  chat: {
    prompts: number
    replies: number
    totalMessages: number
  }
  market: {
    trades: number
    creates: number
    resolves: number
    redeems: number
    marketsPlayed: number
    totalShares: number
    totalNotional: number
    wins: number
    losses: number
    resolvedWithExposure: number
    winRate: number
  }
}

type QuestItem = {
  code: string
  title: string
  description: string
  target: number
  rewardPoints: number
  eventType: string
  progress: number
  completed: boolean
}

type QuestSnapshot = {
  totalPoints: number
  completedCount: number
  quests: QuestItem[]
}

type RecentInteraction = {
  id: number
  type: string
  value: number
  metadata: Record<string, unknown> | null
  ts: number
}

type ProfileApiResponse = {
  ok?: boolean
  user?: ProfileUser
  stats?: ProfileStats
  quests?: QuestSnapshot
  recent?: RecentInteraction[]
  error?: string
}

type SessionApiResponse = {
  ok?: boolean
  authenticated?: boolean
  session?: AuthSession
}

type WalletChallengeResponse = {
  ok?: boolean
  message?: string
  error?: string
}

type WalletVerifyResponse = {
  ok?: boolean
  authenticated?: boolean
  session?: AuthSession
  error?: string
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error.trim()) return error
  return fallback
}

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

async function readJsonSafe<T>(response: Response): Promise<T | null> {
  const text = await response.text().catch(() => '')
  return parseJson<T>(text)
}

async function readJsonWithText<T>(response: Response): Promise<{ json: T | null; text: string }> {
  const text = await response.text().catch(() => '')
  return { json: parseJson<T>(text), text }
}

function apiErrorFromResponse<T extends { error?: string }>(
  payload: { json: T | null; text: string },
  fallback: string,
  status: number
) {
  const jsonError = payload.json?.error
  if (typeof jsonError === 'string' && jsonError.trim()) return jsonError
  const raw = payload.text.trim()
  if (!raw) return `${fallback} (HTTP ${status})`
  if (raw.length <= 220) return raw
  return `${raw.slice(0, 220)}...`
}

function fmtDate(ts: number) {
  if (!Number.isFinite(ts) || ts <= 0) return 'Never'
  return new Date(ts).toLocaleString()
}

function shortAddress(addr: string) {
  if (!addr) return 'Not connected'
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function asAuthSession(raw: unknown): AuthSession | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Partial<AuthSession>
  if (value.provider !== 'wallet') return null
  if (typeof value.uid !== 'string' || !value.uid.trim()) return null
  if (typeof value.identifier !== 'string' || !value.identifier.trim()) return null
  return {
    provider: 'wallet',
    uid: value.uid,
    identifier: value.identifier,
    at: typeof value.at === 'number' ? value.at : Date.now(),
  }
}

function normalizeAtHandle(raw: string) {
  const cleaned = raw.trim().replace(/^@+/, '')
  return cleaned ? `@${cleaned}` : ''
}

export default function ProfilePage() {
  const [auth, setAuth] = useState<AuthSession | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const [user, setUser] = useState<ProfileUser | null>(null)
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [quests, setQuests] = useState<QuestSnapshot | null>(null)
  const [draftEmail, setDraftEmail] = useState('')
  const [draftDiscord, setDraftDiscord] = useState('')
  const [draftTwitter, setDraftTwitter] = useState('')
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSavedAt, setProfileSavedAt] = useState<number>(0)

  const [chainId, setChainId] = useState<string | null>(null)
  const [visitTrackedForUid, setVisitTrackedForUid] = useState<string>('')

  const hydrateProfile = useCallback((nextUser: ProfileUser, nextStats: ProfileStats, nextQuests: QuestSnapshot) => {
    setUser(nextUser)
    setStats(nextStats)
    setQuests(nextQuests)
    setDraftEmail(nextUser.email || '')
    setDraftDiscord(nextUser.discord || '')
    setDraftTwitter(nextUser.twitter || '')
  }, [])

  const loadProfileSnapshot = useCallback(async () => {
    const response = await fetch('/api/profile/me', { cache: 'no-store' })
    const data = await readJsonSafe<ProfileApiResponse>(response)
    if (!response.ok || !data?.ok || !data.user || !data.stats || !data.quests) {
      throw new Error(data?.error || 'Failed to load profile.')
    }
    hydrateProfile(data.user, data.stats, data.quests)
  }, [hydrateProfile])

  const loadSession = useCallback(async () => {
    const response = await fetch('/api/auth/session', { cache: 'no-store' })
    const data = await readJsonSafe<SessionApiResponse>(response)
    if (!response.ok || !data?.ok) throw new Error('Unable to load session')
    if (!data.authenticated) return null
    return asAuthSession(data.session)
  }, [])

  useEffect(() => {
    loadSession()
      .then(async (session) => {
        setAuth(session)
        if (session) {
          await loadProfileSnapshot()
          setAuthError(null)
        }
      })
      .catch(() => setAuth(null))
      .finally(() => setAuthReady(true))
  }, [loadSession, loadProfileSnapshot])

  useEffect(() => {
    let cancelled = false
    async function syncChain() {
      if (!user?.wallet || !hasEthereum()) {
        setChainId(null)
        return
      }
      try {
        const cid = await getChainId()
        if (!cancelled) setChainId(cid)
      } catch {
        if (!cancelled) setChainId(null)
      }
    }
    syncChain()
    return () => {
      cancelled = true
    }
  }, [user?.wallet])

  useEffect(() => {
    if (!auth) return
    if (visitTrackedForUid === auth.uid) return
    setVisitTrackedForUid(auth.uid)
    trackInteraction({ type: 'profile_visit', value: 1 })
    trackInteraction({ type: 'site_visit', value: 1, metadata: { page: 'profile' } })
  }, [auth, visitTrackedForUid])

  async function onMetaMaskAuth() {
    setAuthError(null)
    setAuthBusy(true)
    try {
      if (!hasEthereum()) throw new Error('MetaMask was not detected in this browser.')
      const accounts = await requestAccounts()
      const wallet = accounts[0] || ''
      if (!wallet) throw new Error('Wallet did not return an account.')

      const challengeRes = await fetch('/api/auth/wallet/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: wallet }),
      })
      const challengePayload = await readJsonWithText<WalletChallengeResponse>(challengeRes)
      const challenge = challengePayload.json
      if (!challengeRes.ok || !challenge?.ok || !challenge.message) {
        throw new Error(
          apiErrorFromResponse(
            challengePayload,
            'Failed to get wallet challenge.',
            challengeRes.status
          )
        )
      }

      const ethereum = (window as Window & { ethereum?: unknown }).ethereum
      if (!ethereum) throw new Error('Wallet provider is unavailable.')
      const provider = new ethers.providers.Web3Provider(ethereum as ethers.providers.ExternalProvider)
      const signer = provider.getSigner()
      const signature = await signer.signMessage(challenge.message)

      const verifyRes = await fetch('/api/auth/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: wallet,
          message: challenge.message,
          signature,
        }),
      })
      const verifyPayload = await readJsonWithText<WalletVerifyResponse>(verifyRes)
      const verified = verifyPayload.json
      if (!verifyRes.ok || !verified?.ok || !verified.authenticated) {
        throw new Error(
          apiErrorFromResponse(verifyPayload, 'Wallet login failed.', verifyRes.status)
        )
      }

      const session = asAuthSession(verified.session)
      if (!session) throw new Error('Invalid session payload.')
      setAuth(session)
      await loadProfileSnapshot()
      setAuthError(null)

      const cid = await getChainId().catch(() => null)
      setChainId(cid)
    } catch (error: unknown) {
      setAuthError(toErrorMessage(error, 'Wallet login failed.'))
    } finally {
      setAuthBusy(false)
    }
  }

  async function onSaveContacts() {
    if (!user) return
    setProfileError(null)
    try {
      const email = draftEmail.trim().toLowerCase()
      const discord = normalizeAtHandle(draftDiscord)
      const twitter = normalizeAtHandle(draftTwitter)
      const wallet = user.wallet || ''

      const response = await fetch('/api/profile/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, discord, twitter, wallet }),
      })
      const data = await readJsonSafe<ProfileApiResponse>(response)
      if (!response.ok || !data?.ok || !data.user || !data.stats || !data.quests) {
        throw new Error(data?.error || 'Failed to update profile.')
      }

      hydrateProfile(data.user, data.stats, data.quests)
      setProfileSavedAt(Date.now())
    } catch (error: unknown) {
      setProfileError(toErrorMessage(error, 'Profile update failed.'))
    }
  }

  const sortedQuests = useMemo(() => {
    if (!quests) return []
    return [...quests.quests].sort((a, b) => Number(a.completed) - Number(b.completed))
  }, [quests])

  const visibleQuests = sortedQuests.slice(0, 6)
  const completedQuests = quests?.completedCount || 0
  const totalQuests = quests?.quests.length || 0
  const questCompletionPct = totalQuests > 0 ? Math.round((completedQuests / totalQuests) * 100) : 0
  const chatMessages = stats?.chat.totalMessages || 0
  const askPrompts = stats?.chat.prompts || 0
  const marketTrades = stats?.market.trades || 0
  const winRate = (stats?.market.winRate || 0).toFixed(1)

  if (!authReady) {
    return (
      <main className={`pageRoot ${styles.page} skinAsk skinAskBlue`}>
        <div className={`max ${styles.shell}`}>
          <section className={styles.panel}>
            <p className={styles.overline}>Your Siggy Profile</p>
            <h1 className={styles.title}>Profile</h1>
            <p className={styles.subtitle}>Loading...</p>
          </section>
        </div>
      </main>
    )
  }

  if (!auth) {
    return (
      <main className={`pageRoot ${styles.page} skinAsk skinAskBlue`}>
        <div className={`max ${styles.shell}`}>
          <section className={styles.authGate}>
            <p className={styles.overline}>Your Siggy Profile</p>
            <h1 className={styles.authTitle}>Profile</h1>
            <p className={styles.authSubtitle}>Connect wallet to open your profile.</p>
            <div className={styles.authActions}>
              <button type="button" className={styles.primaryBtn} onClick={onMetaMaskAuth} disabled={authBusy}>
                {authBusy ? 'Waiting for signature...' : 'Connect Wallet'}
              </button>
            </div>

            {authError && <div className={styles.error}>{authError}</div>}

            <div className={styles.topActions}>
              <Link href="/ask" data-softnav="1" className={styles.navBtn}>Ask Siggy</Link>
              <Link href="/" data-softnav="1" className={`${styles.navBtn} ${styles.navBtnGhost}`}>Home</Link>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className={`pageRoot ${styles.page} skinAsk skinAskBlue`}>
      <div className={`max ${styles.shell}`}>
        <header className={styles.topBar}>
          <div className={styles.topLeft}>
            <p className={styles.overline}>Your Siggy Profile</p>
            <h1 className={styles.title}>Profile</h1>
          </div>
          <div className={styles.topActions}>
            <Link href="/ask" data-softnav="1" className={styles.navBtn}>Ask Siggy</Link>
            <Link href="/" data-softnav="1" className={`${styles.navBtn} ${styles.navBtnGhost}`}>Home</Link>
          </div>
        </header>

        <section className={styles.sessionLine}>
          <div className={styles.sessionInfo}>
            <div className={styles.sessionWallet}>Wallet: {shortAddress(auth.identifier)}</div>
            <div className={styles.sessionMeta}>Network: {chainId || 'Unknown'}</div>
          </div>
          <div className={styles.sessionActions}>
            <button type="button" className={styles.secondaryBtn} onClick={onMetaMaskAuth} disabled={authBusy}>
              Reconnect
            </button>
          </div>
        </section>

        <section className={styles.layout}>
          <article className={styles.panel}>
            <h2 className={styles.panelTitle}>Overview</h2>
            <div className={styles.statsList}>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>AI chat messages</span>
                <strong className={styles.statValue}>{chatMessages}</strong>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Ask Siggy prompts</span>
                <strong className={styles.statValue}>{askPrompts}</strong>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Market trades</span>
                <strong className={styles.statValue}>{marketTrades}</strong>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Win rate</span>
                <strong className={styles.statValue}>{winRate}%</strong>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Quest progress</span>
                <strong className={styles.statValue}>{completedQuests}/{totalQuests} ({questCompletionPct}%)</strong>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Last updated</span>
                <strong className={styles.statValue}>{fmtDate(profileSavedAt || user?.updatedAt || 0)}</strong>
              </div>
            </div>
          </article>

          <article className={styles.panel}>
            <h2 className={styles.panelTitle}>Contacts</h2>
            <label className={styles.field}>
              <span>Email</span>
              <input
                value={draftEmail}
                onChange={(e) => setDraftEmail(e.target.value)}
                placeholder="you@domain.com"
                inputMode="email"
              />
            </label>

            <label className={styles.field}>
              <span>Discord</span>
              <input
                value={draftDiscord}
                onChange={(e) => setDraftDiscord(e.target.value)}
                placeholder="@your_handle"
              />
            </label>

            <label className={styles.field}>
              <span>Twitter</span>
              <input
                value={draftTwitter}
                onChange={(e) => setDraftTwitter(e.target.value)}
                placeholder="@your_handle"
              />
            </label>

            <div className={styles.actions}>
              <button type="button" className={styles.primaryBtn} onClick={onSaveContacts}>
                Save
              </button>
            </div>
            {profileError && <div className={styles.error}>{profileError}</div>}
            {authError && <div className={styles.error}>{authError}</div>}
          </article>
        </section>

        <section className={styles.panel}>
          <div className={styles.sectionHead}>
            <h2 className={styles.panelTitle}>Quests</h2>
            <span className={styles.muted}>Points: {quests?.totalPoints || 0}</span>
          </div>
          {visibleQuests.length === 0 ? (
            <div className={styles.empty}>No quests yet.</div>
          ) : (
            <div className={styles.questBoard}>
              {visibleQuests.map((quest) => {
                const progress = Math.max(0, Math.min(quest.target, quest.progress))
                const pct = quest.target > 0 ? Math.round((progress / quest.target) * 100) : 0
                return (
                  <div key={quest.code} className={styles.questRow}>
                    <div className={styles.questTop}>
                      <div className={styles.questTitle}>{quest.title}</div>
                      <span className={styles.questBadge}>{quest.completed ? 'Done' : `${pct}%`}</span>
                    </div>
                    <div className={styles.questMeta}>{progress}/{quest.target} • +{quest.rewardPoints} pts</div>
                    <div className={styles.progressTrack}>
                      <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </div>
    </main>
  )
}
