// src/app/ask/api/markets/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ABI = [
  'function marketCount() view returns (uint256)',
  'function getMarket(uint256) view returns (string question, uint40 endTime, uint256 b, uint256 qYes, uint256 qNo, uint256 volumeUsdc, bool resolved, bool outcomeYes)',
  'function priceYes(uint256) view returns (uint256)',
]

function toNum(x: any) {
  const n = Number(x)
  return Number.isFinite(n) ? n : 0
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const q = (url.searchParams.get('q') || '').trim().toLowerCase()
    const sort = (url.searchParams.get('sort') || 'volume').trim() // volume | liquidity | end
    const activeOnly = (url.searchParams.get('activeOnly') || '1') === '1'
    const page = Math.max(1, Number(url.searchParams.get('page') || 1))
    const pageSize = Math.max(1, Math.min(50, Number(url.searchParams.get('pageSize') || 10)))

    const rpc = process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL
    const addr = process.env.PREDICT_MARKET_ADDRESS || process.env.NEXT_PUBLIC_PREDICT_MARKET_ADDRESS

    if (!rpc || !addr) {
      return NextResponse.json(
        { ok: false, error: 'Missing BASE_RPC_URL or PREDICT_MARKET_ADDRESS' },
        { status: 500 }
      )
    }

    const provider = new ethers.providers.JsonRpcProvider(rpc)
    const contract = new ethers.Contract(addr, ABI, provider)

    const countRaw = await contract.marketCount()
    const count = Number(countRaw.toString())

    const items: Array<any> = []

    for (let i = count - 1; i >= 0; i--) {
      const [question, endTime, b, qYes, qNo, volumeUsdc, resolved, outcomeYes] = await contract.getMarket(i)
      const yesPrice18 = await contract.priceYes(i)

      const endTs = Number(endTime)
      const active = !resolved && endTs * 1000 > Date.now()

      const m = {
        id: String(i),
        question: String(question),
        endTime: endTs,
        endDate: endTs ? new Date(endTs * 1000).toISOString() : '',
        b: Number(ethers.utils.formatUnits(b, 18)),
        qYes: Number(ethers.utils.formatUnits(qYes, 18)),
        qNo: Number(ethers.utils.formatUnits(qNo, 18)),
        volume: Number(ethers.utils.formatUnits(volumeUsdc, 6)),
        resolved: Boolean(resolved),
        outcomeYes: Boolean(outcomeYes),
        yesPrice: Number(ethers.utils.formatUnits(yesPrice18, 18)),
        active,
      }

      if (activeOnly && !m.active) continue
      if (q && !m.question.toLowerCase().includes(q)) continue

      items.push(m)
    }

    items.sort((a, b) => {
      if (sort === 'liquidity') return toNum(b.b) - toNum(a.b)
      if (sort === 'end') return (a.endTime || 0) - (b.endTime || 0)
      return toNum(b.volume) - toNum(a.volume)
    })

    const total = items.length
    const pageCount = Math.max(1, Math.ceil(total / pageSize))
    const start = (page - 1) * pageSize
    const pageItems = items.slice(start, start + pageSize)

    return NextResponse.json({ ok: true, markets: pageItems, total, pageCount })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Server error' },
      { status: 500 }
    )
  }
}
