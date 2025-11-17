'use client'
import { useEffect, useMemo, useRef, useState } from 'react'

type Pos = { x: string; y: string; scale?: number; rotate?: number }

/** Простая «гроза» без GIF: SVG-молния + вспышка неба */
export default function LightningFX({
  enabled = true,
  minDelay = 4500,         // минимум между ударами
  maxDelay = 11000,        // максимум между ударами
  positions,
}: {
  enabled?: boolean
  minDelay?: number
  maxDelay?: number
  positions?: Pos[]        // если не передать — будут дефолтные точки
}) {
  const pts = useMemo<Pos[]>(
    () =>
      positions ?? [
        { x: '82%', y: '14%', scale: 1.0, rotate: -8 },  // правый кристалл/небо
        { x: '63%', y: '18%', scale: 0.9, rotate: 5 },   // центр-право
        { x: '42%', y: '16%', scale: 0.95, rotate: -3 }, // центр-лево
      ],
    [positions]
  )

  const [active, setActive] = useState<number | null>(null)
  const [flashKey, setFlashKey] = useState(0) // перезапуск анимаций
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) return
    const planStrike = () => {
      const delay =
        Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay
      timerRef.current = window.setTimeout(() => {
        const i = Math.floor(Math.random() * pts.length)
        setActive(i)
        setFlashKey(k => k + 1)

        // короткая «дробь»: второй слабый импульс через 120мс
        window.setTimeout(() => setFlashKey(k => k + 1), 120)

        // убрать молнию чуть позже, затем запланировать следующую
        window.setTimeout(() => {
          setActive(null)
          planStrike()
        }, 420)
      }, delay) as unknown as number
    }
    planStrike()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled, minDelay, maxDelay, pts])

  if (!enabled) return null

  return (
    <div className="lightLayer" aria-hidden>
      {/* вспышка неба (перезапускается по ключу) */}
      <div key={flashKey} className={`skyFlash ${active != null ? 'is-on' : ''}`} />

      {/* активная молния */}
      {active != null && (
        <Bolt {...pts[active]} />
      )}
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
        {/* основная «жилка» */}
        <polyline
          className="stroke"
          points="60,0 58,26 70,48 55,76 72,102 54,134 68,156 50,188 64,210 60,240"
        />
        {/* небольшие ответвления */}
        <polyline className="stroke thin" points="58,26 44,44 52,58" />
        <polyline className="stroke thin" points="55,76 40,94 48,106" />
        <polyline className="stroke thin" points="54,134 40,150 50,162" />
        <polyline className="stroke thin" points="50,188 36,204 46,214" />
      </svg>
    </div>
  )
}