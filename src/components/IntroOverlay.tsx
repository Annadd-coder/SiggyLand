// src/components/IntroOverlay.tsx
'use client'

import React from 'react'
import { useHydrated } from '@/lib/useHydrated'

const LS_KEY = 'siggy:intro:v9:dismissed'

type Pt = { x: number; y: number }

const center = (el: Element | null): Pt | null => {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

/** центр по X и НИЗ (bottom) по Y — чтобы стрелка шла из кнопки */
const centerBottom = (el: Element | null): Pt | null => {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.bottom }
}

/** базовая S-дуга (с возможностью смещать контрольные точки) */
function cubicCustom(
  from: Pt,
  to: Pt,
  opts?: {
    lift?: number
    w1?: number
    w2?: number
    biasX1?: number
    biasY1?: number
    biasX2?: number
    biasY2?: number
  }
): string {
  const L   = opts?.lift  ?? 90
  const w1  = opts?.w1    ?? 0.35
  const w2  = opts?.w2    ?? 0.25
  const bx1 = opts?.biasX1?? 0
  const by1 = opts?.biasY1?? 0
  const bx2 = opts?.biasX2?? 0
  const by2 = opts?.biasY2?? 0

  const c1: Pt = { x: from.x + (to.x - from.x) * w1 + bx1, y: from.y + L + by1 }
  const c2: Pt = { x:  to.x  - (to.x - from.x) * w2 + bx2, y:  to.y  - L + by2 }
  return `M ${from.x},${from.y} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${to.x},${to.y}`
}

/** сдвиг точки вдоль направления (от from к to) на delta */
function moveAlong(from: Pt, to: Pt, delta = 0): Pt {
  const dx = to.x - from.x, dy = to.y - from.y
  const len = Math.max(1, Math.hypot(dx, dy))
  return { x: from.x + (dx / len) * delta, y: from.y + (dy / len) * delta }
}

/** подрезать финиш (чтобы стрелка не упиралась в цель) */
function trimEnd(to: Pt, from: Pt, delta = 24): Pt {
  const dx = to.x - from.x, dy = to.y - from.y
  const len = Math.max(1, Math.hypot(dx, dy))
  return { x: to.x - (dx / len) * delta, y: to.y - (dy / len) * delta }
}

/** решаем, показывать ли интро сразу (без ожидания эффекта) */
function initShow(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const url = new URL(window.location.href)
    if (url.searchParams.get('intro') === '1') return true
    return localStorage.getItem(LS_KEY) !== '1'
  } catch { return true }
}

/** безопасная верхняя граница (чтобы стрелка WHAT IS не уходила за хедер) */
function headerH(): number {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--headerH') || '80px'
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : 80
  } catch { return 80 }
}

export default function IntroOverlay() {
  const hydrated = useHydrated()
  const [show, setShow] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return initShow()
  })
  const [dims, setDims] = React.useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 0,
    h: typeof window !== 'undefined' ? window.innerHeight : 0,
  })
  const [pts, setPts] = React.useState<{
    origin: Pt | null
    toWhat: Pt | null
    toEco: Pt | null
    toRes: Pt | null
  }>({ origin: null, toWhat: null, toEco: null, toRes: null })

  const titleRef = React.useRef<HTMLDivElement>(null)
  const dismiss = React.useCallback(() => {
    setShow(false)
    try { localStorage.setItem(LS_KEY, '1') } catch {}
    try {
      const url = new URL(window.location.href)
      if (url.searchParams.has('intro')) {
        url.searchParams.delete('intro')
        history.replaceState(null, '', url.toString())
      }
    } catch {}
  }, [])

  const recalc = React.useCallback(() => {
    const measure = () => {
      setDims({ w: window.innerWidth, h: window.innerHeight })

      const navWhat = document.getElementById('nav-what')
      const eco     = document.getElementById('anchor-eco')
      const res     = document.getElementById('anchor-res')
      const tb      = titleRef.current?.getBoundingClientRect() ?? null
      const ctaEl   = document.getElementById('intro-cta')

      // старт прямо из кнопки (низ кнопки)
      const ctaPt   = centerBottom(ctaEl)
      const origin: Pt | null = ctaPt
        ? { x: ctaPt.x, y: ctaPt.y + 8 }
        : (tb
            ? { x: window.innerWidth / 2, y: tb.bottom + 36 }
            : { x: window.innerWidth / 2, y: window.innerHeight * 0.32 })

      // цель WHAT IS не поднимаем выше шапки
      const toWhatRaw = center(navWhat)
      const safeTop   = headerH() + 28
      const toWhatAdj = toWhatRaw ? { x: toWhatRaw.x, y: Math.max(toWhatRaw.y + 18, safeTop) } : null

      setPts({
        origin,
        toWhat: toWhatAdj,
        toEco:  center(eco),
        toRes:  center(res),
      })
    }

    requestAnimationFrame(() => {
      measure()
      requestAnimationFrame(measure)
    })
    setTimeout(measure, 200)
  }, [])

  React.useEffect(() => {
    if (!show) return
    recalc()
    window.addEventListener('resize', recalc)
    window.addEventListener('scroll', recalc, { passive: true })
    window.addEventListener('load', recalc, { passive: true })
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', recalc)
      window.removeEventListener('scroll', recalc)
      window.removeEventListener('load', recalc)
      window.removeEventListener('keydown', onKey)
    }
  }, [show, recalc, dismiss])

  if (!hydrated || !show) return null

  const { origin, toWhat, toEco, toRes } = pts
  const hasSVG = !!origin && (!!toWhat || !!toEco || !!toRes)

  // ---- настраиваемые длины/высоты стрелок (сохраняю твои константы + использую их) ----
  const START_OFFSET = 64   // (твоя) базовая дельта
  const GAP_NAV      = 45   // (твоя) зазор к WHAT IS
  const GAP_CAT      = 56   // (твоя) зазор к котикам
  const LIFT_NAV     = 100  // высота дуги к WHAT IS (чуть выше)
  const LIFT_SIDE    = 70   // высота дуг к котам (чуть площе)

  // делаем стрелки короче: начинаем близко к кнопке и раньше завершаем у цели
  const NAV_START_DELTA  = Math.min(START_OFFSET, 18)
  const NAV_END_TRIM     = Math.max(GAP_NAV, 70)
  const SIDE_START_DELTA = Math.min(START_OFFSET, 18)
  const SIDE_END_TRIM    = Math.max(GAP_CAT, 56)

  const navStart: Pt | null = origin && toWhat ? moveAlong(origin, toWhat, NAV_START_DELTA) : null
  const navEnd:   Pt | null = navStart && toWhat ? trimEnd(toWhat, navStart, NAV_END_TRIM) : null

  const ecoStart: Pt | null = origin && toEco ? moveAlong(origin, toEco, SIDE_START_DELTA) : null
  const ecoEnd:   Pt | null = ecoStart && toEco ? trimEnd(toEco,  ecoStart, SIDE_END_TRIM)  : null

  const resStart: Pt | null = origin && toRes ? moveAlong(origin, toRes, SIDE_START_DELTA) : null
  const resEnd:   Pt | null = resStart && toRes ? trimEnd(toRes,  resStart, SIDE_END_TRIM)  : null

  // ── ДОБАВЛЕНО: оффсеты для подпись-лейблов (можно двигать по X/Y)
  const LABEL_OFFSETS = {
    eco:  { x: -20, y: +10 }, // Ecosystem projects (влево на 20, вверх на 68)
    res:  { x: +18, y: +10 }, // Ritual resources  (вправо на 18, вверх на 68)
    what: { x: +90, y: +5 }, // More about Siggy Land (ниже на 35)
  }

  return (
    <div className="intro" aria-live="polite">
      <div className="veil" />

      <div ref={titleRef} className="titleWrap">
        <h2 className="title">Welcome to Siggy Land</h2>
        <p className="subtitle">Tap a cat to jump to Ritual resources or ecosystem projects.</p>
        {/* одна, увеличенная кнопка */}
        <button id="intro-cta" className="cta" onClick={dismiss}>Got it</button>
      </div>

      {hasSVG && (
        <svg
          className="svg"
          width="100%"
          height="100%"
          viewBox={`0 0 ${Math.max(1, dims.w)} ${Math.max(1, dims.h)}`}
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <marker id="arrowHead" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
              <polygon points="0,0 10,5 0,10" fill="rgba(220,255,245,.95)" />
            </marker>
          </defs>

          {/* WHAT IS — дуга к капсуле, ниже хедера */}
          {navStart && navEnd && (
            <path
              d={cubicCustom(navStart, navEnd, {
                lift: LIFT_NAV,
                w1: 0.28,
                w2: 0.22,
                biasX1: +16,
                biasY1: +12,
                biasY2: -24
              })}
              className="beam beam--nav"
              markerEnd="url(#arrowHead)"
              filter="url(#glow)"
            />
          )}

          {/* Ecosystem (левая) — короткая аккуратная дуга */}
          {ecoStart && ecoEnd && (
            <path
              d={cubicCustom(ecoStart, ecoEnd, {
                lift: LIFT_SIDE, w1: 0.32, w2: 0.24, biasY1: +10, biasY2: -10
              })}
              className="beam"
              markerEnd="url(#arrowHead)"
              filter="url(#glow)"
            />
          )}

          {/* Resources (правая) — симметричная */}
          {resStart && resEnd && (
            <path
              d={cubicCustom(resStart, resEnd, {
                lift: LIFT_SIDE, w1: 0.32, w2: 0.24, biasY1: +10, biasY2: -10
              })}
              className="beam"
              markerEnd="url(#arrowHead)"
              filter="url(#glow)"
            />
          )}
        </svg>
      )}

      {/* подписи (WHAT IS опустил ниже, чтобы не наезжало) */}
      {toEco && (
        <div
          className="label"
          style={{ left: toEco.x + LABEL_OFFSETS.eco.x, top: toEco.y + LABEL_OFFSETS.eco.y }}
        >
          Ecosystem projects
        </div>
      )}
      {toRes && (
        <div
          className="label"
          style={{ left: toRes.x + LABEL_OFFSETS.res.x, top: toRes.y + LABEL_OFFSETS.res.y }}
        >
          Ritual resources
        </div>
      )}
      {toWhat && (
        <div
          className="label"
          style={{ left: toWhat.x + LABEL_OFFSETS.what.x, top: toWhat.y + LABEL_OFFSETS.what.y }}
        >
          More about Siggy Land
        </div>
      )}

      <style jsx>{`
        .intro{ position:fixed; inset:0; z-index:60; pointer-events:auto }
        .veil{ position:absolute; inset:0; background:rgba(0,0,0,.70); backdrop-filter:blur(1px) }
        .titleWrap{
          position:absolute; left:50%; top: calc(var(--headerH) + 54px);
          transform: translateX(-50%); text-align:center; max-width:min(980px,92vw)
        }
        .title{
          margin:0 0 12px; font-family:'Fredoka','Baloo 2','Nunito',ui-rounded,system-ui,sans-serif;
          font-weight:900; letter-spacing:.4px; font-size:clamp(36px,6.4vw,76px);
          text-shadow:0 3px 0 rgba(0,0,0,.35)
        }
        .subtitle{ margin:0 0 18px; font-weight:800; font-size:clamp(14px,1.8vw,18px); opacity:.92 }
        .cta{
          padding:18px 24px;
          border-radius:16px;
          border:2px solid #0b0b0f;
          background:linear-gradient(180deg,#e5ffe7,#c8ffd3);
          color:#0b0b0f; font-weight:900;
          font-size:clamp(16px,1.9vw,20px);
          box-shadow:0 10px 28px rgba(0,0,0,.40),0 2px 0 rgba(0,0,0,.58);
          cursor:pointer;
        }

        .svg{ position:absolute; inset:0; pointer-events:none }
        .beam{
          fill:none; stroke:rgba(220,255,245,.96); stroke-width:5; opacity:.96;
          filter: drop-shadow(0 0 10px rgba(160,245,230,.32))
        }
        .beam--nav{ stroke-width:7 }

        .label{
          position:absolute; transform:translate(-50%,-50%);
          font-family:'Fredoka','Baloo 2','Nunito',ui-rounded,system-ui,sans-serif;
          font-weight:900; letter-spacing:.2px; white-space:nowrap;
          font-size:clamp(14px,1.9vw,20px); color:#06110D;
          padding:8px 12px; border-radius:14px;
          background:linear-gradient(180deg,#dfffee,#c7ffe0);
          border:2px solid #0b0b0f;
          box-shadow:0 8px 22px rgba(0,0,0,.40), 0 0 0 3px rgba(190,255,240,.18) inset;
          pointer-events:none
        }

        @media (prefers-reduced-motion: reduce){
          .beam, .beam--nav{ filter:none }
        }
      `}</style>
    </div>
  )
}
