// src/app/ask/api/polymarket/markets/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RawMarket = {
  id?: string | number
  question?: string | null
  slug?: string | null
  volume?: number | string | null
  liquidity?: number | string | null
  endDate?: string | null
  active?: boolean | null
  closed?: boolean | null

  // иногда прилетают как строки, иногда как массивы
  outcomes?: any
  outcomePrices?: any
  clobTokenIds?: any
  conditionId?: string | null
  orderPriceMinTickSize?: number | string | null
  orderMinSize?: number | string | null
  negRisk?: boolean | string | null
  events?: any

  // иногда альтернативные поля
  volumeNum?: number | string | null
  liquidityNum?: number | string | null
  volume_num?: number | string | null
  liquidity_num?: number | string | null
  volume_num_total?: number | string | null
  liquidity_num_total?: number | string | null
}

function num(v: unknown) {
  const n =
    typeof v === 'string' ? Number(v) :
    typeof v === 'number' ? v :
    0
  return Number.isFinite(n) ? n : 0
}

function toArrayMaybeJson(v: any): any[] {
  if (Array.isArray(v)) return v
  if (typeof v === 'string') {
    // часто это JSON строка вида ["Yes","No"] или ["0.63","0.37"]
    try {
      const parsed = JSON.parse(v)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function toBool(v: unknown) {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') return v.toLowerCase() === 'true'
  return false
}

function normMarket(m: RawMarket) {
  const outcomes = toArrayMaybeJson(m.outcomes).map(x => String(x))
  const prices = toArrayMaybeJson(m.outcomePrices).map(x => String(x))
  const clobTokenIds = toArrayMaybeJson(m.clobTokenIds).map(x => String(x))
  const events = toArrayMaybeJson(m.events)

  const yesIdx = outcomes.findIndex(x => x.toLowerCase() === 'yes')
  const yesPrice =
    yesIdx >= 0 ? num(prices[yesIdx]) :
    prices.length ? num(prices[0]) :
    0

  const volume =
    num(m.volumeNum ?? m.volume_num ?? m.volume_num_total ?? m.volume)

  const liquidity =
    num(m.liquidityNum ?? m.liquidity_num ?? m.liquidity_num_total ?? m.liquidity)

  const id = String(m.id ?? m.slug ?? m.question ?? Math.random())
  const slug = m.slug ? String(m.slug) : ''
  const url = slug ? `https://polymarket.com/market/${slug}` : ''

  const active = Boolean(m.active ?? (!m.closed))
  const closed = Boolean(m.closed)
  const negRisk =
    m.negRisk != null ? toBool(m.negRisk) :
    Array.isArray(events) ? Boolean((events as any[])?.[0]?.negRisk) :
    false

  const tickSize = num(m.orderPriceMinTickSize)
  const minSize = num(m.orderMinSize)

  return {
    id,
    question: String(m.question ?? 'Untitled market'),
    slug,
    url,
    volume,
    liquidity,
    endDate: m.endDate ? String(m.endDate) : '',
    active,
    closed,
    yesPrice,
    outcomes,
    clobTokenIds,
    conditionId: m.conditionId ? String(m.conditionId) : '',
    tickSize,
    minSize,
    negRisk,
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)

    const q = (url.searchParams.get('q') || '').trim().toLowerCase()
    const sort = (url.searchParams.get('sort') || 'volume').trim() // volume | liquidity | end
    const activeOnly = (url.searchParams.get('activeOnly') || '1') === '1'
    const yesMinRaw = url.searchParams.get('yesMin')
    const yesMinNum = yesMinRaw === null ? null : Number(yesMinRaw)
    const yesMin = Number.isFinite(yesMinNum)
      ? Math.min(1, Math.max(0, yesMinNum as number))
      : null

    // сколько вернуть пользователю (итог)
    const limit = Math.max(1, Math.min(80, Number(url.searchParams.get('limit') || 30)))

    // сколько рынков тянуть за один запрос к gamma
    const BATCH = 200

    // сколько батчей максимум перебирать при поиске (чтобы q=trump реально нашёл)
    const MAX_BATCHES = q ? 10 : 1 // до 2000 рынков

    const upstreamBase = 'https://gamma-api.polymarket.com/markets'

    // мы не полагаемся на upstream-sort, сортируем локально (чтобы не зависеть от названий полей)
    async function fetchBatch(offset: number) {
      const u = new URL(upstreamBase)
      u.searchParams.set('limit', String(BATCH))
      u.searchParams.set('offset', String(offset))
      u.searchParams.set('closed', 'false')

      const res = await fetch(u.toString(), {
        cache: 'no-store',
        headers: { accept: 'application/json' },
      })

      if (!res.ok) {
        const t = await res.text().catch(() => '')
        throw new Error(`Upstream error ${res.status}: ${t.slice(0, 180)}`)
      }

      const raw = (await res.json()) as RawMarket[]
      return Array.isArray(raw) ? raw : []
    }

    const picked: ReturnType<typeof normMarket>[] = []
    const seen = new Set<string>()

    for (let i = 0; i < MAX_BATCHES; i++) {
      const raw = await fetchBatch(i * BATCH)
      if (!raw.length) break

      for (const rm of raw) {
        const m = normMarket(rm)

        if (seen.has(m.id)) continue
        seen.add(m.id)

        if (activeOnly && !(m.active && !m.closed)) continue

        if (q) {
          if (!m.question.toLowerCase().includes(q)) continue
        }

        if (yesMin !== null && m.yesPrice < yesMin) continue

        picked.push(m)

        // чтобы поиск был “живым”: набираем чуть больше, чем limit, и потом отсортируем
        if (picked.length >= Math.max(limit * 3, limit + 10)) break
      }

      if (picked.length >= Math.max(limit * 3, limit + 10)) break
    }

    picked.sort((a, b) => {
      if (sort === 'liquidity') return b.liquidity - a.liquidity
      if (sort === 'end') return (a.endDate || '').localeCompare(b.endDate || '')
      return b.volume - a.volume
    })

    const markets = picked.slice(0, limit)
    return NextResponse.json({ ok: true, markets })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Server error' },
      { status: 500 }
    )
  }
}
