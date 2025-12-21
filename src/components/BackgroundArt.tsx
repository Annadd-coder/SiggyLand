// src/components/BackgroundArt.tsx
'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'

type Props = {
  /** Десктопный фон (лежит в /public) */
  src?: string
  /** Мобильный фон (если нет — используется src) */
  mobileSrc?: string
  /** object-position-Y для десктопа (например '38%') */
  objectY?: string
  /** object-position-Y для мобилы (если не задан — берём objectY) */
  objectYMobile?: string

  /** Пар над водой */
  mist?: boolean

  /** ❄ снег */
  snow?: boolean
  /** кол-во снежинок */
  snowCount?: number
  /** базовая скорость падения (s) — больше = медленнее */
  snowSpeedBase?: number
  /** амплитуда «ветра» (px) */
  snowDrift?: number

  /** совместимость */
  parallax?: boolean
}

export default function BackgroundArt({
  src = '/siggyland/world-bg-desktop.jpg',
  mobileSrc,
  objectY = '55%',
  objectYMobile,

  mist = true,

  snow = true,
  snowCount = 1200,
  snowSpeedBase = 22,
  snowDrift = 40,

  parallax = false,
}: Props) {
  // ✅ чтобы не было SSR/CSR mismatch — эффекты (снег) рисуем только после mount
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // фолбэк для проблемных форматов
  const triedFallbackRef = useRef(false)
  const onImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (triedFallbackRef.current) return
    triedFallbackRef.current = true

    const img = e.currentTarget
    const cur = img.currentSrc || img.src

    // если упал mobileSrc — уводим на desktop src
    if (mobileSrc && cur.includes(mobileSrc)) {
      img.src = src
      return
    }

    // дальше — замены формата
    if (cur.endsWith('.webp')) img.src = cur.replace(/\.webp$/, '.png')
    else if (cur.endsWith('.jpg') || cur.endsWith('.jpeg')) img.src = cur.replace(/\.jpe?g$/, '.png')
    else if (cur.endsWith('.png')) img.style.display = 'none'
  }

  const yMobile = objectYMobile ?? objectY

  return (
    <div
      className={`bgArt bgArt--full ${parallax ? 'bgArt--parallax' : ''}`}
      aria-hidden
      style={
        {
          // ✅ управляем object-position через CSS переменные (и media-query)
          ['--bgY' as any]: objectY,
          ['--bgYMobile' as any]: yMobile,
        } as React.CSSProperties
      }
    >
      {/* фон */}
      <div className="bgArt__imageWrap bgArt--cover">
        <picture>
          {mobileSrc ? <source media="(max-width: 700px)" srcSet={mobileSrc} /> : null}
          <img
            src={src}
            alt=""
            loading="eager"
            decoding="async"
            fetchPriority="high"
            onError={onImgError}
            className="bgArt__img"
          />
        </picture>
      </div>

      {/* пар */}
      {mist && (
        <div className="bgArt__fx">
          <div className="mist mist--pond" />
          <div className="mist mist--wispL" />
          <div className="mist mist--wispR" />
        </div>
      )}

      {/* ❄ снег — только после mount */}
      {mounted && snow && <SnowLayer count={snowCount} speedBase={snowSpeedBase} drift={snowDrift} />}

      {/* хотспот по статуе */}
      <div className="bgArt__hotspots">
        <a
          className="hotspot hotspot--cat"
          href="https://www.ritualfoundation.org/docs/overview/what-is-ritual"
          aria-label="Open Ritual docs — What is Ritual"
          title="Open Ritual docs — What is Ritual"
        />
      </div>

      {/* стили (оставляем локально как у тебя) */}
      <style jsx global>{`
        .bgArt__img{
          width:100%;
          height:100%;
          object-fit:cover;
          object-position:center var(--bgY, 50%);
          display:block;
        }
        @media (max-width:700px){
          .bgArt__img{
            object-position:center var(--bgYMobile, var(--bgY, 50%));
          }
        }

        .snowLayer{
          position:absolute; inset:0; pointer-events:none; overflow:hidden;
          z-index:2;
        }
        .flake{
          position:absolute;
          top:-10px;
          border-radius:50%;
          background: radial-gradient(circle at 40% 35%, #ffffff, #eafff6 60%, rgba(255,255,255,0) 72%);
          box-shadow: 0 0 10px rgba(180,255,240,.35);
          animation:
            snow-fall var(--dur, 14s) linear var(--delay, 0s) infinite,
            snow-sway var(--swayDur, 3.6s) ease-in-out var(--swayDelay, 0s) infinite alternate;
          will-change: transform, margin-left;
        }
        @keyframes snow-fall { to { transform: translateY(110vh); } }
        @keyframes snow-sway {
          0%   { margin-left: calc(var(--wind, 24px) * -1); }
          100% { margin-left: var(--wind, 24px); }
        }
        @media (prefers-reduced-motion: reduce){
          .snowLayer{ display:none; }
        }
      `}</style>
    </div>
  )
}

/* ——— снег ——— */
function SnowLayer({
  count = 160,
  speedBase = 14,
  drift = 28,
}: {
  count?: number
  speedBase?: number
  drift?: number
}) {
  const rnd = (seed: number) => {
    const x = Math.sin(seed * 999.733) * 10000
    return x - Math.floor(x)
  }

  // ✅ делаем строки через toFixed, чтобы даже при SSR всё совпадало 1:1
  const f2 = (n: number) => n.toFixed(2)
  const f4 = (n: number) => n.toFixed(4)
  const px = (n: number) => `${f4(n)}px`
  const pct = (n: number) => `${f4(n)}%`
  const sec = (n: number) => `${f4(n)}s`

  const flakes = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const left = rnd(i * 1.13) * 100
      const size = 2 + rnd(i * 1.91) * 5
      const opacity = 0.45 + rnd(i * 2.71) * 0.5
      const delay = rnd(i * 3.17) * 8
      const dur = speedBase * (0.8 + rnd(i * 4.01) * 0.9)
      const swayDur = 2.6 + rnd(i * 5.03) * 3.4
      const swayDelay = rnd(i * 6.07) * 2
      const blur = rnd(i * 7.11) * 0.8
      const wind = drift * (0.5 + rnd(i * 9.17) * 0.7)
      const topStart = -15 + rnd(i * 10.19) * 10

      return {
        left: pct(left),
        top: pct(topStart),
        size: px(size),
        opacity: f4(opacity),
        blur: px(blur),
        dur: sec(dur),
        delay: sec(delay),
        swayDur: sec(swayDur),
        swayDelay: sec(swayDelay),
        wind: px(wind),
      }
    })
  }, [count, speedBase, drift])

  return (
    <div className="snowLayer" aria-hidden>
      {flakes.map((f, idx) => (
        <span
          key={idx}
          className="flake"
          style={
            {
              left: f.left,
              top: f.top,
              width: f.size,
              height: f.size,
              opacity: f.opacity as any,
              filter: `blur(${f.blur})`,
              ['--dur' as any]: f.dur,
              ['--delay' as any]: f.delay,
              ['--swayDur' as any]: f.swayDur,
              ['--swayDelay' as any]: f.swayDelay,
              ['--wind' as any]: f.wind,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}