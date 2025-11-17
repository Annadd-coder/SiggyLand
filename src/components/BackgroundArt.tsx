'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'

type Pos = { x: string; y: string; scale?: number; rotate?: number }

type Props = {
  src?: string
  objectY?: string
  mist?: boolean
  lightning?: boolean
  lightningPositions?: Pos[]
  lightningMinDelay?: number
  lightningMaxDelay?: number
  /** добавлен для совместимости с page.tsx */
  parallax?: boolean
}

export default function BackgroundArt({
  src = '/siggyland/world-bg-desktop.jpg',
  objectY = '38%',
  mist = true,
  lightning = true,
  lightningPositions,
  lightningMinDelay = 2200,
  lightningMaxDelay = 5200,
  parallax = false, // ← добавили дефолт
}: Props) {
  // 3 точки слева + 3 справа
  const pts = useMemo<Pos[]>(
    () =>
      lightningPositions ?? [
        // left cluster
        { x: '18%', y: '16%', scale: 1.0, rotate: -6 },
        { x: '28%', y: '18%', scale: 0.95, rotate: 4 },
        { x: '38%', y: '15%', scale: 0.95, rotate: -3 },
        // right cluster
        { x: '62%', y: '18%', scale: 0.95, rotate: 3 },
        { x: '76%', y: '16%', scale: 1.0, rotate: -5 },
        { x: '88%', y: '14%', scale: 1.05, rotate: 6 },
      ],
    [lightningPositions]
  )

  const [active, setActive] = useState<number | null>(null)
  const [flashOn, setFlashOn] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!lightning || pts.length === 0) return
    const plan = () => {
      const delay =
        Math.floor(Math.random() * (lightningMaxDelay - lightningMinDelay + 1)) +
        lightningMinDelay
      timerRef.current = window.setTimeout(() => {
        const i = Math.floor(Math.random() * pts.length)
        setActive(i)
        setFlashOn(true)
        window.setTimeout(() => setFlashOn(false), 420)
        window.setTimeout(() => {
          setActive(null)
          plan()
        }, 440)
      }, delay) as unknown as number
    }
    plan()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [lightning, pts, lightningMinDelay, lightningMaxDelay])

  return (
    <div
      className={`bgArt bgArt--full ${parallax ? 'bgArt--parallax' : ''}`}
      aria-hidden
    >
      {/* Фон: cover — как раньше */}
      <div className="bgArt__imageWrap bgArt--cover">
        {src ? (
          <picture>
            <img src={src} alt="" style={{ objectPosition: `center ${objectY}` }} />
          </picture>
        ) : (
          <div className="bgArt__fallback" />
        )}
      </div>

      {/* Пар */}
      {mist && (
        <div className="bgArt__fx">
          <div className="mist mist--pond" />
          <div className="mist mist--wispL" />
          <div className="mist mist--wispR" />
        </div>
      )}

      {/* Молнии */}
      {lightning && (
        <div className="lightLayer">
          <div className={`skyFlash ${flashOn ? 'is-on' : ''}`} />
          {active != null && <Bolt {...pts[active]} />}
        </div>
      )}

      {/* Хотспот по статуе */}
      <div className="bgArt__hotspots">
        <a
          className="hotspot hotspot--cat"
          href="https://www.ritualfoundation.org/docs/overview/what-is-ritual"
          aria-label="Open Ritual docs — What is Ritual"
          title="Open Ritual docs — What is Ritual"
        />
      </div>

      {/* локальная шторка уже есть в page.tsx */}
    </div>
  )
}

function Bolt({ x, y, scale = 1, rotate = 0 }: Pos) {
  return (
    <div
      className="bolt is-on"
      style={{
        left: x,
        top: y,
        transform: `translate(-50%,-10%) rotate(${rotate}deg) scale(${scale})`,
      }}
    >
      <svg viewBox="0 0 120 240" width="120" height="240" aria-hidden>
        <polyline
          className="stroke"
          points="60,0 58,26 70,48 55,76 72,102 54,134 68,156 50,188 64,210 60,240"
        />
        <polyline className="stroke thin" points="58,26 44,44 52,58" />
        <polyline className="stroke thin" points="55,76 40,94 48,106" />
        <polyline className="stroke thin" points="54,134 40,150 50,162" />
        <polyline className="stroke thin" points="50,188 36,204 46,214" />
      </svg>
    </div>
  )
}