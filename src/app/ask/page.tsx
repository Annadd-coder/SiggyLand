'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ethers } from 'ethers'
import styles from './ask.module.css'
import { trackInteraction } from '@/lib/trackInteraction'

type Role = 'user' | 'assistant'
type Msg = { id: string; role: Role; text: string; ts?: number }
type Mode = 'ritual' | 'predict'
type MarketSort = 'volume' | 'liquidity' | 'end'
type TradeSide = 'BUY' | 'SELL'
type TradeOutcome = 'YES' | 'NO'
type QuickAction = {
  label: string
  prompt?: string
  onClick?: () => void
  disabledIfNoSelected?: boolean
}
type EthereumProvider = ethers.providers.ExternalProvider & {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>
}

type Market = {
  id: string
  question: string
  endTime: number
  endDate: string
  active: boolean
  resolved: boolean
  outcomeYes: boolean
  yesPrice: number
  volume: number
  b: number
}

const CHAT_KEY_PREDICT = 'siggy:chat:predict:v1'
const CHAT_KEY_RITUAL = 'siggy:chat:ritual:v1'
const MODE_KEY = 'siggy:ask:mode:v2'
const ASK_ACTIVITY_KEY = 'siggy:activity:ask:v1'
const MAX_ACTIVITY_EVENTS = 400
const MEMORY_MAX = 14
const MARKET_SORTS: readonly MarketSort[] = ['volume', 'liquidity', 'end']
const TRADE_OUTCOMES: readonly TradeOutcome[] = ['YES', 'NO']
const TRADE_SIDES: readonly TradeSide[] = ['BUY', 'SELL']

type AskActivityEvent =
  | {
      id: string
      ts: number
      kind: 'create'
      question: string
      endDate: string
      seedUsdc: number
    }
  | {
      id: string
      ts: number
      kind: 'trade'
      marketId: string
      question: string
      side: TradeSide
      outcome: TradeOutcome
      shares: number
      limitUsdc: number
    }
  | {
      id: string
      ts: number
      kind: 'redeem'
      marketId: string
      question: string
    }
  | {
      id: string
      ts: number
      kind: 'resolve'
      marketId: string
      question: string
      outcome: TradeOutcome
    }

const BASE_CHAIN_ID = 8453
const USDC_ADDRESS_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const MARKET_ADDRESS = process.env.NEXT_PUBLIC_PREDICT_MARKET_ADDRESS || ''
const B_DEFAULT = '500' // auto liquidity (b), user doesn't set it

const MARKET_ABI = [
  'function createMarket(string question,uint40 endTime,uint256 b,uint256 seedUsdc) returns (uint256)',
  'function buyYes(uint256 id,uint256 shares,uint256 maxCostUsdc)',
  'function buyNo(uint256 id,uint256 shares,uint256 maxCostUsdc)',
  'function sellYes(uint256 id,uint256 shares,uint256 minPayoutUsdc)',
  'function sellNo(uint256 id,uint256 shares,uint256 minPayoutUsdc)',
  'function resolveMarket(uint256 id,bool outcomeYes)',
  'function redeem(uint256 id)',
  'function owner() view returns (address)',
]

const ERC20_ABI = [
  'function allowance(address owner,address spender) view returns (uint256)',
  'function approve(address spender,uint256 amount) returns (bool)',
]

const GREETING_RITUAL: Msg = {
  id: 'hello-ritual',
  role: 'assistant',
  ts: Date.now(),
  text:
    "Welcome! I’m Siggy 😼 Think of me as a friendly map through Ritual.\n\nTell me what you’re building and I’ll help you pick the right blocks, avoid common mistakes, and move faster without the chaos.",
}

const GREETING_PREDICT: Msg = {
  id: 'hello-predict',
  role: 'assistant',
  ts: Date.now(),
  text:
    "Welcome! I’m Siggy 😼\n\nThis is Ritual Community Markets.\nPick a market on the left and I’ll break it down:\n• what YES/NO actually means\n• why the price looks like it does\n• what to watch before it ends\n• common traps in wording\n\nYou can also create your own market here.\n",
}

function greetingFor(mode: Mode): Msg {
  return mode === 'predict' ? GREETING_PREDICT : GREETING_RITUAL
}

function chatKeyFor(mode: Mode) {
  return mode === 'predict' ? CHAT_KEY_PREDICT : CHAT_KEY_RITUAL
}

function fmtCompact(n: number) {
  if (!Number.isFinite(n)) return '0'
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2).replace(/\.00$/, '') + 'B'
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(/\.00$/, '') + 'M'
  if (abs >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(Math.round(n))
}

function fmtDateShort(iso: string) {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return '—'
  const d = new Date(t)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
}

function fmtCountdown(iso: string) {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return '—'
  let s = Math.max(0, Math.floor((t - Date.now()) / 1000))
  const d = Math.floor(s / 86400)
  s -= d * 86400
  const h = Math.floor(s / 3600)
  s -= h * 3600
  const m = Math.floor(s / 60)
  s -= m * 60
  return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
}

function isMarketSort(value: string): value is MarketSort {
  return MARKET_SORTS.includes(value as MarketSort)
}

function isTradeOutcome(value: string): value is TradeOutcome {
  return TRADE_OUTCOMES.includes(value as TradeOutcome)
}

function isTradeSide(value: string): value is TradeSide {
  return TRADE_SIDES.includes(value as TradeSide)
}

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error.trim()) return error
  return fallback
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function getEthereumProvider(): EthereumProvider | null {
  if (typeof window === 'undefined') return null
  const ethereum = (window as Window & { ethereum?: unknown }).ethereum
  if (!ethereum || typeof ethereum !== 'object') return null
  const request = (ethereum as { request?: unknown }).request
  if (typeof request !== 'function') return null
  return ethereum as EthereumProvider
}

function makeActivityId() {
  return `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function appendAskActivity(event: AskActivityEvent) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(ASK_ACTIVITY_KEY)
    const parsed = raw ? parseJson<AskActivityEvent[]>(raw) : null
    const next = Array.isArray(parsed) ? [...parsed, event] : [event]
    localStorage.setItem(ASK_ACTIVITY_KEY, JSON.stringify(next.slice(-MAX_ACTIVITY_EVENTS)))
  } catch {}
}

export default function AskPage() {
  const inputId = useId()

  const [mode, setMode] = useState<Mode>('predict')

  const [qChat, setQChat] = useState('')
  const [loadingChat, setLoadingChat] = useState(false)
  const [errChat, setErrChat] = useState<string | null>(null)
  const [chat, setChat] = useState<Msg[]>([GREETING_PREDICT])

  // markets
  const [qMarkets, setQMarkets] = useState('')
  const [sort, setSort] = useState<MarketSort>('volume')
  const [activeOnly, setActiveOnly] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 8

  const [markets, setMarkets] = useState<Market[]>([])
  const [total, setTotal] = useState(0)
  const [pageCount, setPageCount] = useState(1)
  const [loadingMk, setLoadingMk] = useState(false)
  const [errMk, setErrMk] = useState<string | null>(null)

  const [selected, setSelected] = useState<Market | null>(null)
  const [mkNonce, setMkNonce] = useState(0)

  // create market
  const [createOpen, setCreateOpen] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')
  const [newEnd, setNewEnd] = useState('')
  const [newSeed, setNewSeed] = useState('400')
  const [createBusy, setCreateBusy] = useState(false)
  const [createErr, setCreateErr] = useState<string | null>(null)
  const [createOk, setCreateOk] = useState<string | null>(null)

  // trade
  const [tradeOpen, setTradeOpen] = useState(false)
  const [tradeSide, setTradeSide] = useState<TradeSide>('BUY')
  const [tradeOutcome, setTradeOutcome] = useState<TradeOutcome>('YES')
  const [tradeShares, setTradeShares] = useState('10')
  const [tradeLimit, setTradeLimit] = useState('')
  const [tradeBusy, setTradeBusy] = useState(false)
  const [tradeErr, setTradeErr] = useState<string | null>(null)
  const [tradeOk, setTradeOk] = useState<string | null>(null)

  // wallet
  const [walletAddr, setWalletAddr] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const signerRef = useRef<ethers.Signer | null>(null)
  const [marketOwner, setMarketOwner] = useState<string | null>(null)

  // restore mode (one time)
  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true

    try {
      const saved = localStorage.getItem(MODE_KEY)
      const m = saved === 'ritual' || saved === 'predict' ? saved : 'predict'
      setMode(m)
    } catch {}
  }, [])

  useEffect(() => {
    trackInteraction({ type: 'visit_ask', value: 1 })
    trackInteraction({ type: 'site_visit', value: 1, metadata: { page: 'ask' } })
  }, [])

  useEffect(() => {
    try { localStorage.setItem(MODE_KEY, mode) } catch {}
  }, [mode])

  useEffect(() => {
    try {
      const key = chatKeyFor(mode)
      const raw = localStorage.getItem(key)
      if (raw) {
        const saved = JSON.parse(raw) as Msg[]
        if (Array.isArray(saved) && saved.length) {
          setChat(saved)
          return
        }
      }
    } catch {}
    setChat([greetingFor(mode)])
  }, [mode])

  useEffect(() => {
    try {
      localStorage.setItem(chatKeyFor(mode), JSON.stringify(chat.slice(-80)))
    } catch {}
  }, [chat, mode])

  // scroll chat to bottom (only if user is near bottom)
  const endRef = useRef<HTMLDivElement | null>(null)
  const streamRef = useRef<HTMLDivElement | null>(null)
  const [isNearBottom, setIsNearBottom] = useState(true)

  function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
    const el = streamRef.current
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior })
      return
    }
    endRef.current?.scrollIntoView({ behavior, block: 'end' })
  }

  function onStreamScroll() {
    const el = streamRef.current
    if (!el) return
    const threshold = 140
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
    setIsNearBottom(near)
  }

  useEffect(() => {
    if (!isNearBottom) return
    scrollToBottom('smooth')
  }, [chat, loadingChat, isNearBottom])

  useEffect(() => {
    setIsNearBottom(true)
  }, [mode])

  useEffect(() => {
    async function loadOwner() {
      try {
        if (!MARKET_ADDRESS) return
        const rpc = process.env.NEXT_PUBLIC_BASE_RPC_URL
        const ethereum = getEthereumProvider()
        const provider = rpc
          ? new ethers.providers.JsonRpcProvider(rpc)
          : ethereum
            ? new ethers.providers.Web3Provider(ethereum)
            : null
        if (!provider) return
        const contract = new ethers.Contract(MARKET_ADDRESS, MARKET_ABI, provider)
        const owner = await contract.owner()
        setMarketOwner(owner)
      } catch {
        setMarketOwner(null)
      }
    }
    loadOwner()
  }, [walletAddr])

  // markets fetch
  const mkQuery = useMemo(() => {
    const p = new URLSearchParams()
    p.set('q', qMarkets.trim())
    p.set('sort', sort)
    p.set('activeOnly', activeOnly ? '1' : '0')
    p.set('page', String(page))
    p.set('pageSize', String(pageSize))
    p.set('_', String(mkNonce))
    return p.toString()
  }, [qMarkets, sort, activeOnly, page, pageSize, mkNonce])

  useEffect(() => {
    if (mode !== 'predict') return

    const controller = new AbortController()
    const t = setTimeout(async () => {
      try {
        setLoadingMk(true)
        setErrMk(null)

        const res = await fetch(`/ask/api/markets?${mkQuery}`, {
          cache: 'no-store',
          signal: controller.signal,
        })

        const data = (await res.json().catch(() => null)) as {
          ok?: boolean
          error?: string
          markets?: Market[]
          total?: number
          pageCount?: number
        } | null

        if (!res.ok || !data?.ok) {
          const msg = data?.error || `Markets request failed (${res.status})`
          throw new Error(msg)
        }

        setMarkets(Array.isArray(data.markets) ? data.markets : [])
        setTotal(Number(data.total || 0))
        setPageCount(Math.max(1, Number(data.pageCount || 1)))
      } catch (error: unknown) {
        if (isAbortError(error)) return
        setMarkets([])
        setTotal(0)
        setPageCount(1)
        setErrMk(toErrorMessage(error, 'Failed to load markets'))
      } finally {
        setLoadingMk(false)
      }
    }, 220)

    return () => {
      controller.abort()
      clearTimeout(t)
    }
  }, [mkQuery, mode])

  useEffect(() => {
    setPage(1)
    setSelected(null)
  }, [qMarkets, sort, activeOnly])

  useEffect(() => {
    if (!selected) return
    const basePrice = tradeOutcome === 'YES'
      ? selected.yesPrice
      : 1 - selected.yesPrice

    const shares = Number(tradeShares || 0)
    const est = Number.isFinite(shares) ? shares * basePrice : 0
    const bump = tradeSide === 'BUY' ? 1.02 : 0.98
    if (est > 0) setTradeLimit(String((est * bump).toFixed(4)))
  }, [selected, tradeOutcome, tradeSide, tradeShares])

  function resetHistory() {
    setChat([greetingFor(mode)])
    try { localStorage.removeItem(chatKeyFor(mode)) } catch {}
  }

  function switchMode(m: Mode) {
    setMode(m)
  }

  async function send(promptRaw?: string) {
    const prompt = (promptRaw ?? qChat).trim()
    if (!prompt || loadingChat) return

    setErrChat(null)
    setLoadingChat(true)

    const now = Date.now()
    const userMsg: Msg = { id: `u-${now}`, role: 'user', text: prompt, ts: now }
    const nextChat = [...chat, userMsg]
    setChat(nextChat)
    setIsNearBottom(true)
    if (!promptRaw) setQChat('')

    trackInteraction({ type: 'ask_prompt', value: 1, metadata: { mode } })

    const history = nextChat.slice(-MEMORY_MAX).map(m => ({ role: m.role, text: m.text }))

    try {
      const res = await fetch('/ask/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, history, mode }),
      })

      const rawText = await res.text()
      const data = parseJson<{ ok?: boolean; error?: string; reply?: string }>(rawText)

      if (!res.ok || !data?.ok) {
        const hint = data?.error || rawText?.slice(0, 180) || 'Request failed'
        throw new Error(hint)
      }

      const botMsg: Msg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        ts: Date.now(),
        text: String(data.reply ?? ''),
      }

      setChat(prev => [...prev, botMsg])
      trackInteraction({ type: 'ask_reply', value: 1, metadata: { mode } })
    } catch (error: unknown) {
      setErrChat(toErrorMessage(error, 'Network error'))
    } finally {
      setLoadingChat(false)
    }
  }

  function onChatKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      send()
    }
  }

  function explainSelected() {
    if (!selected) {
      const t = Date.now()
      setChat(prev => [
        ...prev,
        { id: `a-${t}`, role: 'assistant', ts: t, text: 'Pick a market on the left first 🙂' },
      ])
      return
    }

    const yesPct = Math.round((selected.yesPrice || 0) * 100)

    const prompt = [
      'Explain this prediction market in plain English.',
      '',
      `Question: ${selected.question}`,
      `Yes price: ~${yesPct}%`,
      `Volume: ${selected.volume}`,
      selected.endDate ? `End date: ${selected.endDate}` : '',
      '',
      'Give:',
      '- what exactly has to happen for YES to win (spell out edge cases)',
      '- what to verify (resolution source, wording traps, expiry quirks)',
      '- liquidity/volume quick read (how tradeable it is)',
      '- a short neutral watch list (what news/data would move it)',
      'No betting advice. Keep it clean and practical.',
    ].filter(Boolean).join('\n')

    send(prompt)
  }

  function describeBetSelected() {
    if (!selected) {
      const t = Date.now()
      setChat(prev => [
        ...prev,
        { id: `a-${t}`, role: 'assistant', ts: t, text: 'Pick a market on the left first 🙂' },
      ])
      return
    }

    const yesPct = Math.round((selected.yesPrice || 0) * 100)
    const prompt = [
      'Объясни ставку простыми словами.',
      '',
      `Вопрос: ${selected.question}`,
      `Текущий YES: ~${yesPct}%`,
      selected.endDate ? `Дата конца: ${selected.endDate}` : '',
      '',
      'Скажи:',
      '- что именно значит YES и NO',
      '- почему сейчас такая цена (по смыслу, без советов)',
      '- на что смотреть, чтобы понять исход',
      'Коротко и ясно.',
    ].filter(Boolean).join('\\n')

    send(prompt)
  }

  async function connectWallet() {
    const eth = getEthereumProvider()
    if (!eth) {
      throw new Error('Install a wallet (MetaMask) to continue.')
    }

    const provider = new ethers.providers.Web3Provider(eth)
    await provider.send('eth_requestAccounts', [])
    const signer = provider.getSigner()
    const address = await signer.getAddress()
    const net = await provider.getNetwork()

    signerRef.current = signer
    setWalletAddr(address)
    setChainId(net.chainId)

    return { signer, address, chainId: net.chainId }
  }

  async function ensureBase() {
    const eth = getEthereumProvider()
    if (!eth) return false
    try {
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x2105' }] })
      return true
    } catch (error: unknown) {
      throw new Error(toErrorMessage(error, 'Please switch to Base (chainId 8453).'))
    }
  }

  async function getSigner() {
    let signer = signerRef.current
    let cid = chainId
    if (!signer || !cid) {
      const res = await connectWallet()
      signer = res.signer
      cid = res.chainId
    }
    if (cid !== BASE_CHAIN_ID) {
      await ensureBase()
    }
    return signer as ethers.Signer
  }

  async function ensureAllowance(signer: ethers.Signer, amount: ethers.BigNumber) {
    if (!MARKET_ADDRESS) throw new Error('Missing NEXT_PUBLIC_PREDICT_MARKET_ADDRESS')
    const owner = await signer.getAddress()
    const usdc = new ethers.Contract(USDC_ADDRESS_BASE, ERC20_ABI, signer)
    const allowance: ethers.BigNumber = await usdc.allowance(owner, MARKET_ADDRESS)
    if (allowance.gte(amount)) return
    const tx = await usdc.approve(MARKET_ADDRESS, amount)
    await tx.wait()
  }

  async function onCreateMarket() {
    try {
      setCreateErr(null)
      setCreateOk(null)
      setCreateBusy(true)

      if (!MARKET_ADDRESS) throw new Error('Missing NEXT_PUBLIC_PREDICT_MARKET_ADDRESS')
      const question = newQuestion.trim()
      if (!question) throw new Error('Question is required')
      if (!newEnd) throw new Error('End date is required')

      const endTs = Math.floor(new Date(newEnd).getTime() / 1000)
      if (!Number.isFinite(endTs) || endTs <= Date.now() / 1000) throw new Error('End date must be in the future')

      const seed = ethers.utils.parseUnits(newSeed || '0', 6)
      const b = ethers.utils.parseUnits(B_DEFAULT, 18)
      const signer = await getSigner()
      await ensureAllowance(signer, seed)

      const contract = new ethers.Contract(MARKET_ADDRESS, MARKET_ABI, signer)
      const tx = await contract.createMarket(question, endTs, b, seed)
      await tx.wait()

      const seedUsdc = Number(newSeed || '0')
      appendAskActivity({
        id: makeActivityId(),
        ts: Date.now(),
        kind: 'create',
        question,
        endDate: newEnd,
        seedUsdc: Number.isFinite(seedUsdc) ? seedUsdc : 0,
      })
      trackInteraction({
        type: 'market_create',
        value: 1,
        metadata: { question, seedUsdc: Number.isFinite(seedUsdc) ? seedUsdc : 0 },
      })

      setCreateOk('Market created')
      setNewQuestion('')
      setMkNonce(n => n + 1)
    } catch (error: unknown) {
      setCreateErr(toErrorMessage(error, 'Create failed'))
    } finally {
      setCreateBusy(false)
    }
  }

  async function onTrade() {
    try {
      setTradeErr(null)
      setTradeOk(null)
      setTradeBusy(true)

      if (!selected) throw new Error('Select a market first')
      if (!MARKET_ADDRESS) throw new Error('Missing NEXT_PUBLIC_PREDICT_MARKET_ADDRESS')

      const signer = await getSigner()
      const contract = new ethers.Contract(MARKET_ADDRESS, MARKET_ABI, signer)

      const shares = ethers.utils.parseUnits(tradeShares || '0', 18)
      const limit = ethers.utils.parseUnits(tradeLimit || '0', 6)
      if (shares.lte(0)) throw new Error('Shares must be > 0')
      if (limit.lte(0)) throw new Error('Limit must be > 0')

      if (tradeSide === 'BUY') {
        await ensureAllowance(signer, limit)
        const tx = tradeOutcome === 'YES'
          ? await contract.buyYes(selected.id, shares, limit)
          : await contract.buyNo(selected.id, shares, limit)
        await tx.wait()
      } else {
        const tx = tradeOutcome === 'YES'
          ? await contract.sellYes(selected.id, shares, limit)
          : await contract.sellNo(selected.id, shares, limit)
        await tx.wait()
      }

      const sharesNum = Number(tradeShares || '0')
      const limitNum = Number(tradeLimit || '0')
      appendAskActivity({
        id: makeActivityId(),
        ts: Date.now(),
        kind: 'trade',
        marketId: selected.id,
        question: selected.question,
        side: tradeSide,
        outcome: tradeOutcome,
        shares: Number.isFinite(sharesNum) ? sharesNum : 0,
        limitUsdc: Number.isFinite(limitNum) ? limitNum : 0,
      })
      trackInteraction({
        type: 'market_trade',
        value: 1,
        metadata: {
          marketId: selected.id,
          question: selected.question,
          side: tradeSide,
          outcome: tradeOutcome,
          shares: Number.isFinite(sharesNum) ? sharesNum : 0,
          notional: Number.isFinite(limitNum) ? limitNum : 0,
        },
      })

      setTradeOk('Trade sent')
      setMkNonce(n => n + 1)
    } catch (error: unknown) {
      setTradeErr(toErrorMessage(error, 'Trade failed'))
    } finally {
      setTradeBusy(false)
    }
  }

  async function onRedeem() {
    try {
      setTradeErr(null)
      setTradeOk(null)
      setTradeBusy(true)
      if (!selected) throw new Error('Select a market first')
      if (!MARKET_ADDRESS) throw new Error('Missing NEXT_PUBLIC_PREDICT_MARKET_ADDRESS')

      const signer = await getSigner()
      const contract = new ethers.Contract(MARKET_ADDRESS, MARKET_ABI, signer)
      const tx = await contract.redeem(selected.id)
      await tx.wait()

      appendAskActivity({
        id: makeActivityId(),
        ts: Date.now(),
        kind: 'redeem',
        marketId: selected.id,
        question: selected.question,
      })
      trackInteraction({
        type: 'market_redeem',
        value: 1,
        metadata: { marketId: selected.id, question: selected.question },
      })

      setTradeOk('Redeemed')
      setMkNonce(n => n + 1)
    } catch (error: unknown) {
      setTradeErr(toErrorMessage(error, 'Redeem failed'))
    } finally {
      setTradeBusy(false)
    }
  }

  async function onResolveMarket() {
    try {
      setTradeErr(null)
      setTradeOk(null)
      setTradeBusy(true)
      if (!selected) throw new Error('Select a market first')
      if (!MARKET_ADDRESS) throw new Error('Missing NEXT_PUBLIC_PREDICT_MARKET_ADDRESS')

      const signer = await getSigner()
      const contract = new ethers.Contract(MARKET_ADDRESS, MARKET_ABI, signer)
      const tx = await contract.resolveMarket(selected.id, tradeOutcome === 'YES')
      await tx.wait()

      appendAskActivity({
        id: makeActivityId(),
        ts: Date.now(),
        kind: 'resolve',
        marketId: selected.id,
        question: selected.question,
        outcome: tradeOutcome,
      })
      trackInteraction({
        type: 'market_resolve',
        value: 1,
        metadata: {
          marketId: selected.id,
          question: selected.question,
          outcome: tradeOutcome,
        },
      })

      setTradeOk('Resolved')
      setMkNonce(n => n + 1)
    } catch (error: unknown) {
      setTradeErr(toErrorMessage(error, 'Resolution failed'))
    } finally {
      setTradeBusy(false)
    }
  }

  const quickPredict: QuickAction[] = [
    { label: 'Explain selected market', onClick: () => explainSelected(), disabledIfNoSelected: true },
    { label: 'Описание ставки', onClick: () => describeBetSelected(), disabledIfNoSelected: true },
    { label: 'How to read Yes %', prompt: 'How do I interpret the Yes price in prediction markets?' },
    { label: 'Risk checklist', prompt: 'Give me a practical risk checklist for prediction markets.' },
    { label: 'Explain price move', prompt: 'Why did this market price move? What are the most common reasons?' },
  ]

  const quickRitual: QuickAction[] = [
    { label: 'What is Ritual?', prompt: 'Explain Ritual in simple terms and how it differs from typical L1/L2.' },
    { label: 'Smart Agents', prompt: 'Explain Smart Agents on Ritual and what problems they solve.' },
    { label: 'Scheduled tx', prompt: 'How do Scheduled Transactions work, and what are safe patterns for them?' },
  ]

  const chatPlaceholder = mode === 'predict'
    ? 'Ask for an explanation, risks, or price move…'
    : 'Ask about Ritual, Smart Agents, or scheduled tx…'

  const passport = useMemo(() => {
    if (mode !== 'predict' || !selected) return null
    const yesPct = Math.round((selected.yesPrice || 0) * 100)

    return {
      yesPct,
      endShort: fmtDateShort(selected.endDate),
      daysLeft: fmtCountdown(selected.endDate),
      question: selected.question,
      active: selected.active,
      vol: selected.volume,
    }
  }, [mode, selected])

  const isAdmin = Boolean(
    walletAddr &&
    marketOwner &&
    walletAddr.toLowerCase() === marketOwner.toLowerCase()
  )

  return (
    <main className={`pageRoot ${styles.page} skinAsk skinAskBlue`}>
      <div className={`max ${styles.shell}`}>
        <div className={styles.headerRow}>
          <div className={styles.brandLeft}>
            <div className={styles.siggyMark} aria-hidden>
              <svg viewBox="0 0 32 32" width="24" height="24">
                <circle cx="16" cy="16" r="12" />
                <path d="M10 18h12M12 14h8" stroke="#06110D" strokeWidth="2.6" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className={styles.title}>Ask Siggy</h1>
            <span className={styles.badgeBeta}>BETA</span>
            <span className={styles.dotOnline} aria-label="online" />
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={`${styles.modePill} ${mode === 'ritual' ? styles.modeOn : ''}`}
              onClick={() => switchMode('ritual')}
              aria-pressed={mode === 'ritual'}
              title="Just chat with Siggy"
            >
              💬 Ritual
            </button>

            <button
              type="button"
              className={`${styles.modePill} ${mode === 'predict' ? styles.modeOn : ''}`}
              onClick={() => switchMode('predict')}
              aria-pressed={mode === 'predict'}
              title="Prediction markets"
            >
              📈 Predict
            </button>

            <Link href="/" data-softnav="1" className={styles.pillLink}>← Home</Link>
            <Link href="/profile" data-softnav="1" className={styles.pillLink}>Profile</Link>

            <button
              type="button"
              className={`${styles.pillLink} ${styles.ghost}`}
              onClick={resetHistory}
            >
              Reset
            </button>
          </div>
        </div>

        <section className={styles.card} aria-live="polite">
          <div className={styles.bodyGrid} style={mode === 'ritual' ? { gridTemplateColumns: '1fr' } : undefined}>
            {mode === 'predict' && (
              <div className={`${styles.panel} ${styles.marketsPanel}`}>
                <div className={styles.panelHead}>
                  <div className={styles.panelTitleRow}>
                    <div className={styles.panelTitle}>Ritual community markets (yes/no)</div>
                    <div className={styles.panelMeta}>
                      {loadingMk ? 'Loading…' : `${total} total • ${markets.length} shown`}
                    </div>
                  </div>

                  <div className={styles.panelTip}>
                    Create a market → add seed → trade YES/NO with USDC.
                  </div>

                  <div className={styles.filters}>
                    <input
                      className={styles.search}
                      value={qMarkets}
                      onChange={(e) => setQMarkets(e.target.value)}
                      placeholder="Search markets…"
                    />

                    <div className={styles.controlsRow}>
                      <div className={styles.selectWrap}>
                        <span className={styles.selectLabel}>Sort:</span>
                        <select
                          className={styles.select}
                          value={sort}
                          onChange={(e) => {
                            const next = e.target.value
                            if (isMarketSort(next)) setSort(next)
                          }}
                        >
                          <option value="volume">volume</option>
                          <option value="liquidity">liquidity</option>
                          <option value="end">end</option>
                        </select>
                      </div>

                      <label className={styles.check}>
                        <input
                          type="checkbox"
                          checked={activeOnly}
                          onChange={(e) => setActiveOnly(e.target.checked)}
                        />
                        Active only
                      </label>

                      <button
                        className={styles.refreshBtn}
                        onClick={() => setMkNonce(n => n + 1)}
                        title="Refresh"
                        disabled={loadingMk}
                      >
                        ↻
                      </button>
                    </div>

                    <div className={styles.toolsRow}>
                      <button
                        type="button"
                        className={`${styles.toolBtn} ${createOpen ? styles.toolOn : ''}`}
                        onClick={() => setCreateOpen(v => !v)}
                      >
                        + Create market
                      </button>

                      <button
                        type="button"
                        className={`${styles.toolBtn} ${tradeOpen ? styles.toolOn : ''}`}
                        onClick={() => setTradeOpen(v => !v)}
                        disabled={!selected}
                      >
                        Trade
                      </button>

                      {walletAddr && (
                        <span className={styles.walletPill}>🧩 {walletAddr.slice(0, 6)}…{walletAddr.slice(-4)}</span>
                      )}
                    </div>

                    {createOpen && (
                      <div className={styles.createBox}>
                        <div className={styles.createRow}>
                          <label className={styles.createField}>
                            <span>Question</span>
                            <input
                              className={styles.createInput}
                              value={newQuestion}
                              onChange={(e) => setNewQuestion(e.target.value)}
                              placeholder="Will X happen by Y?"
                            />
                          </label>

                          <label className={styles.createField}>
                            <span>End date</span>
                            <input
                              className={styles.createInput}
                              type="datetime-local"
                              value={newEnd}
                              onChange={(e) => setNewEnd(e.target.value)}
                            />
                          </label>
                        </div>

                        <div className={styles.createRow}>
                            <label className={styles.createField}>
                              <span>Seed (USDC)</span>
                              <input
                                className={styles.createInput}
                                value={newSeed}
                                onChange={(e) => setNewSeed(e.target.value)}
                                placeholder="400"
                              />
                            </label>

                          </div>

                        <div className={styles.createActions}>
                          <button
                            type="button"
                            className={styles.tradeBtn}
                            onClick={onCreateMarket}
                            disabled={createBusy}
                          >
                            {createBusy ? 'Creating…' : 'Create'}
                          </button>
                          {createErr && <span className={styles.createErr}>{createErr}</span>}
                          {createOk && <span className={styles.createOk}>{createOk}</span>}
                        </div>
                      </div>
                    )}

                    <div className={styles.selectedBar}>
                        <div className={styles.selectedMini}>
                          {passport ? (
                            <>
                              <span className={styles.badgeMini}>Selected</span>
                              <span className={`${styles.badgeMini} ${styles.badgeYes}`}>
                                Yes {passport.yesPct}%
                              </span>
                              <span className={styles.badgeMini}>{passport.active ? 'Active' : 'Closed'}</span>
                              <span className={styles.badgeMini}>Ends {passport.endShort}</span>
                              <span className={styles.badgeMini}>{passport.daysLeft}</span>
                              <span className={styles.badgeMini}>Vol {fmtCompact(passport.vol)}</span>
                            </>
                          ) : (
                            <span className={styles.badgeMini}>Select a market to enable actions</span>
                          )}
                        </div>

                      <div className={styles.selectedActions}>
                        <button
                          className={styles.selBtn}
                          onClick={explainSelected}
                          disabled={!selected}
                        >
                          Explain
                        </button>
                        <button
                          className={`${styles.selBtn} ${styles.selBtnGhost}`}
                          onClick={describeBetSelected}
                          disabled={!selected}
                        >
                          Описание ставки
                        </button>
                        <button
                          className={`${styles.selBtn} ${styles.selBtnGhost}`}
                          onClick={() => setTradeOpen(v => !v)}
                          disabled={!selected}
                        >
                          Trade
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.listWrap}>
                  {tradeOpen && (
                    <div className={styles.tradeDrawer}>
                <div className={styles.tradeHead}>
                  <div className={styles.tradeTitle}>Trade (USDC)</div>
                        <div className={styles.tradeActions}>
                          <button
                            type="button"
                            className={styles.compareBtn}
                            onClick={() => setTradeOpen(false)}
                          >
                            Close
                          </button>
                        </div>
                      </div>

                      {!selected ? (
                        <div className={styles.compareEmpty}>Select a market first.</div>
                      ) : (
                        <>
                          <div className={styles.tradeMeta}>
                            <div className={styles.tradeQ}>{selected.question}</div>
                            <div className={styles.tradeSub}>
                              Yes {Math.round((selected.yesPrice || 0) * 100)}%
                            </div>
                          </div>

                          <div className={styles.tradeGrid}>
                            <label className={styles.tradeField}>
                              <span>Outcome</span>
                              <select
                                className={styles.tradeSelect}
                                value={tradeOutcome}
                                onChange={(e) => {
                                  const next = e.target.value
                                  if (isTradeOutcome(next)) setTradeOutcome(next)
                                }}
                              >
                                <option value="YES">YES</option>
                                <option value="NO">NO</option>
                              </select>
                            </label>

                            <label className={styles.tradeField}>
                              <span>Side</span>
                              <select
                                className={styles.tradeSelect}
                                value={tradeSide}
                                onChange={(e) => {
                                  const next = e.target.value
                                  if (isTradeSide(next)) setTradeSide(next)
                                }}
                              >
                                <option value="BUY">BUY</option>
                                <option value="SELL">SELL</option>
                              </select>
                            </label>

                            <label className={styles.tradeField}>
                              <span>Shares</span>
                              <input
                                className={styles.tradeInput}
                                value={tradeShares}
                                onChange={(e) => setTradeShares(e.target.value)}
                                inputMode="decimal"
                                placeholder="10"
                              />
                            </label>

                            <label className={styles.tradeField}>
                              <span>{tradeSide === 'BUY' ? 'Max cost (USDC)' : 'Min payout (USDC)'}</span>
                              <input
                                className={styles.tradeInput}
                                value={tradeLimit}
                                onChange={(e) => setTradeLimit(e.target.value)}
                                inputMode="decimal"
                                placeholder="1.5"
                              />
                            </label>
                          </div>

                          <div className={styles.tradeActionsRow}>
                            {!walletAddr ? (
                              <button
                                type="button"
                                className={styles.tradeBtn}
                                onClick={async () => {
                                  try {
                                    await connectWallet()
                                  } catch (error: unknown) {
                                    setTradeErr(toErrorMessage(error, 'Wallet error'))
                                  }
                                }}
                                disabled={tradeBusy}
                              >
                                Connect wallet
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={styles.tradeBtn}
                                onClick={onTrade}
                                disabled={tradeBusy}
                              >
                                {tradeBusy ? 'Sending…' : tradeSide === 'BUY' ? 'Buy' : 'Sell'}
                              </button>
                            )}

                            {selected.resolved && (
                              <button
                                type="button"
                                className={styles.tradeBtnGhost}
                                onClick={onRedeem}
                                disabled={tradeBusy}
                              >
                                Redeem
                              </button>
                            )}

                            {!selected.active && !selected.resolved && isAdmin && (
                              <button
                                type="button"
                                className={styles.tradeBtnGhost}
                                onClick={onResolveMarket}
                                disabled={tradeBusy}
                              >
                                Resolve (admin)
                              </button>
                            )}
                          </div>

                          {tradeErr && <div className={styles.tradeErr}>{tradeErr}</div>}
                          {tradeOk && <div className={styles.tradeOk}>{tradeOk}</div>}
                        </>
                      )}
                    </div>
                  )}

                  {loadingMk ? (
                    <div className={styles.skelList}>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div className={styles.skelRow} key={i} />
                      ))}
                    </div>
                  ) : errMk ? (
                    <div className={styles.emptyErr}>
                      {errMk}
                      <div className={styles.emptySub}>
                        Check BASE_RPC_URL + PREDICT_MARKET_ADDRESS.
                      </div>
                    </div>
                  ) : markets.length === 0 ? (
                    <div className={styles.empty}>
                      Nothing found. Try a different search.
                    </div>
                  ) : (
                    <div className={styles.marketList}>
                      {markets.map((m) => {
                        const yes = Math.round((m.yesPrice || 0) * 100)
                        const on = selected?.id === m.id
                        return (
                          <button
                            key={m.id}
                            className={`${styles.marketRow} ${on ? styles.marketOn : ''}`}
                            onClick={() => setSelected(m)}
                            type="button"
                          >
                            <div className={styles.marketTop}>
                              <span className={styles.heat} aria-hidden>🔥</span>
                              <div className={styles.marketQ}>{m.question}</div>
                            </div>

                            <div className={styles.badges}>
                              <span className={`${styles.badge} ${styles.badgeYes}`}>Yes {yes}%</span>
                              <span className={styles.badge}>Vol {fmtCompact(m.volume)}</span>
                              <span className={styles.badge}>{m.active ? 'Active' : 'Closed'}</span>
                              {m.resolved && <span className={styles.badge}>Resolved {m.outcomeYes ? 'YES' : 'NO'}</span>}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className={styles.panelFoot}>
                  <div className={styles.pager}>
                    <button
                      className={styles.pagerBtn}
                      disabled={page <= 1 || loadingMk}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                      ← Prev
                    </button>

                    <div className={styles.pagerMid}>
                      Page {page} / {pageCount}
                    </div>

                    <button
                      className={styles.pagerBtn}
                      disabled={page >= pageCount || loadingMk}
                      onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                    >
                      Next →
                    </button>
                  </div>

                  <div className={styles.hintLine}>
                    Select a market to trade or explain.
                  </div>
                </div>
              </div>
            )}

            <div className={`${styles.panel} ${styles.chatPanel}`}>
              <div className={styles.chatTopBar}>
                <button
                  type="button"
                  className={`${styles.modePill} ${mode === 'ritual' ? styles.modeOn : ''}`}
                  onClick={() => switchMode('ritual')}
                  aria-pressed={mode === 'ritual'}
                  title="Just chat with Siggy"
                >
                  💬 Chat
                </button>

                <button
                  type="button"
                  className={`${styles.modePill} ${mode === 'predict' ? styles.modeOn : ''}`}
                  onClick={() => switchMode('predict')}
                  aria-pressed={mode === 'predict'}
                  title="Prediction markets"
                >
                  📈 Predict
                </button>

                <button
                  type="button"
                  className={`${styles.modePill} ${styles.ghost}`}
                  onClick={resetHistory}
                  title="Reset chat"
                >
                  Reset chat
                </button>
              </div>

              <div className={styles.stream} ref={streamRef} onScroll={onStreamScroll}>
                {chat.map(m => <Message key={m.id} role={m.role} text={m.text} ts={m.ts} />)}
                {loadingChat && <BotTyping />}
                <div ref={endRef} />
              </div>

              {!isNearBottom && (
                <div className={styles.jumpWrap}>
                  <button
                    type="button"
                    className={styles.jumpBtn}
                    onClick={() => {
                      scrollToBottom('smooth')
                      setIsNearBottom(true)
                    }}
                  >
                    Jump to latest ↓
                  </button>
                </div>
              )}

              <div className={styles.quickWrap}>
                {(mode === 'predict' ? quickPredict : quickRitual).map((it) => {
                  const disabled =
                    loadingChat ||
                    (it.disabledIfNoSelected ? !selected : false)

                  return (
                    <button
                      type="button"
                      key={it.label}
                      className={styles.quick}
                      onClick={() => {
                        if (it.onClick) return it.onClick()
                        if (it.prompt) return send(it.prompt)
                      }}
                      disabled={disabled}
                    >
                      <span className={styles.quickPaw} aria-hidden>🐾</span>
                      {it.label}
                    </button>
                  )
                })}
              </div>

              <div className={styles.composerWrap}>
                <label htmlFor={inputId} className={styles.srOnly}>Type your question</label>

                <div className={styles.composer}>
                  <div className={styles.paw} aria-hidden>
                    <svg viewBox="0 0 24 24">
                      <circle cx="6" cy="7" r="3" />
                      <circle cx="12" cy="5" r="3" />
                      <circle cx="18" cy="7" r="3" />
                      <path d="M12 10c-4.2 0-6 3.3-6 5 0 2 1.8 3 6 3s6-1 6-3c0-1.7-1.8-5-6-5z" />
                    </svg>
                  </div>

                  <input
                    id={inputId}
                    className={styles.input}
                    placeholder={chatPlaceholder}
                    value={qChat}
                    onChange={e => setQChat(e.target.value)}
                    onKeyDown={onChatKeyDown}
                    autoFocus
                  />

                  <button
                    className={styles.send}
                    onClick={() => send()}
                    disabled={loadingChat || !qChat.trim()}
                    aria-label="Send"
                  >
                    {loadingChat ? <span className={styles.spin} aria-hidden /> : (
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                        <path d="M3 11.5l17-8-6.5 17-2.5-5.5-5.5-3.5z" />
                      </svg>
                    )}
                  </button>
                </div>

                {errChat && <div className={styles.err} role="alert">{errChat}</div>}

                <div className={styles.footerLine}>
                  <span>Private, local prototype.</span>
                  <span className={styles.sep} aria-hidden>•</span>
                  {mode === 'predict'
                    ? <span>Predict mode. Ritual community markets + explanations.</span>
                    : <span>Ritual mode. Assistant chat.</span>}
                  <span className={styles.sep} aria-hidden>•</span>
                  <span className={styles.hintKey}>Press <kbd>Enter</kbd> to send</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function Message({ role, text, ts }: { role: Role; text: string; ts?: number }) {
  const time = ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div className={`${styles.msg} ${role === 'user' ? styles.mUser : styles.mBot}`}>
      {role === 'assistant' && (
        <div className={styles.msgAva} aria-hidden>
          <svg viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="12" />
            <path d="M10 18h12M12 14h8" stroke="#06110D" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </div>
      )}
      <div className={styles.bubble}>
        {String(text).split('\n').map((line, i) => <p key={i}>{line}</p>)}
        <div className={styles.meta} aria-hidden>{time}</div>
        <i className={styles.tail} aria-hidden />
      </div>
    </div>
  )
}

function BotTyping() {
  return (
    <div className={`${styles.msg} ${styles.mBot}`} aria-live="polite" role="status">
      <div className={styles.msgAva} aria-hidden>
        <svg viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="12" />
          <path d="M10 18h12M12 14h8" stroke="#06110D" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </div>
      <div className={`${styles.bubble} ${styles.typing}`}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
        <i className={styles.tail} aria-hidden />
      </div>
    </div>
  )
}
