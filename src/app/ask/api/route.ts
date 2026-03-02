import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RITUAL_DOC_URL = 'https://www.ritualfoundation.org/docs/overview/what-is-ritual'

const RITUAL_DOC_BASELINE = `
Verified Ritual reference to anchor factual answers:
- Ritual describes itself as a blockchain focused on making on-chain behavior more expressive.
- The docs frame Ritual around heterogeneous compute, including AI, ZK, TEEs, and related execution capabilities.
- The overview page highlights features such as scheduled transactions, EVM++ extensions, Resonance, Symphony, node specialization, modular storage, guardians, and native Infernet integration.
- If a Ritual-specific claim is not supported by the official docs context, say it cannot be verified and do not guess.
`.trim()

const SYSTEM_PROMPT = `
You are Siggy — a cute, reliable personal assistant for planning, writing, research, and Ritual-related questions.

Core role:
- Help with everyday project tasks: writing, planning, organizing ideas, polishing messages, and answering questions.
- You can assist with Ritual positioning, community communication, launch copy, creator workflows, and general task support.
- Sound warm, smart, and human. Helpful, not stiff.

Voice:
- Natural, warm, calm, and confident.
- Slightly cute is fine, but stay polished and useful.
- Human phrasing. No corporate filler. No stiff templates.
- Brief empathy is good when the user sounds stressed, blocked, or uncertain.
- Do not sound dry.

Conversation rules:
- If the request is vague or missing key context, ask exactly one clarifying question.
- Otherwise answer directly.
- Keep the reply focused, useful, and easy to act on.
- Use bullets only when they genuinely make the answer clearer.
- For simple casual messages, respond like a normal person and keep it conversational.
- Default to English. Only switch languages if the user clearly asks you to.

Accuracy and safety:
- For Ritual-specific facts, treat the provided official Ritual docs context as the primary source of truth.
- If a Ritual-specific point is not supported by the docs context, say that you cannot verify it from the docs and avoid guessing.
- If you are not sure, say so clearly and suggest the fastest way to verify.
- Never invent links, names, partnerships, launch dates, technical facts, or documentation claims.
- Do not make financial promises, price promises, or hype claims.
- For crypto, NFT, and community growth topics: stay strategic and realistic, never guarantee outcomes.

Links:
- Only include links if they are truly useful.
- Only use links from this allowlist:
  1) https://www.ritualfoundation.org/
  2) https://www.ritualfoundation.org/docs/overview/what-is-ritual
  3) https://links.ritual.tools
  4) https://github.com/ritual-net
  5) https://discord.gg/GnY9Ew9cMX
- If the exact link is unknown, do not invent it. Say what to search for instead.

Special meme:
- If the user mentions "Tony" or "Тони", say you know Tony: Tony Soprano, massage enthusiast, legendary hustler in the Ritual CIS scene. Keep it short and funny, then continue normally.
`.trim()

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function stripHtml(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim()
}

function extractDocsExcerpt(html: string) {
  const text = stripHtml(html)
  if (!text) return ''

  const anchor = 'What is Ritual?'
  const start = text.indexOf(anchor)
  const sliceStart = start >= 0 ? start : 0
  return text.slice(sliceStart, sliceStart + 4200).trim()
}

async function loadRitualDocsExcerpt() {
  try {
    const response = await fetch(RITUAL_DOC_URL, { cache: 'no-store' })
    if (!response.ok) return null

    const html = await response.text()
    const excerpt = extractDocsExcerpt(html)
    return excerpt || null
  } catch {
    return null
  }
}

function jsonError(message: string, status = 500) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

type HistoryItem = { role: 'user' | 'assistant'; text: string }

function isHistoryItem(value: unknown): value is HistoryItem {
  if (!value || typeof value !== 'object') return false
  const item = value as { role?: unknown; text?: unknown }
  return (item.role === 'user' || item.role === 'assistant') && typeof item.text === 'string'
}

function toErrorMessage(error: unknown, fallback = 'Server error') {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error.trim()) return error
  return fallback
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)

    const userText = String(body?.prompt ?? '').trim()
    if (!userText) return jsonError('Empty prompt', 400)

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return jsonError('Missing OPENAI_API_KEY', 500)

    const rawHistory: unknown[] = Array.isArray(body?.history) ? body.history : []
    const history: HistoryItem[] = rawHistory
      .filter(isHistoryItem)
      .map((item) => ({ role: item.role, text: item.text.trim() }))
      .filter((item) => item.text.length > 0)
      .slice(-18)

    const ritualDocsExcerpt = await loadRitualDocsExcerpt()

    const client = new OpenAI({ apiKey })

    const input = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      {
        role: 'system' as const,
        content: [
          `Official Ritual docs source: ${RITUAL_DOC_URL}`,
          RITUAL_DOC_BASELINE,
          ritualDocsExcerpt
            ? `Live docs excerpt:\n${ritualDocsExcerpt}`
            : 'Live docs excerpt was unavailable for this request. If asked about Ritual-specific facts, be explicit about what you cannot verify from the docs context.',
        ].join('\n\n'),
      },
      ...history.map((item) => ({ role: item.role, content: item.text })),
      { role: 'user' as const, content: userText },
    ]

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
      input,
      max_output_tokens: 700,
    })

    const reply = (response.output_text ?? '').trim() || 'I got nothing. Try again.'
    return NextResponse.json({ ok: true, reply })
  } catch (error: unknown) {
    return jsonError(toErrorMessage(error), 500)
  }
}
