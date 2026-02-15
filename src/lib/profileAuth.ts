import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

export type AuthProvider = 'wallet'

export type AuthSession = {
  provider: AuthProvider
  uid: string
  identifier: string
  at: number
}

type SignedEnvelope<T extends object> = T & {
  iat: number
  exp: number
}

type WalletChallengePayload = {
  address: string
  nonce: string
}

export const AUTH_COOKIE = 'siggy_profile_session'
export const WALLET_CHALLENGE_COOKIE = 'siggy_wallet_login'

const SESSION_TTL_SEC = 60 * 60 * 24 * 30
const SHORT_TTL_SEC = 60 * 15
const DEV_FALLBACK_SECRET = 'siggy-dev-secret-change-me'

let resolvedSecret: string | null = null

function isProd() {
  return process.env.NODE_ENV === 'production'
}

function firstNonEmpty(...values: Array<string | undefined>) {
  for (const value of values) {
    if (value && value.trim()) return value.trim()
  }
  return null
}

function deriveFallbackSecret() {
  const seed = firstNonEmpty(
    process.env.SIGGY_FALLBACK_SECRET,
    process.env.OPENAI_API_KEY,
    process.env.VERCEL_DEPLOYMENT_ID,
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.RAILWAY_PROJECT_ID,
    process.env.RENDER_SERVICE_ID
  )
  if (!seed) return null
  return crypto.createHash('sha256').update(`siggy-profile-auth:${seed}`).digest('hex')
}

function getSecret() {
  if (resolvedSecret) return resolvedSecret

  const envSecret = firstNonEmpty(process.env.AUTH_SECRET, process.env.SIGGY_AUTH_SECRET)
  if (envSecret) {
    resolvedSecret = envSecret
    return resolvedSecret
  }

  const derived = deriveFallbackSecret()
  if (derived) {
    resolvedSecret = derived
    return resolvedSecret
  }

  resolvedSecret = DEV_FALLBACK_SECRET
  return resolvedSecret
}

function hmac(value: string) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('base64url')
}

function encodeBase64Url<T>(data: T) {
  return Buffer.from(JSON.stringify(data), 'utf8').toString('base64url')
}

function decodeBase64Url<T>(value: string): T | null {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T
  } catch {
    return null
  }
}

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a)
  const bb = Buffer.from(b)
  if (aa.length !== bb.length) return false
  return crypto.timingSafeEqual(aa, bb)
}

function signPayload<T extends object>(payload: T, ttlSec: number) {
  const now = Math.floor(Date.now() / 1000)
  const envelope: SignedEnvelope<T> = {
    ...payload,
    iat: now,
    exp: now + ttlSec,
  }
  const body = encodeBase64Url(envelope)
  const signature = hmac(body)
  return `${body}.${signature}`
}

function verifySignedPayload<T extends object>(token: string): SignedEnvelope<T> | null {
  const [body, signature] = token.split('.')
  if (!body || !signature) return null
  const expected = hmac(body)
  if (!safeEqual(signature, expected)) return null

  const parsed = decodeBase64Url<SignedEnvelope<T>>(body)
  if (!parsed) return null

  const now = Math.floor(Date.now() / 1000)
  if (parsed.exp <= now) return null
  return parsed
}

function setSignedCookie<T extends object>(
  response: NextResponse,
  name: string,
  payload: T,
  ttlSec: number
) {
  const token = signPayload(payload, ttlSec)
  response.cookies.set(name, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd(),
    path: '/',
    maxAge: ttlSec,
  })
}

function readSignedCookie<T extends object>(request: NextRequest, name: string): T | null {
  const token = request.cookies.get(name)?.value
  if (!token) return null
  const verified = verifySignedPayload<T>(token)
  if (!verified) return null
  return verified as unknown as T
}

export function randomToken(size = 32) {
  return crypto.randomBytes(size).toString('hex')
}

export function createWalletChallenge(response: NextResponse, address: string, nonce: string) {
  setSignedCookie<WalletChallengePayload>(
    response,
    WALLET_CHALLENGE_COOKIE,
    { address: address.toLowerCase(), nonce },
    SHORT_TTL_SEC
  )
}

export function readWalletChallenge(request: NextRequest) {
  return readSignedCookie<WalletChallengePayload>(request, WALLET_CHALLENGE_COOKIE)
}

export function clearWalletChallenge(response: NextResponse) {
  response.cookies.delete(WALLET_CHALLENGE_COOKIE)
}

export function createSession(response: NextResponse, session: AuthSession) {
  setSignedCookie<AuthSession>(response, AUTH_COOKIE, session, SESSION_TTL_SEC)
}

export function readSession(request: NextRequest) {
  return readSignedCookie<AuthSession>(request, AUTH_COOKIE)
}

export function clearSession(response: NextResponse) {
  response.cookies.delete(AUTH_COOKIE)
}

export function clearAllAuth(response: NextResponse) {
  clearSession(response)
  clearWalletChallenge(response)
}
