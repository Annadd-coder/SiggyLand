// src/components/CatSticker.tsx
'use client'
import React, { useId } from 'react'

type BaseProps = {
  src: string
  alt?: string
  title?: string
  href: string
  left: string
  top: string
  width?: string
  /** Текст облачка-подсказки (необязательно) */
  hint?: string
  /** Сместить облачко по X/Y (px) относительно центра над котом */
  hintDx?: number
  hintDy?: number
}

/** Пробрасываем ВСЕ стандартные атрибуты <a> (id, data-*, aria-*, target, rel, className, style...) */
type Props = BaseProps & React.AnchorHTMLAttributes<HTMLAnchorElement>

export default function CatSticker({
  src,
  alt = '',
  title,
  href,
  left,
  top,
  width = '8vw',
  hint,
  hintDx = 0,
  hintDy = -14,
  className,
  style,
  ...rest
}: Props) {
  // ✅ Стабильный SSR/CSR id (без Math.random)
  const autoId = useId()
  const hintId = hint ? (rest.id ? `${rest.id}-hint` : `hint-${autoId}`) : undefined

  return (
    <a
      {...rest}
      href={href}
      title={title}
      className={['catSticker', 'pin', className].filter(Boolean).join(' ')}
      aria-describedby={hint ? hintId : rest['aria-describedby']}
      style={{
        left,
        top,
        width,
        position: 'absolute',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'auto',
        textDecoration: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        ...(style || {}),
      }}
    >
      <img src={src} alt={alt} draggable={false} />

      {hint && (
        <span
          id={hintId}
          className="catHint"
          role="tooltip"
          style={{
            left: `calc(50% + ${hintDx}px)`,
            bottom: `calc(100% - 6px + ${hintDy}px)`,
          }}
        >
          {hint}
          <i className="tail" aria-hidden="true" />
        </span>
      )}
    </a>
  )
}