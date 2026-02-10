// src/app/story/page.tsx
'use client'

import Link from 'next/link'
import React from 'react'

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xzzypynl'
const LS_KEY = 'siggy:story:wl:emails'

export default function StoryWhitelistPage() {
  const [email, setEmail] = React.useState('')
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'ok' | 'dup' | 'err'>('idle')
  const [message, setMessage] = React.useState('')

  // локальная проверка на дубль
  const checkDuplicate = (e: string) => {
    try {
      const list = JSON.parse(localStorage.getItem(LS_KEY) || '[]') as string[]
      return list.includes(e.toLowerCase().trim())
    } catch {
      return false
    }
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
      setStatus('dup')
      setMessage('This email is already on the list.')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: v, list: 'Siggy Chronicle — Chapter One' }),
      })

      if (res.ok) {
        addLocal(v)
        setStatus('ok')
      } else {
        const data = await res.json().catch(() => ({} as any))
        setStatus('err')
        setMessage(data?.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setStatus('err')
      setMessage('Network error. Please try again.')
    }
  }

  // fallback на PNG
  const onImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget
    if (el.src.endsWith('.webp')) el.src = el.src.replace(/\.webp$/, '.png')
  }

  return (
    <main className="pageRoot wlPage skinStory skinStoryBlue">
      <section className="wl">
        {/* ЛЕВАЯ карточка */}
        <div className="wl__text frostCard">
          <div className="eyebrow">STORY • CHAPTER ONE</div>
          <h1 className="title">Join the whitelist</h1>
          <p className="lead">
            Leave your email to get early access to <strong>Siggy Chronicle Chapter One</strong>.
            We’ll email mint details and the release date. No spam, ever.
          </p>

          {status === 'ok' ? (
            <div className="card ok" aria-live="polite">
              <h3 className="ok__title">You’re on the list ✅</h3>
              <p className="ok__p">We’ll email you mint details for Chapter One. Thanks for joining!</p>
              <Link href="/" className="backBtn" data-softnav="1">
                ← Back to Home
              </Link>
            </div>
          ) : (
            <form
              className="form"
              onSubmit={onSubmit}
              noValidate
              aria-live="polite"
              aria-busy={status === 'loading' ? 'true' : 'false'}
            >
              <label className="label" htmlFor="email">
                Your email
              </label>

              <div className="row">
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={`input ${status === 'err' || status === 'dup' ? 'is-err' : ''}`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (status !== 'idle') setStatus('idle')
                  }}
                  disabled={status === 'loading'}
                  required
                />

                <button className="submit" type="submit" disabled={status === 'loading'}>
                  {status === 'loading' ? 'Sending…' : 'Join'}
                </button>
              </div>

              {(status === 'err' || status === 'dup') && <p className="err">{message}</p>}
              <p className="hint">By submitting, you agree to receive one email with mint details.</p>
            </form>
          )}
        </div>

        {/* ПРАВЫЙ: «рама» со стеклом и подсветкой */}
        <div
          className="wl__art"
          style={
            {
              ['--story-art-w' as any]: 'min(42vw, 560px)',
              ['--story-art-x' as any]: '0px',
              ['--story-art-y' as any]: '0px',
            } as React.CSSProperties
          }
        >
          <div className="scene" aria-hidden={false}>
            <div className="scene__glow" />
            <figure className="frame">
              <img
                src="/siggyland/cats/letter-cat.webp"
                alt="Siggy writing letters"
                className="frame__img"
                onError={onImgError}
                loading="eager"
                decoding="async"
              />
              <div className="frame__glass" aria-hidden />
              <figcaption className="frame__cap"></figcaption>
            </figure>
            <div className="scene__shadow" />
          </div>
        </div>
      </section>

      <style jsx>{`
        /* ===== Страница/фон ===== */
        .wlPage{
          position: relative;
          height: calc(100svh - var(--headerH));
          min-height: calc(100svh - var(--headerH));
          overflow: hidden;
        }
        .wlPage::before{
          content:"";
          position: fixed; inset:0; z-index:0; pointer-events:none;
          background:
            radial-gradient(1200px 720px at 12% -10%, rgba(60,90,180,.28), transparent 60%),
            radial-gradient(1000px 620px at 88% 10%, rgba(40,70,140,.22), transparent 55%),
            linear-gradient(180deg, #0c1631, #0a1225 60%, #09101c);
        }
        .wlPage::after{
          content:"";
          position: fixed; inset:0; z-index:0; pointer-events:none; opacity:.42;
          background:
            radial-gradient(2px 2px at 16% 22%, rgba(255,255,255,.9), transparent 60%),
            radial-gradient(1.6px 1.6px at 32% 34%, rgba(255,255,255,.85), transparent 60%),
            radial-gradient(1.6px 1.6px at 54% 18%, rgba(255,255,255,.9), transparent 60%),
            radial-gradient(1.4px 1.4px at 72% 28%, rgba(255,255,255,.85), transparent 60%),
            radial-gradient(1px 1px at 10% 70%, rgba(255,255,255,.7), transparent 60%),
            radial-gradient(1px 1px at 80% 46%, rgba(255,255,255,.75), transparent 60%);
          animation: twinkle 5s ease-in-out infinite alternate;
        }
        @keyframes twinkle{ 0%{opacity:.36} 100%{opacity:.52} }

        .wl{
          display:grid;
          grid-template-columns: 1.06fr .94fr;
          gap:min(7vw,56px);
          align-items:center;
          width:min(1100px,92vw);
          margin:0 auto;
          min-height:100%;
          padding-block: clamp(24px, 6vh, 56px);
          position: relative;
          z-index: 1;
        }

        .frostCard{
          position: relative;
          padding: clamp(18px, 3.4vw, 28px);
          border-radius: 18px;
          border: 1.5px solid transparent;
          background:
            linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03)) padding-box,
            linear-gradient(180deg, rgba(190,210,255,.38), rgba(120,150,230,.14)) border-box;
          backdrop-filter: blur(10px) saturate(1.08);
          -webkit-backdrop-filter: blur(10px) saturate(1.08);
          box-shadow: 0 18px 44px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25);
          overflow: clip;
        }
        .frostCard::after{
          content:"";
          position:absolute; inset:0; pointer-events:none;
          background:
            repeating-linear-gradient(135deg, rgba(255,255,255,.06) 0 2px, transparent 2px 6px),
            radial-gradient(280px 200px at 12% -10%, rgba(255,255,255,.16), transparent 60%),
            radial-gradient(160px 120px at 92% 10%, rgba(200,255,240,.10), transparent 70%);
          mix-blend-mode: screen; opacity:.45;
        }

        .eyebrow{
          letter-spacing:.22em; text-transform:uppercase;
          color:rgba(220,255,240,.78); font-size:13px; font-weight:800; margin-bottom:14px
        }
        .title{
          font-family:'Fredoka','Baloo 2','Nunito',ui-sans-serif; font-weight:900;
          font-size: clamp(28px, 4.6vw, 52px); line-height:1.05; margin:0 0 14px;
          text-shadow: 0 2px 0 rgba(0,0,0,.25);
        }
        .lead{
          color:#cfe7df; font-size: clamp(15px, 1.35vw, 18px);
          margin:0 0 22px; max-width: 48ch
        }

        .form{ margin-top:6px }
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
          margin-top:10px; padding:22px; border-radius:18px; max-width:64ch;
          background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));
          border:1px solid rgba(255,255,255,.08); box-shadow:0 22px 60px rgba(0,0,0,.35);
        }
        .ok__title{ margin:0 0 6px; font-size: clamp(18px,2.2vw,24px) }
        .ok__p{ margin:0 0 14px; color:#cfe7df }
        .backBtn{
          display:inline-block; padding:12px 16px; border-radius:12px;
          background: linear-gradient(180deg,#7fe5c9,#4cc9a6); color:#0b0b0f; font-weight:900;
          border:2px solid #0b0b0f; box-shadow:0 8px 0 rgba(0,0,0,.48);
        }

        .wl__art{
          position:relative;
          display:grid; place-items:center;
          align-self:center; justify-self:end;
          transform: translate(var(--story-art-x, 0px), var(--story-art-y, 0px));
          min-width:0;
        }
        .scene{
          position: relative;
          width: var(--story-art-w, 520px);
          max-width: min(44vw, 580px);
          z-index: 1;
          will-change: transform, filter;
          filter: drop-shadow(0 22px 38px rgba(0,0,0,.38));
        }
        @media (prefers-reduced-motion: no-preference){
          .scene{ animation: floatY 6.5s ease-in-out infinite; }
          .scene:hover{ animation-play-state: paused; transform: translateY(-2px); }
        }
        @keyframes floatY{
          0%,100%{ transform: translateY(1px) }
          50%    { transform: translateY(-4px) }
        }

        .scene__glow{
          position:absolute; inset:0; transform: translateY(2%);
          border-radius: 20px;
          background:
            radial-gradient(60% 50% at 52% 45%, rgba(120,190,255,.22), transparent 70%),
            radial-gradient(40% 35% at 48% 55%, rgba(90,160,255,.16), transparent 75%);
          filter: blur(18px);
          z-index:-1;
          pointer-events:none;
        }

        .frame{
          position: relative;
          width: 100%;
          border-radius: 18px;
          padding: 10px;
          background:
            linear-gradient(180deg, rgba(230,245,255,.28), rgba(170,200,255,.14)) padding-box,
            linear-gradient(180deg, rgba(255,255,255,.65), rgba(190,210,255,.28)) border-box;
          border: 1.5px solid transparent;
          box-shadow:
            0 16px 38px rgba(0,0,0,.40),
            inset 0 1px 0 rgba(255,255,255,.35);
          overflow: clip;
          isolation: isolate;
        }
        .frame::before{
          content:"";
          position:absolute; inset:6px;
          border-radius: 14px;
          background:
            linear-gradient(180deg, rgba(8,14,22,.72), rgba(8,14,22,.86)),
            repeating-linear-gradient(135deg, rgba(255,255,255,.025) 0 2px, transparent 2px 8px);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.06);
          z-index:0;
        }

        .frame__img{
          position: relative;
          z-index: 1;
          display: block;
          width: 100%;
          height: auto;
          border-radius: 12px;
          object-fit: contain;
          filter:
            drop-shadow(0 12px 24px rgba(0,0,0,.45))
            drop-shadow(0 0 18px rgba(120,180,255,.18));
        }

        .frame__glass{
          position:absolute; inset:0;
          z-index: 2; pointer-events:none;
          background:
            linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,0) 28%),
            linear-gradient(120deg, rgba(255,255,255,.10), rgba(255,255,255,0) 35%),
            repeating-linear-gradient(135deg, rgba(255,255,255,.04) 0 2px, transparent 2px 6px);
          mix-blend-mode: screen;
        }

        .frame__cap{
          position:absolute;
          left: 16px; bottom: 12px;
          z-index: 3;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px; font-weight: 800; letter-spacing:.2px;
          color: #06110D;
          background: linear-gradient(180deg,#d8e7ff,#bcd1ff);
          border: 2px solid #0b0b0f;
          box-shadow: 0 2px 0 rgba(0,0,0,.35);
        }

        .scene__shadow{
          position:absolute;
          left: 50%; bottom: -12px;
          transform: translateX(-50%);
          width: 86%;
          height: 18%;
          background: radial-gradient(50% 50% at 50% 50%, rgba(0,0,0,.42), transparent 70%);
          filter: blur(16px);
          opacity:.40;
          z-index: 0;
          pointer-events:none;
        }

        @media (max-width: 900px){
          .wl{ grid-template-columns: 1fr; gap:28px; padding-block: 28px; }
          .wl__art{ order:-1 }
          .lead{ max-width: 52ch }
        }
        @media (max-width: 640px){
          .wlPage{ height: auto; min-height: calc(100svh - var(--headerH)); overflow: auto; }
          .wl{ width: min(94vw, 560px); padding-block: 20px; }
          .row{ flex-direction: column; align-items: stretch; }
          .submit{ width: 100%; }
          .scene{
            width: min(78vw, 420px);
            max-width: 78vw;
          }
          .frame__cap{ font-size: 11px; }
        }
      `}</style>
    </main>
  )
}
