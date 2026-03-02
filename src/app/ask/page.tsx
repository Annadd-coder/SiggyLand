'use client'

import Image from 'next/image'
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import styles from './ask.module.css'
import { trackInteraction } from '@/lib/trackInteraction'

type Role = 'user' | 'assistant'

type Message = {
  id: string
  role: Role
  text: string
  ts: number
}

type ChatApiResponse = {
  ok?: boolean
  reply?: string
  error?: string
}

const STORAGE_KEY = 'siggy:chat:assistant:v3'
const HISTORY_LIMIT = 12

const GREETING: Message = {
  id: 'hello-siggy',
  role: 'assistant',
  text:
    "Hi, I'm Siggy. I'm your personal assistant for planning, writing, Ritual research, community replies, and everyday project tasks. I keep things clear, warm, and useful without sounding robotic.",
  ts: 0,
}

function parseStoredMessages(raw: string | null) {
  if (!raw) return [GREETING]

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return [GREETING]

    const safe = parsed
      .filter((item): item is Message => {
        if (!item || typeof item !== 'object') return false
        const value = item as Partial<Message>
        return (value.role === 'user' || value.role === 'assistant') && typeof value.text === 'string'
      })
      .map((item, index) => ({
        id: typeof item.id === 'string' && item.id ? item.id : `restored-${index}`,
        role: item.role,
        text: item.text.trim(),
        ts: typeof item.ts === 'number' ? item.ts : index,
      }))
      .filter((item) => item.text.length > 0)

    return safe.length > 0 ? safe : [GREETING]
  } catch {
    return [GREETING]
  }
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error.trim()) return error
  return fallback
}

export default function AskPage() {
  const inputId = useId()
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    trackInteraction({ type: 'visit_ask', value: 1, metadata: { page: 'assistant_only' } })
    trackInteraction({ type: 'site_visit', value: 1, metadata: { page: 'ask_assistant' } })

    try {
      setMessages(parseStoredMessages(localStorage.getItem(STORAGE_KEY)))
    } catch {
      setMessages([GREETING])
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    if (!ready) return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)))
    } catch {}
  }, [messages, ready])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending])

  async function sendMessage(forcedPrompt?: string) {
    const prompt = (forcedPrompt ?? draft).trim()
    if (!prompt || sending) return

    const sentAt = Date.now()
    const userMessage: Message = {
      id: `user-${sentAt}`,
      role: 'user',
      text: prompt,
      ts: sentAt,
    }

    const history = messages.slice(-HISTORY_LIMIT).map(({ role, text }) => ({ role, text }))

    setMessages((current) => [...current, userMessage])
    setDraft('')
    setError(null)
    setSending(true)
    trackInteraction({ type: 'ask_prompt', value: 1, metadata: { area: 'assistant_only' } })

    try {
      const response = await fetch('/ask/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, history }),
      })

      const raw = await response.text().catch(() => '')
      let payload: ChatApiResponse | null = null

      try {
        payload = raw ? (JSON.parse(raw) as ChatApiResponse) : null
      } catch {
        payload = null
      }

      const replyText = payload?.reply?.trim()

      if (!response.ok || !payload?.ok || !replyText) {
        throw new Error(payload?.error || 'Assistant is temporarily unavailable.')
      }

      const replyAt = Date.now()
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${replyAt}`,
          role: 'assistant',
          text: replyText,
          ts: replyAt,
        },
      ])
      trackInteraction({ type: 'ask_reply', value: 1, metadata: { area: 'assistant_only' } })
    } catch (caughtError) {
      setError(toErrorMessage(caughtError, 'I could not get a reply right now. Please try again.'))
    } finally {
      setSending(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage()
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    void sendMessage()
  }

  return (
    <main className={`pageRoot skinAsk skinAskBlue ${styles.page}`}>
      <div className={styles.shell}>
        <section className={styles.stage}>
          <div className={styles.hero}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Ask Siggy</p>
              <h1 className={styles.title}>Your personal Ritual assistant.</h1>
              <p className={styles.lead}>
                Clear help for research, writing, planning, and day-to-day project work, with a warm tone and verified
                Ritual context.
              </p>
            </div>
          </div>

          <div className={styles.workspace}>
            <aside className={styles.agentPanel}>
              <div className={`${styles.visualFrame} ${sending ? styles.visualFrameActive : ''}`}>
                <Image
                  src="/qqqqqqqqqqqqeww.gif"
                  alt="Siggy typing on a typewriter"
                  width={1000}
                  height={1000}
                  priority
                  unoptimized
                  className={styles.agentGif}
                />
              </div>

              <div className={styles.agentMeta}>
                <div className={styles.presenceRow}>
                  <span className={styles.presenceDot} aria-hidden="true" />
                  <span className={styles.presenceText}>{sending ? 'Siggy is thinking...' : 'Siggy online'}</span>
                </div>

                <p className={styles.agentNote}>
                  Ask for help with notes, plans, launch copy, community replies, Ritual explanations, and polished
                  drafts that still feel natural.
                </p>
              </div>
            </aside>

            <section className={styles.chatPanel} aria-label="AI assistant chat">
              <header className={styles.chatHead}>
                <div>
                  <p className={styles.chatEyebrow}>Conversation</p>
                  <h2 className={styles.chatTitle}>Chat with Siggy</h2>
                </div>
                <span className={styles.chatStatus}>{sending ? 'Thinking' : 'Ready'}</span>
              </header>

              <div className={styles.stream}>
                {messages.map((message) => {
                  const isAssistant = message.role === 'assistant'

                  return (
                    <article
                      key={message.id}
                      className={`${styles.message} ${isAssistant ? styles.messageAssistant : styles.messageUser}`}
                    >
                      <p className={styles.messageLabel}>{isAssistant ? 'Siggy' : 'You'}</p>
                      <p className={styles.messageText}>{message.text}</p>
                    </article>
                  )
                })}

                {sending && (
                  <div className={styles.typing} aria-live="polite" aria-label="Assistant is typing">
                    <span className={styles.typingDot} />
                    <span className={styles.typingDot} />
                    <span className={styles.typingDot} />
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              <form className={styles.composer} onSubmit={handleSubmit}>
                <label className={styles.composerLabel} htmlFor={inputId}>
                  Message for Siggy
                </label>

                <textarea
                  id={inputId}
                  className={styles.composerInput}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="For example: write a warm, confident launch note for our community and keep it simple."
                  rows={4}
                  disabled={sending}
                />

                <div className={styles.composerFoot}>
                  <p className={styles.composerHint}>
                    Press Enter to send. Use Shift + Enter for a new line.
                  </p>

                  <button type="submit" className={styles.sendButton} disabled={sending || !draft.trim()}>
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>

              {error && <p className={styles.error}>{error}</p>}
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}
