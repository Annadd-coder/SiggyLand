// src/app/story/page.tsx  (или твой путь к вайтлист-странице)
'use client'

import Link from 'next/link'
import React from 'react'

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xzzypynl'
const LS_KEY = 'siggy:story:wl:emails' // локальный анти-дубликат

export default function StoryWhitelistPage() {
  const [email, setEmail] = React.useState('')
  const [status, setStatus] = React.useState<'idle'|'loading'|'ok'|'dup'|'err'>('idle')
  const [message, setMessage] = React.useState<string>('')

  // локальная проверка на дубль
  const checkDuplicate = (e: string) => {
    try {
      const list = JSON.parse(localStorage.getItem(LS_KEY) || '[]') as string[]
      return list.includes(e.toLowerCase().trim())
    } catch { return false }
  }

  const addLocal = (e: string) => {
    try {
      const list = JSON.parse(localStorage.getItem(LS_KEY) || '[]') as string[]
      const next = Array.from(new Set([...list, e.toLowerCase().trim()]))
      localStorage.setItem(LS_KEY, JSON.stringify(next))
    } catch {}
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    const v = email.toLowerCase().trim()

    if (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setMessage('Please enter a valid email.')
      setStatus('err')
      return
    }
    if (checkDuplicate(v)) {
      setStatus('dup'); setMessage('This email is already on the list.')
      return
    }

    setStatus('loading'); setMessage('')
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: v, list: 'Siggy Chronicle — Chapter One' })
      })
      if (res.ok) {
        addLocal(v)
        setStatus('ok')
      } else {
        const data = await res.json().catch(() => ({}))
        setStatus('err')
        setMessage(data?.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setStatus('err'); setMessage('Network error. Please try again.')
    }
  }

  return (
    // ВАЖНО: добавлен класс wlPage — он убирает прокрутку
    <main className="pageRoot wlPage">
      <section className="wl">
        <div className="wl__text">
          <div className="eyebrow">STORY • CHAPTER ONE</div>
          <h1 className="title">Join the whitelist</h1>
          <p className="lead">
            Leave your email to get early access to <strong>Siggy Chronicle — Chapter One</strong>.
            We’ll email mint details and the release date. No spam, ever.
          </p>

          {status === 'ok' ? (
            <div className="card ok">
              <h3 className="ok__title">You’re on the list ✅</h3>
              <p className="ok__p">We’ll email you mint details for Chapter One. Thanks for joining!</p>
              <Link href="/" className="backBtn">← Back to Home</Link>
            </div>
          ) : (
            <form className="form" onSubmit={onSubmit} noValidate>
              <label className="label" htmlFor="email">Your email</label>
              <div className="row">
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={`input ${status === 'err' || status === 'dup' ? 'is-err' : ''}`}
                  value={email}
                  onChange={(e)=>{ setEmail(e.target.value); if(status!=='idle') setStatus('idle') }}
                  disabled={status==='loading'}
                  required
                />
                <button className="submit" type="submit" disabled={status==='loading'}>
                  {status==='loading' ? 'Sending…' : 'Join'}
                </button>
              </div>
              {(status==='err' || status==='dup') && <p className="err">{message}</p>}
              <p className="hint">By submitting, you agree to receive one email with mint details.</p>
            </form>
          )}
        </div>

        {/* Правый арт (кот с мягким свечением) */}
        <div className="wl__art">
          <img
            src="/siggyland/cats/letter-cat.webp"
            alt="Siggy writing letters"
            className="artImg"
          />
        </div>
      </section>

      <style jsx>{`
        /* Страница: ровно на высоту экрана минус шапка — без скролла */
        .wlPage{
          position: relative;
          height: calc(100svh - var(--headerH));
          min-height: calc(100svh - var(--headerH));
          overflow: hidden;     /* прячем свечение за пределами */
        }

        .wl{
          display:grid;
          grid-template-columns: 1.1fr .9fr;
          gap:min(7vw,56px);
          align-items:center;
          align-content:center;                 /* центр по столбцам */
          width:min(1100px,92vw);
          margin:0 auto;
          min-height:100%;                      /* тянем секцию на всю высоту */
          padding-block: clamp(24px, 6vh, 56px);/* спокойные вертикальные отступы */
        }

        .wl__text{ min-width:0 }
        .eyebrow{
          letter-spacing:.22em; text-transform:uppercase;
          color:rgba(220,255,240,.75); font-size:13px; font-weight:800; margin-bottom:14px
        }
        .title{
          font-family:'Fredoka','Baloo 2','Nunito',ui-sans-serif; font-weight:900;
          font-size: clamp(28px, 4.6vw, 52px); line-height:1.05; margin:0 0 14px
        }
        .lead{
          color:#cfe7df; font-size: clamp(15px, 1.35vw, 18px);
          margin:0 0 26px; max-width: 46ch
        }

        .form{ margin-top:8px }
        .label{ font-size:13px; font-weight:700; color:#bfeee0; margin-bottom:6px; display:block }
        .row{ display:flex; gap:12px; align-items:center }
        .input{
          flex:1; padding:14px 14px; border-radius:14px; background:rgba(255,255,255,.04);
          border:1px solid rgba(255,255,255,.08); color:#fff; outline:none;
          transition:border-color .15s ease, box-shadow .15s ease;
        }
        .input:focus{ border-color: rgba(127,229,201,.6); box-shadow:0 0 0 4px rgba(127,229,201,.12) }
        .input.is-err{ border-color: rgba(255,120,120,.6); box-shadow:0 0 0 4px rgba(255,120,120,.12) }
        .submit{
          padding:14px 18px; border-radius:14px; border:2px solid #0b0b0f; cursor:pointer;
          background: linear-gradient(180deg,#7fe5c9,#4cc9a6); color:#0b0b0f; font-weight:900;
          box-shadow:0 8px 0 rgba(0,0,0,.48), 0 14px 34px rgba(0,0,0,.40);
        }
        .submit:disabled{ opacity:.7; cursor:default }
        .hint{ font-size:12px; color:#a9cfc4; margin-top:8px }

        .err{ color:#ffd2d2; margin-top:8px; font-weight:600 }

        .card.ok{
          margin-top:10px; padding:22px; border-radius:18px;
          background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));
          border:1px solid rgba(255,255,255,.08); box-shadow: 0 22px 60px rgba(0,0,0,.35);
          max-width: 64ch;
        }
        .ok__title{ margin:0 0 6px; font-size: clamp(18px,2.2vw,24px) }
        .ok__p{ margin:0 0 14px; color:#cfe7df }
        .backBtn{
          display:inline-block; padding:12px 16px; border-radius:12px;
          background: linear-gradient(180deg,#7fe5c9,#4cc9a6); color:#0b0b0f; font-weight:900;
          border:2px solid #0b0b0f; box-shadow:0 8px 0 rgba(0,0,0,.48);
        }

        /* Кот — мягкое свечение + тень, но без влияния на layout */
        .wl__art{ display:grid; place-items:center; position:relative; contain: paint; }
        .wl__art::before{
          content:"";
          position:absolute; inset:auto;
          width: min(64vw, 520px);
          height: min(64vw, 520px);
          border-radius:50%;
          filter: blur(22px);
          background:
            radial-gradient(50% 50% at 50% 50%, rgba(140,255,230,.22) 0%, rgba(140,255,230,0) 70%);
          z-index:0;
        }
        .artImg{
          position:relative; z-index:1;
          width: clamp(220px, 34vw, 520px);
          height:auto; object-fit:contain;
          filter:
            drop-shadow(0 24px 40px rgba(0,0,0,.45))
            drop-shadow(0 0 22px rgba(127,229,201,.16));
        }

        @media (max-width: 900px){
          .wl{ grid-template-columns: 1fr; gap:28px; padding-block: 28px; }
          .lead{ max-width: 48ch }
          .wl__art{ order:-1 } /* арт над текстом */
        }
      `}</style>
    </main>
  )
}