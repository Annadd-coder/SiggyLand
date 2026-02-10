// src/app/predict/api/markets/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RawMarket = {
  id?: string | number
  question?: string
  slug?: string

  // Gamma часто отдает и строки, и числа
  volume?: number | string
  liquidity?: number | string
  volumeNum?: number | string
  liquidityNum?: number | string

  endDate?: string
  active?: boolean | string
  closed?: boolean | string

  outcomePrices?: unknown // иногда массив, иногда JSON-строка
  outcomes?: unknown      // иногда массив, иногда JSON-строка
}

function toNum(v: unknown) {
  const n =
    typeof v === 'number' ? v :
    typeof v === 'string' ? Number(v) :
    NaN
  return Number.isFinite(n) ? n : 0
}

function toBool(v: unknown) {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') return v.toLowerCase() === 'true'
  return false
}

function safeJsonArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

// стабильный id без Math.random
function stableIdFrom(m: RawMarket) {
  if (m.id != null) return String(m.id)
  if (m.slug) return `slug:${m.slug}`
  const q = String(m.question ?? 'untitled')
  // простенький hash
  let h = 0
  for (let i = 0; i < q.length; i++) h = (h * 31 + q.charCodeAt(i)) >>> 0
  return `q:${h.toString(16)}`
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)

    const q = (url.searchParams.get('q') || '').trim().toLowerCase()
    const sort = (url.searchParams.get('sort') || 'volume').trim() // volume | liquidity | end
    const activeOnly = (url.searchParams.get('activeOnly') || '1') === '1'
    const limit = Math.max(1, Math.min(80, Number(url.searchParams.get('limit') || 30)))

    const upstreamBase = 'https://gamma-api.polymarket.com/markets'

    // если есть поиск - сканируем несколько страниц, чтобы реально найти совпадения
    const pageSize = q ? 100 : Math.max(30, Math.min(100, limit))
    const maxPages = q ? 10 : 1 // можно поднять до 15, если надо “глубже”
    const order =
      sort === 'liquidity' ? 'liquidityNum' :
      sort === 'end' ? 'endDate' :
      'volumeNum'

    const collected: Array<{
      id: string
      question: string
      slug: string
      url: string
      volume: number
      liquidity: number
      endDate: string
      active: boolean
      closed: boolean
      yesPrice: number
    }> = []

    let scanned = 0

    for (let page = 0; page < maxPages; page++) {
      const upstream = new URL(upstreamBase)
      upstream.searchParams.set('limit', String(pageSize))
      upstream.searchParams.set('offset', String(page * pageSize))
      upstream.searchParams.set('order', order)
      upstream.searchParams.set('ascending', 'false')

      // в Gamma есть параметр closed (false = только не закрытые)
      if (activeOnly) upstream.searchParams.set('closed', 'false')

      const res = await fetch(upstream.toString(), {
        cache: 'no-store',
        headers: { accept: 'application/json' },
      })

      if (!res.ok) {
        const t = await res.text().catch(() => '')
        return NextResponse.json(
          { ok: false, error: `Upstream error ${res.status}: ${t.slice(0, 180)}` },
          { status: 502 }
        )
      }

      const raw = (await res.json()) as RawMarket[]
      const items = Array.isArray(raw) ? raw : []
      scanned += items.length

      if (items.length === 0) break

      for (const m of items) {
        const outcomes = safeJsonArray(m.outcomes).map(x => String(x))
        const pricesArr = safeJsonArray(m.outcomePrices).map(toNum)

        const yesIdx = outcomes.findIndex(x => x.toLowerCase() === 'yes')
        const yesPrice =
          yesIdx >= 0 ? (pricesArr[yesIdx] ?? 0) :
          pricesArr.length ? (pricesArr[0] ?? 0) :
          0

        const closed = toBool(m.closed)
        const active = toBool(m.active)

        const question = String(m.question ?? 'Untitled market')
        const slug = m.slug ? String(m.slug) : ''

        const vol = toNum(m.volumeNum ?? m.volume)
        const liq = toNum(m.liquidityNum ?? m.liquidity)

        const norm = {
          id: stableIdFrom(m),
          question,
          slug,
          url: slug ? `https://polymarket.com/market/${slug}` : '',
          volume: vol,
          liquidity: liq,
          endDate: m.endDate ? String(m.endDate) : '',
          active,
          closed,
          yesPrice,
        }

        // фильтры
        if (activeOnly) {
          // у Gamma closed=false уже стоит, но оставим дополнительную защиту
          if (norm.closed) continue
        }

        if (q) {
          if (!norm.question.toLowerCase().includes(q)) continue
        }

        collected.push(norm)
        if (collected.length >= limit) break
      }

      if (collected.length >= limit) break
    }

    // финальная сортировка на всякий случай
    collected.sort((a, b) => {
      if (sort === 'liquidity') return b.liquidity - a.liquidity
      if (sort === 'end') return (a.endDate || '').localeCompare(b.endDate || '')
      return b.volume - a.volume
    })

    return NextResponse.json({
      ok: true,
      markets: collected.slice(0, limit),
      meta: { scannedPages: Math.ceil(scanned / pageSize), scannedItems: scanned },
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Server error' },
      { status: 500 }
    )
  }
}