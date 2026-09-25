import crypto from 'crypto'
import { ethers } from 'ethers'
import OpenAI from 'openai'
import { getDb } from '@/lib/db'

export type ChronicleInput = {
  wallet: string
  title: string
  idea: string
  recipe: string
  primitives: string[]
  primitiveMask: number
}

export type ChronicleRecord = ChronicleInput & {
  id: number
  contentHash: `0x${string}`
  createdAt: number
  mintedTx: string
  tokenId: string
  coverImage: string
  coverPrompt: string
}

type ChronicleRow = {
  id: number
  wallet_address: string
  title: string
  idea: string
  recipe: string
  primitives: string
  primitive_mask: number
  content_hash: string
  created_at: number
  minted_tx: string | null
  token_id: string | null
  cover_image: string | null
  cover_prompt: string | null
}

const RITUAL_RPC_URL = process.env.RITUAL_RPC_URL || 'https://rpc.ritualfoundation.org'
const RITUAL_WALLET = '0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948'
const RITUAL_WALLET_ABI = [
  'function balanceOf(address user) view returns (uint256)',
]

const PRIMITIVE_ALLOWLIST = new Set([
  'LLM 0x0802',
  'HTTP 0x0801',
  'Scheduler',
  'RitualWallet',
  'Sovereign Agent 0x080C',
  'Persistent Agent 0x0820',
  'Secrets',
  'Multimodal 0x0818/0x0819/0x081A',
  'Chronicle NFT',
])

function cleanText(value: string, max: number) {
  return value.replace(/\s+/g, ' ').trim().slice(0, max)
}

function cleanLongText(value: string, max: number) {
  return value.replace(/\r\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim().slice(0, max)
}

export function isWalletAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim())
}

function normalizeWallet(value: string) {
  return value.trim().toLowerCase()
}

function normalizePrimitives(values: string[]) {
  const result: string[] = []
  for (const value of values) {
    const primitive = cleanText(String(value || ''), 80)
    if (!primitive || !PRIMITIVE_ALLOWLIST.has(primitive) || result.includes(primitive)) continue
    result.push(primitive)
  }
  return result.slice(0, 8)
}

function toRecord(row: ChronicleRow): ChronicleRecord {
  return {
    id: Number(row.id),
    wallet: row.wallet_address,
    title: row.title,
    idea: row.idea,
    recipe: row.recipe,
    primitives: parseJsonArray(row.primitives),
    primitiveMask: Number(row.primitive_mask || 0),
    contentHash: row.content_hash as `0x${string}`,
    createdAt: Number(row.created_at),
    mintedTx: row.minted_tx || '',
    tokenId: row.token_id || '',
    coverImage: row.cover_image || '',
    coverPrompt: row.cover_prompt || '',
  }
}

function parseJsonArray(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []
  } catch {
    return []
  }
}

function canonicalPayload(input: Omit<ChronicleInput, 'wallet'> & { wallet: string; createdAt: number }) {
  return JSON.stringify({
    wallet: normalizeWallet(input.wallet),
    title: input.title,
    idea: input.idea,
    recipe: input.recipe,
    primitives: input.primitives,
    primitiveMask: input.primitiveMask,
    createdAt: input.createdAt,
  })
}

export async function createChronicle(input: ChronicleInput) {
  if (!isWalletAddress(input.wallet)) throw new Error('Invalid wallet address.')

  const wallet = normalizeWallet(input.wallet)
  const title = cleanText(input.title || 'Untitled Ritual Project', 96)
  const idea = cleanLongText(input.idea, 1200)
  const recipe = cleanLongText(input.recipe, 6000)
  const primitives = normalizePrimitives(input.primitives)
  const primitiveMask = Math.max(0, Math.min(65535, Math.floor(input.primitiveMask || 0)))

  if (title.length < 3) throw new Error('Title is too short.')
  if (idea.length < 8) throw new Error('Idea is too short.')
  if (recipe.length < 24) throw new Error('Recipe is too short.')

  const createdAt = Date.now()
  const payload = canonicalPayload({ wallet, title, idea, recipe, primitives, primitiveMask, createdAt })
  const contentHash = `0x${crypto.createHash('sha256').update(payload).digest('hex')}` as `0x${string}`
  const coverPrompt = buildCoverPrompt({ title, idea, recipe, primitives })
  const coverImage = await generateCoverImage(coverPrompt).catch(() => buildFallbackCoverImage({ title, primitives }))

  const db = getDb()
  const result = db.prepare(`
    INSERT INTO chronicles (
      wallet_address, title, idea, recipe, primitives, primitive_mask, content_hash, created_at, cover_image, cover_prompt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(wallet, title, idea, recipe, JSON.stringify(primitives), primitiveMask, contentHash, createdAt, coverImage, coverPrompt)

  const idRaw = result.lastInsertRowid
  const id = typeof idRaw === 'bigint' ? Number(idRaw) : Number(idRaw || 0)
  const saved = getChronicle(id)
  if (!saved) throw new Error('Failed to create Chronicle metadata.')
  return saved
}

export function getChronicle(id: number) {
  const db = getDb()
  const row = db.prepare(`
    SELECT id, wallet_address, title, idea, recipe, primitives, primitive_mask, content_hash, created_at, minted_tx, token_id
      , cover_image, cover_prompt
    FROM chronicles
    WHERE id = ?
  `).get(id) as ChronicleRow | undefined

  return row ? toRecord(row) : null
}

export function markChronicleMinted(input: { id: number; txHash: string; tokenId?: string }) {
  const txHash = input.txHash.trim()
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) throw new Error('Invalid transaction hash.')

  const db = getDb()
  db.prepare(`
    UPDATE chronicles
    SET minted_tx = ?, token_id = ?
    WHERE id = ?
  `).run(txHash, input.tokenId?.trim() || null, input.id)

  return getChronicle(input.id)
}

export async function getRitualWalletFunded(wallet: string) {
  if (!isWalletAddress(wallet)) return false
  try {
    const provider = new ethers.providers.JsonRpcProvider(RITUAL_RPC_URL)
    const contract = new ethers.Contract(RITUAL_WALLET, RITUAL_WALLET_ABI, provider)
    const balance = await contract.balanceOf(wallet)
    return ethers.BigNumber.from(balance).gt(0)
  } catch {
    return false
  }
}

export function buildChronicleMetadata(record: ChronicleRecord, funded: boolean, imageUrl: string) {
  const status = funded ? 'Funded' : 'Draft'
  const explorerTx = record.mintedTx ? `https://explorer.ritualfoundation.org/tx/${record.mintedTx}` : ''

  return {
    name: `Siggy Chronicle #${record.id}: ${record.title}`,
    description:
      'A Ritual project passport created with Siggy. It preserves a builder idea, Ritual primitive map, and content hash as an on-chain Chronicle.',
    image: imageUrl,
    external_url: 'https://skills.ritualfoundation.org/',
    attributes: [
      { trait_type: 'Status', value: status },
      { trait_type: 'Network', value: 'Ritual Chain' },
      { trait_type: 'Author', value: record.wallet },
      { trait_type: 'Primitive Count', value: record.primitives.length },
      ...record.primitives.map((primitive) => ({ trait_type: 'Ritual Primitive', value: primitive })),
    ],
    properties: {
      idea: record.idea,
      recipe: record.recipe,
      primitives: record.primitives,
      primitive_mask: record.primitiveMask,
      content_hash: record.contentHash,
      created_at: new Date(record.createdAt).toISOString(),
      ritual_wallet_status: status,
      mint_tx: record.mintedTx,
      explorer_tx: explorerTx,
    },
  }
}

export function buildChronicleImage(record: ChronicleRecord, funded: boolean) {
  const status = funded ? 'Funded' : 'Draft'
  const statusColor = funded ? '#89ecb8' : '#ffd86f'
  const statusBg = funded ? 'rgba(137,236,184,0.22)' : 'rgba(255,216,111,0.20)'
  const primitives = record.primitives.slice(0, 3).join(' / ') || 'Ritual project passport'
  const hash = `${record.contentHash.slice(0, 10)}...${record.contentHash.slice(-8)}`
  const cover = record.coverImage || buildFallbackCoverImage(record)

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000000" stop-opacity="0.08"/>
      <stop offset="0.54" stop-color="#000000" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.72"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="10" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="1200" height="1200" fill="#07140f"/>
  <image href="${escapeSvg(cover)}" x="0" y="0" width="1200" height="1200" preserveAspectRatio="xMidYMid slice"/>
  <rect width="1200" height="1200" fill="url(#shade)"/>
  <rect x="58" y="58" width="1084" height="1084" rx="46" fill="none" stroke="#f4df9d" stroke-opacity="0.46" stroke-width="3"/>
  <rect x="84" y="84" width="1032" height="1032" rx="34" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1"/>
  <g filter="url(#glow)">
    <rect x="84" y="82" width="260" height="58" rx="29" fill="${statusBg}" stroke="${statusColor}" stroke-opacity="0.72"/>
    <text x="214" y="120" fill="${statusColor}" font-family="Inter,Arial,sans-serif" font-size="24" font-weight="900" text-anchor="middle" letter-spacing="3">STATUS: ${escapeSvg(status.toUpperCase())}</text>
  </g>
  <text x="90" y="832" fill="#fff7df" font-family="Inter,Arial,sans-serif" font-size="34" font-weight="900" letter-spacing="4">SIGGY CHRONICLE</text>
  <text x="90" y="905" fill="#ffffff" font-family="Inter,Arial,sans-serif" font-size="62" font-weight="900">${escapeSvg(record.title)}</text>
  <text x="90" y="970" fill="#d7fff0" font-family="Inter,Arial,sans-serif" font-size="28" font-weight="700">${escapeSvg(primitives)}</text>
  <text x="90" y="1056" fill="#f8e7b6" font-family="monospace" font-size="23">${escapeSvg(hash)}</text>
  <text x="1110" y="1056" fill="#ffffff" fill-opacity="0.72" font-family="Inter,Arial,sans-serif" font-size="24" font-weight="800" text-anchor="end">Ritual Chain</text>
</svg>`.trim()
}

function escapeSvg(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildCoverPrompt(input: { title: string; idea: string; recipe: string; primitives: string[] }) {
  return [
    'Create a premium square NFT cover for a Ritual Chain project passport.',
    'Style: Siggy Land, green and gold cyber-forest, elegant crypto x AI atmosphere, tactile artifact, high-end product card, crisp composition.',
    'No readable text, no logos, no UI labels, no watermark. Leave darker space at the bottom for an overlay.',
    `Project title: ${input.title}`,
    `Project idea: ${input.idea}`,
    `Ritual primitives: ${input.primitives.join(', ') || 'Ritual builder passport'}`,
    `Recipe context: ${input.recipe.slice(0, 900)}`,
  ].join('\n')
}

async function generateCoverImage(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return buildFallbackCoverImage({ title: 'Siggy Chronicle', primitives: [] })

  const client = new OpenAI({ apiKey })
  const result = await client.images.generate({
    model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
    prompt,
    size: '1024x1024',
    quality: 'low',
  })

  const b64 = result.data?.[0]?.b64_json
  if (!b64) throw new Error('Image generation returned no image.')
  return `data:image/png;base64,${b64}`
}

function buildFallbackCoverImage(input: { title: string; primitives: string[] }) {
  const primitives = input.primitives.slice(0, 4).join(' / ') || 'Ritual builder passport'
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#07140f"/>
      <stop offset="0.52" stop-color="#173223"/>
      <stop offset="1" stop-color="#0b3d43"/>
    </linearGradient>
    <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffd86f"/>
      <stop offset="1" stop-color="#89ecb8"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="1200" fill="url(#bg)"/>
  <circle cx="1020" cy="160" r="260" fill="#89ecb8" opacity="0.12"/>
  <circle cx="120" cy="1040" r="300" fill="#ffd86f" opacity="0.10"/>
  <rect x="86" y="86" width="1028" height="1028" rx="42" fill="none" stroke="#f4df9d" stroke-opacity="0.28" stroke-width="3"/>
  <path d="M600 170 760 330 600 490 440 330Z" fill="none" stroke="url(#line)" stroke-width="18"/>
  <text x="112" y="620" fill="#fff7df" font-family="Inter,Arial,sans-serif" font-size="42" font-weight="800">SIGGY CHRONICLE</text>
  <text x="112" y="690" fill="#ffffff" font-family="Inter,Arial,sans-serif" font-size="64" font-weight="900">${escapeSvg(input.title)}</text>
  <text x="112" y="850" fill="#f8e7b6" font-family="Inter,Arial,sans-serif" font-size="26">${escapeSvg(primitives)}</text>
</svg>`.trim()

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}
