// src/app/ask/page.tsx
'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import styles from './ask.module.css'

type Role = 'user' | 'assistant'
type Msg = { id: string; role: Role; text: string; ts?: number }

const CHAT_KEY = 'siggy:chat:v0'
const MEMORY_MAX = 14 // сколько последних сообщений отправляем в модель (можешь 10–20)

const GREETING: Msg = {
  id: 'hello',
  role: 'assistant',
  ts: Date.now(),
  text:
    "Welcome! I’m Siggy 😼 Think of me as a friendly map through Ritual. I can explain things simply, help you choose the right building blocks, and give you practical steps when you’re stuck. Tell me what you’re building, or just ask a question to start.",
}

export default function AskPage() {
  const inputId = useId()
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [chat, setChat] = useState<Msg[]>([GREETING])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHAT_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Msg[]
        if (Array.isArray(saved) && saved.length) setChat(saved)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const capped = chat.slice(-60)
      localStorage.setItem(CHAT_KEY, JSON.stringify(capped))
    } catch {}
  }, [chat])

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

    // важно: сформировать следующий чат заранее, чтобы history включал текущее сообщение
    const nextChat = [...chat, userMsg]
    setChat(nextChat)
    if (!promptRaw) setQ('')

    // memory/history для модели (только role+text, без мусора)
    const history = nextChat
      .slice(-MEMORY_MAX)
      .map(m => ({ role: m.role, text: m.text }))

    try {
      const res = await fetch('/ask/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, history }),
      })

      const rawText = await res.text()
      let data: any = null
      try { data = JSON.parse(rawText) } catch {}

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
    } catch (e: any) {
      setErr(e?.message || 'Network error')
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

  const quick = [
    {
      label: 'What is Ritual?',
      href: 'https://www.ritualfoundation.org/docs/overview/what-is-ritual',
      reply:
        'Ritual in one line: a modular AI execution layer for crypto — overview → https://www.ritualfoundation.org/docs/overview/what-is-ritual',
      prompt: 'What is Ritual?',
    },
    {
      label: 'How do Smart Agents work?',
      href: 'https://www.ritualfoundation.org/docs/build-on-ritual/tutorials/smart-agents',
      reply:
        'Smart Agents tutorial → https://www.ritualfoundation.org/docs/build-on-ritual/tutorials/smart-agents\n(purr) I’m still learning — soon I’ll run on Ritual as your on-chain friend.',
      prompt: 'How do Smart Agents work?',
    },
    {
      label: 'Docs & Repos',
      href: 'https://links.ritual.tools',
      reply: 'Docs & repos map → https://links.ritual.tools',
      prompt: 'Docs / repos, please',
    },
  
  ] as const

  const onQuick = (qItem: typeof quick[number]) => (e: React.MouseEvent) => {
    e.preventDefault()
    const t = Date.now()
    setChat(prev => [
      ...prev,
      { id: `u-${t}`, role: 'user', text: qItem.prompt, ts: t },
      { id: `a-${t + 1}`, role: 'assistant', text: qItem.reply, ts: t + 1 },
    ])
    window.open(qItem.href, '_blank', 'noopener,noreferrer')
  }

  const resetHistory = () => {
    setChat([GREETING])
    try { localStorage.removeItem(CHAT_KEY) } catch {}
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
            <Link href="/" data-softnav="1" className={styles.pillLink}>← Home</Link>
            <Link href="/what" data-softnav="1" className={`${styles.pillLink} ${styles.ghost}`}>
              What is this?
            </Link>
            <button className={`${styles.pillLink} ${styles.ghost}`} onClick={resetHistory} aria-label="Reset chat history">
              Reset
            </button>
          </div>
        </div>

        <section className={styles.card} aria-live="polite">
          <div className={styles.stream}>
            {chat.map(m => <Message key={m.id} role={m.role} text={m.text} ts={m.ts} />)}
            {loading && <BotTyping />}
            <div ref={endRef} />
          </div>

          <div className={styles.quickWrap}>
            {quick.map((it) => (
              <a
                key={it.label}
                className={styles.quick}
                href={it.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onQuick(it)}
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
              <span>Private, local prototype. </span>
              <span className={styles.sep} aria-hidden>•</span>
              <span>Next: <b>Ritual Smart Agent</b> with memory, tools & on-chain actions.</span>
              <span className={styles.sep} aria-hidden>•</span>
              <span className={styles.hintKey}>Press <kbd>Enter</kbd> to send</span>
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
        {text.split('\n').map((line, i) => <p key={i}>{line}</p>)}
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