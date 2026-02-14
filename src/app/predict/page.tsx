// src/app/predict/page.tsx
'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import styles from './predict.module.css'

type Role = 'user' | 'assistant'
type Mode = 'ritual' | 'predict'
type Msg = { id: string; role: Role; text: string; ts?: number }
type MarketSort = 'volume' | 'liquidity' | 'end'

type Market = {
  id: string
  question: string
  slug?: string
  url?: string
  volume: number
  liquidity: number
  endDate?: string
  yesPrice: number
}

const CHAT_KEY = 'siggy:chat:v0'
const MODE_KEY = 'siggy:ask:mode:v1'
const MEMORY_MAX = 14
const MARKET_SORTS: readonly MarketSort[] = ['volume', 'liquidity', 'end']

function isMarketSort(value: string): value is MarketSort {
  return MARKET_SORTS.includes(value as MarketSort)
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

function makeGreeting(): Msg {
  return {
    id: 'hello',
    role: 'assistant',
    // ts специально не ставим, чтобы не ловить SSR/гидрацию по времени
    text:
      "Welcome! I’m Siggy 😼 Think of me as a friendly map through Ritual. I can explain things simply, help you choose the right building blocks, and give you practical steps when you’re stuck. Tell me what you’re building, or just ask a question to start.",
  }
}

export default function AskPage() {
  const inputId = useId()
  const [mounted, setMounted] = useState(false)

  const [mode, setMode] = useState<Mode>('ritual')

  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [chat, setChat] = useState<Msg[]>(() => [makeGreeting()])

  // Predict UI state
  const [markets, setMarkets] = useState<Market[]>([])
  const [mLoading, setMLoading] = useState(false)
  const [mErr, setMErr] = useState<string | null>(null)
  const [mQuery, setMQuery] = useState('')
  const [mSort, setMSort] = useState<MarketSort>('volume')
  const [mActiveOnly, setMActiveOnly] = useState(true)
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)

  useEffect(() => setMounted(true), [])

  // restore mode
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY)
      if (saved === 'predict' || saved === 'ritual') setMode(saved)
    } catch {}
  }, [])

  // persist mode
  useEffect(() => {
    try { localStorage.setItem(MODE_KEY, mode) } catch {}
  }, [mode])

  // restore chat history
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHAT_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Msg[]
        if (Array.isArray(saved) && saved.length) setChat(saved)
      }
    } catch {}
  }, [])

  // persist history
  useEffect(() => {
    try {
      const capped = chat.slice(-60)
      localStorage.setItem(CHAT_KEY, JSON.stringify(capped))
    } catch {}
  }, [chat])

  // load markets when Predict is on
  useEffect(() => {
    if (mode !== 'predict') return

    let alive = true
    async function load() {
      setMErr(null)
      setMLoading(true)
      try {
        const qs = new URLSearchParams()
        if (mQuery.trim()) qs.set('q', mQuery.trim())
        qs.set('sort', mSort)
        qs.set('activeOnly', mActiveOnly ? '1' : '0')
        qs.set('limit', '30')

        const res = await fetch(`/predict/api/markets?${qs.toString()}`)
        const rawText = await res.text()
        const data = parseJson<{ ok?: boolean; error?: string; markets?: Market[] }>(rawText)

        if (!res.ok || !data?.ok) {
          const hint = data?.error || rawText?.slice(0, 180) || 'Markets request failed'
          throw new Error(hint)
        }

        if (!alive) return
        setMarkets(Array.isArray(data.markets) ? data.markets : [])
      } catch (error: unknown) {
        if (!alive) return
        setMErr(toErrorMessage(error, 'Failed to load markets'))
        setMarkets([])
      } finally {
        if (!alive) return
        setMLoading(false)
      }
    }

    load()
    return () => { alive = false }
  }, [mode, mQuery, mSort, mActiveOnly])

  const endRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [chat, loading])

  async function send(promptRaw?: string) {
    const prompt = (promptRaw ?? q).trim()
    if (!prompt || loading) return

    setErr(null)
    setLoading(true)

    const now = Date.now()
    const userMsg: Msg = { id: `u-${now}`, role: 'user', text: prompt, ts: now }

    const nextChat = [...chat, userMsg]
    setChat(nextChat)
    if (!promptRaw) setQ('')

    const history = nextChat
      .slice(-MEMORY_MAX)
      .map(m => ({ role: m.role, text: m.text }))

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
    } catch (error: unknown) {
      setErr(toErrorMessage(error, 'Network error'))
    } finally {
      setLoading(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      send()
    }
  }

  const ritualQuick = useMemo(() => ([
    {
      label: 'What is Ritual?',
      href: 'https://www.ritualfoundation.org/docs/overview/what-is-ritual',
      reply:
        'Start here for the big picture: https://www.ritualfoundation.org/docs/overview/what-is-ritual',
      prompt: 'What is Ritual?',
    },
    {
      label: 'Smart Agents',
      href: 'https://www.ritualfoundation.org/docs/build-on-ritual/tutorials/smart-agents',
      reply:
        'Smart Agents tutorial: https://www.ritualfoundation.org/docs/build-on-ritual/tutorials/smart-agents',
      prompt: 'How do Smart Agents work?',
    },
    {
      label: 'Docs & Repos',
      href: 'https://links.ritual.tools',
      reply: 'Docs & repos map: https://links.ritual.tools',
      prompt: 'Docs / repos, please',
    },
  ] as const), [])

  const predictQuick = useMemo(() => ([
    {
      label: 'How to read markets?',
      prompt: 'Teach me how to read a prediction market like a grown-up. What matters first?',
    },
    {
      label: 'Risk checklist',
      prompt: 'Give me a simple risk checklist for Polymarket markets. No fluff.',
    },
    {
      label: 'Find good markets',
      prompt: 'How do I spot high-quality markets (liquidity, volume, bad incentives, weird resolution)?',
    },
  ] as const), [])

  const onQuickRitual = (qItem: typeof ritualQuick[number]) => (e: React.MouseEvent) => {
    e.preventDefault()
    const t = Date.now()
    setChat(prev => [
      ...prev,
      { id: `u-${t}`, role: 'user', text: qItem.prompt, ts: t },
      { id: `a-${t + 1}`, role: 'assistant', text: qItem.reply, ts: t + 1 },
    ])
    window.open(qItem.href, '_blank', 'noopener,noreferrer')
  }

  const onQuickPredict = (prompt: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    send(prompt)
  }

  const resetHistory = () => {
    setChat([makeGreeting()])
    setSelectedMarket(null)
    try { localStorage.removeItem(CHAT_KEY) } catch {}
  }

  const askAboutMarket = (m: Market) => {
    const yesPct = Math.round(m.yesPrice * 100)
    const vol = Math.round(m.volume)
    const liq = Math.round(m.liquidity)

    const msg =
      `Explain this market in plain English.\n` +
      `Question: ${m.question}\n` +
      `Yes price: ~${yesPct}%\n` +
      `Volume: ${vol}\n` +
      `Liquidity: ${liq}\n` +
      (m.endDate ? `End date: ${m.endDate}\n` : '') +
      (m.url ? `Link: ${m.url}\n` : '') +
      `Now tell me: what matters here, what could go wrong, and what I should watch before I act.`

    send(msg)
  }

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
            <div className="modePills" role="tablist" aria-label="Mode">
              <button
                type="button"
                className={`modePill ${mode === 'ritual' ? 'on' : ''}`}
                role="tab"
                aria-selected={mode === 'ritual'}
                onClick={() => setMode('ritual')}
              >
                Ritual
              </button>
              <button
                type="button"
                className={`modePill ${mode === 'predict' ? 'on' : ''}`}
                role="tab"
                aria-selected={mode === 'predict'}
                onClick={() => setMode('predict')}
              >
                Predict
              </button>
            </div>

            <Link href="/" data-softnav="1" className={styles.pillLink}>← Home</Link>
            <button className={`${styles.pillLink} ${styles.ghost}`} onClick={resetHistory} aria-label="Reset chat history">
              Reset
            </button>
          </div>
        </div>

        {/* ===== Predict layout (markets + chat) ===== */}
        {mode === 'predict' ? (
          <section className="predictGrid" aria-live="polite">
            {/* Left: Markets */}
            <div className="marketPane">
              <div className="marketTop">
                <div className="marketTitleRow">
                  <div className="marketTitle">Polymarket markets</div>
                  <div className="marketMeta">
                    {mLoading ? 'Loading…' : `${markets.length} shown`}
                  </div>
                </div>

                <div className="marketControls">
                  <input
                    className="marketSearch"
                    placeholder="Search markets…"
                    value={mQuery}
                    onChange={(e) => setMQuery(e.target.value)}
                  />
                  <select
                    className="marketSelect"
                    value={mSort}
                    onChange={(e) => {
                      const next = e.target.value
                      if (isMarketSort(next)) setMSort(next)
                    }}
                    aria-label="Sort"
                  >
                    <option value="volume">Sort: volume</option>
                    <option value="liquidity">Sort: liquidity</option>
                    <option value="end">Sort: end date</option>
                  </select>

                  <label className="marketToggle">
                    <input
                      type="checkbox"
                      checked={mActiveOnly}
                      onChange={(e) => setMActiveOnly(e.target.checked)}
                    />
                    <span>Active only</span>
                  </label>
                </div>

                {mErr && <div className="marketErr">API error: {mErr}</div>}
              </div>

              <div className="marketList" role="list">
                {markets.map((m) => {
                  const yes = Math.round(m.yesPrice * 100)
                  const hot = m.volume > 200000 ? '🔥' : m.volume > 50000 ? '✨' : ''
                  const liqIcon = m.liquidity > 50000 ? '💧' : m.liquidity > 10000 ? '💦' : '·'
                  const on = selectedMarket?.id === m.id

                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`marketRow ${on ? 'on' : ''}`}
                      onClick={() => setSelectedMarket(m)}
                      role="listitem"
                      aria-label={`Select market: ${m.question}`}
                    >
                      <div className="marketQ">
                        <span className="marketHot">{hot}</span>
                        {m.question}
                      </div>

                      <div className="marketNums">
                        <span className="pill">Yes {yes}%</span>
                        <span className="pill">Vol {Math.round(m.volume)}</span>
                        <span className="pill">{liqIcon} Liq {Math.round(m.liquidity)}</span>
                      </div>
                    </button>
                  )
                })}

                {!mLoading && !mErr && markets.length === 0 && (
                  <div className="marketEmpty">
                    Nothing found. Try a different search.
                  </div>
                )}
              </div>

              <div className="marketBottom">
                {selectedMarket ? (
                  <div className="marketSelected">
                    <div className="marketSelectedTitle">Selected</div>
                    <div className="marketSelectedQ">{selectedMarket.question}</div>

                    <div className="marketSelectedActions">
                      <button
                        type="button"
                        className="marketBtn"
                        onClick={() => askAboutMarket(selectedMarket)}
                      >
                        Ask Siggy about this
                      </button>

                      {selectedMarket.url && (
                        <a
                          className="marketBtn ghost"
                          href={selectedMarket.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open market ↗
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="marketHint">
                    Pick a market on the left. Then ask Siggy to explain it.
                  </div>
                )}
              </div>
            </div>

            {/* Right: Chat */}
            <div className="chatPane">
              <div className={styles.card} aria-live="polite">
                <div className={styles.stream}>
                  {chat.map(m => <Message key={m.id} role={m.role} text={m.text} ts={m.ts} mounted={mounted} />)}
                  {loading && <BotTyping />}
                  <div ref={endRef} />
                </div>

                <div className={styles.quickWrap}>
                  {predictQuick.map((it) => (
                    <button
                      key={it.label}
                      type="button"
                      className={styles.quick}
                      onClick={onQuickPredict(it.prompt)}
                      aria-label={it.label}
                    >
                      <span className={styles.quickPaw} aria-hidden>🐾</span>
                      {it.label}
                    </button>
                  ))}
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
                      placeholder="Ask about markets…"
                      value={q}
                      onChange={e => setQ(e.target.value)}
                      onKeyDown={onKeyDown}
                      autoFocus
                    />
                    <button
                      className={styles.send}
                      onClick={() => send()}
                      disabled={loading || !q.trim()}
                      aria-label="Send"
                    >
                      {loading ? <span className={styles.spin} aria-hidden /> : (
                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                          <path d="M3 11.5l17-8-6.5 17-2.5-5.5-5.5-3.5z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {err && <div className={styles.err} role="alert">{err}</div>}
                  <div className={styles.footerLine}>
                    <span>Predict mode prototype.</span>
                    <span className={styles.sep} aria-hidden>•</span>
                    <span className={styles.hintKey}>Press <kbd>Enter</kbd> to send</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          // ===== Ritual mode (как было) =====
          <section className={styles.card} aria-live="polite">
            <div className={styles.stream}>
              {chat.map(m => <Message key={m.id} role={m.role} text={m.text} ts={m.ts} mounted={mounted} />)}
              {loading && <BotTyping />}
              <div ref={endRef} />
            </div>

            <div className={styles.quickWrap}>
              {ritualQuick.map((it) => (
                <a
                  key={it.label}
                  className={styles.quick}
                  href={it.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onQuickRitual(it)}
                  aria-label={`${it.label} — opens in a new tab`}
                >
                  <span className={styles.quickPaw} aria-hidden>🐾</span>
                  {it.label}
                </a>
              ))}
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
                  placeholder="Ask anything…"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  onKeyDown={onKeyDown}
                  autoFocus
                />
                <button
                  className={styles.send}
                  onClick={() => send()}
                  disabled={loading || !q.trim()}
                  aria-label="Send"
                >
                  {loading ? <span className={styles.spin} aria-hidden /> : (
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                      <path d="M3 11.5l17-8-6.5 17-2.5-5.5-5.5-3.5z" />
                    </svg>
                  )}
                </button>
              </div>

              {err && <div className={styles.err} role="alert">{err}</div>}
              <div className={styles.footerLine}>
                <span>Private, local prototype.</span>
                <span className={styles.sep} aria-hidden>•</span>
                <span>Next: <b>Ritual Smart Agent</b> with memory, tools & on-chain actions.</span>
                <span className={styles.sep} aria-hidden>•</span>
                <span className={styles.hintKey}>Press <kbd>Enter</kbd> to send</span>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Predict styles - global, чтобы не было jsx-хешей и сюрпризов */}
      <style jsx global>{`
        .modePills{
          display:inline-flex;
          gap: 8px;
          padding: 6px;
          border-radius: 999px;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.10);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          margin-right: 10px;
        }
        .modePill{
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(0,0,0,.18);
          color: rgba(255,255,255,.88);
          font-weight: 800;
          cursor: pointer;
        }
        .modePill.on{
          background: rgba(127,229,201,.20);
          border-color: rgba(127,229,201,.35);
          color: #eafff3;
        }

        .predictGrid{
          display:grid;
          grid-template-columns: 1.05fr 1fr;
          gap: 16px;
          align-items: stretch;
          min-height: 640px;
        }

        .marketPane, .chatPane{
          border-radius: 18px;
          background: rgba(0,0,0,.10);
          border: 1px solid rgba(255,255,255,.10);
          overflow: hidden;
        }

        .marketPane{
          display:flex;
          flex-direction: column;
          min-width: 0;
        }

        .marketTop{
          padding: 14px;
          border-bottom: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.03);
        }

        .marketTitleRow{
          display:flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 10px;
          margin-bottom: 10px;
        }
        .marketTitle{
          font-weight: 900;
          color: rgba(255,255,255,.92);
          letter-spacing: .2px;
        }
        .marketMeta{
          font-size: 12px;
          color: rgba(255,255,255,.65);
        }

        .marketControls{
          display:flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }

        .marketSearch{
          flex: 1;
          min-width: 180px;
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.10);
          color: rgba(255,255,255,.92);
          outline: none;
        }
        .marketSelect{
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.10);
          color: rgba(255,255,255,.92);
          outline: none;
        }
        .marketToggle{
          display:flex;
          gap: 8px;
          align-items: center;
          color: rgba(255,255,255,.78);
          font-size: 13px;
          user-select: none;
        }
        .marketErr{
          margin-top: 10px;
          color: #ffd2d2;
          font-weight: 700;
          font-size: 13px;
        }

        .marketList{
          padding: 12px;
          overflow: auto;
          flex: 1;
        }

        .marketRow{
          width: 100%;
          text-align: left;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          border-radius: 14px;
          padding: 12px 12px;
          cursor: pointer;
          margin-bottom: 10px;
          transition: transform .10s ease, background .10s ease, border-color .10s ease;
        }
        .marketRow:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); }
        .marketRow.on{
          border-color: rgba(127,229,201,.35);
          background: rgba(127,229,201,.10);
        }

        .marketQ{
          color: rgba(255,255,255,.92);
          font-weight: 850;
          line-height: 1.25;
          margin-bottom: 10px;
        }
        .marketHot{ margin-right: 6px; }

        .marketNums{
          display:flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .pill{
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(0,0,0,.18);
          color: rgba(255,255,255,.80);
          font-weight: 800;
        }

        .marketEmpty{
          color: rgba(255,255,255,.65);
          padding: 14px 6px;
          font-weight: 700;
        }

        .marketBottom{
          padding: 14px;
          border-top: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.03);
        }

        .marketHint{
          color: rgba(255,255,255,.70);
          font-weight: 800;
        }

        .marketSelectedTitle{
          font-size: 12px;
          color: rgba(255,255,255,.62);
          font-weight: 900;
          margin-bottom: 6px;
          letter-spacing: .18px;
          text-transform: uppercase;
        }
        .marketSelectedQ{
          color: rgba(255,255,255,.92);
          font-weight: 900;
          margin-bottom: 10px;
          line-height: 1.25;
        }

        .marketSelectedActions{
          display:flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .marketBtn{
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,.55);
          background: linear-gradient(180deg,#7fe5c9,#4cc9a6);
          color: #0b0b0f;
          font-weight: 900;
          cursor: pointer;
          text-decoration: none;
          display:inline-flex;
          align-items:center;
          gap: 8px;
        }
        .marketBtn.ghost{
          background: rgba(0,0,0,.18);
          border: 1px solid rgba(255,255,255,.18);
          color: rgba(255,255,255,.88);
        }

        @media (max-width: 980px){
          .predictGrid{ grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  )
}

function Message({ role, text, ts, mounted }: { role: Role; text: string; ts?: number; mounted: boolean }) {
  const time = mounted && ts
    ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

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
        {text.split('\n').map((line, i) => <p key={i}>{line}</p>)}
        {/* время только после mounted, чтобы не словить hydration mismatch */}
        {time && <div className={styles.meta} aria-hidden>{time}</div>}
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
