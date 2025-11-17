// src/components/AnchorLayer.tsx
'use client'

import React, {
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type ReactElement,
} from 'react'

type LayerProps = {
  /** Базовые размеры фоновой картинки (дизайн-плоскость) */
  baseW?: number
  baseH?: number
  /** CSS-селектор контейнера с фоном (тот, где лежит картинка cover) */
  targetSelector?: string
  /** Вертикальная позиция картинки как в CSS object-position, например '38%' или '50%' */
  objectY?: string
  /** Глобальный сдвиг всех пинов в пикселях дизайн-плоскости */
  shiftX?: number
  shiftY?: number
  children: ReactNode
}

/** Парсим '38%' → 0.38; '50' → 0.5; число [0..1] возвращаем как есть */
function parseObjectY(val: string | number | undefined): number {
  if (val == null) return 0.5
  if (typeof val === 'number') return Math.min(1, Math.max(0, val))
  const n = parseFloat(val.toString().replace('%', ''))
  if (!Number.isFinite(n)) return 0.5
  return Math.min(1, Math.max(0, n / 100))
}

/** Слой-якорь: масштабируется и сдвигается 1-в-1 c object-fit: cover и object-position:Y */
export default function AnchorLayer({
  baseW = 1920,
  baseH = 1080,
  targetSelector = '.bgArt.bgArt--full',
  objectY = '50%',
  shiftX = 0,
  shiftY = 0,
  children,
}: LayerProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const roRef = useRef<ResizeObserver | null>(null)
  const rafRef = useRef<number | null>(null)
  const intRef = useRef<number | null>(null)

  const reflow = useCallback(() => {
    if (typeof window === 'undefined') return
    const layer = ref.current
    const target = document.querySelector(targetSelector) as HTMLElement | null
    if (!layer || !target) return

    const r = target.getBoundingClientRect()
    const cw = Math.max(1, r.width)
    const ch = Math.max(1, r.height)

    const iar = baseW / baseH
    const car = cw / ch

    // Масштаб под cover
    const scale = car > iar ? cw / baseW : ch / baseH
    const imgW = baseW * scale
    const imgH = baseH * scale

    // Горизонтально — центр (object-position-x: center)
    const ox = (cw - imgW) / 2

    // Вертикально — учитываем objectY (0% top … 100% bottom)
    const oyP = parseObjectY(objectY)
    let oy = 0
    if (imgH !== ch) {
      // как в CSS: offset = (containerH - imageH) * p
      oy = (ch - imgH) * oyP
    }

    // Глобальные сдвиги в координатах дизайн-плоскости → экранные px
    const sx = shiftX * scale
    const sy = shiftY * scale

    layer.style.transform = `translate(${ox + sx}px, ${oy + sy}px) scale(${scale})`
    layer.style.width = `${baseW}px`
    layer.style.height = `${baseH}px`
  }, [baseW, baseH, targetSelector, objectY, shiftX, shiftY])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // первый расчёт после layout/paint
    rafRef.current = window.requestAnimationFrame(() => reflow())

    const onR = () => reflow()
    window.addEventListener('resize', onR)
    window.addEventListener('load', onR)
    window.addEventListener('orientationchange', onR)

    // наблюдаем за контейнером с фоном
    const target = document.querySelector(targetSelector) as HTMLElement | null
    if ('ResizeObserver' in window && target) {
      roRef.current = new ResizeObserver(() => reflow())
      roRef.current.observe(target)
    }

    // страховка на подгрузку ресурсов/шрифтов
    intRef.current = window.setInterval(onR, 300)
    try {
     
      document.fonts?.ready?.then?.(() => reflow())
    } catch {}

    return () => {
      window.removeEventListener('resize', onR)
      window.removeEventListener('load', onR)
      window.removeEventListener('orientationchange', onR)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (intRef.current) clearInterval(intRef.current)
      if (roRef.current && target) {
        try { roRef.current.unobserve(target) } catch {}
        try { roRef.current.disconnect() } catch {}
      }
    }
  }, [reflow, targetSelector])

  return (
    <div
      ref={ref}
      className="anchorLayer"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transformOrigin: 'top left',
        pointerEvents: 'none', // клики отдаем детям
        zIndex: 3, // выше фона, ниже интро
      }}
    >
      {children}
    </div>
  )
}

/** Пин по пикселям дизайн-плоскости */
type AnchorPinProps = {
  x: number
  y: number
  children: ReactNode
}

export function AnchorPin({ x, y, children }: AnchorPinProps): ReactElement {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        // важно: вернуть события детям внутри слоя с pointer-events:none
        pointerEvents: 'auto',
      }}
    >
      {children}
    </div>
  )
}

/** Пин в процентах дизайн-плоскости + небольшие сдвиги (dx/dy) в px */
export type AnchorPinPctProps = {
  xp: number
  yp: number
  dx?: number
  dy?: number
  baseW?: number
  baseH?: number
  children: ReactNode
}

export function AnchorPinPct({
  xp,
  yp,
  dx = 0,
  dy = 0,
  baseW = 1920,
  baseH = 1080,
  children,
}: AnchorPinPctProps): ReactElement {
  const x = (xp / 100) * baseW + dx
  const y = (yp / 100) * baseH + dy
  return <AnchorPin x={x} y={y}>{children}</AnchorPin>
}