'use client'
import { useEffect, useRef } from 'react'

export default function SoftCurtain() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // если предыдущая страница попросила начать затемнённый вход
    const shouldStart = typeof window !== 'undefined' &&
      sessionStorage.getItem('softnav:next') === '1'
    if (shouldStart) {
      ref.current?.classList.add('is-on')
      sessionStorage.removeItem('softnav:next')
      // плавно убираем шторку уже на новой странице
      setTimeout(() => ref.current?.classList.remove('is-on'), 250)
    }

    // поддержка ручных событий (мы их кидаем в page.tsx)
    const on = () => ref.current?.classList.add('is-on')
    const off = () => ref.current?.classList.remove('is-on')
    window.addEventListener('softnav:on', on as EventListener)
    window.addEventListener('softnav:off', off as EventListener)
    return () => {
      window.removeEventListener('softnav:on', on as EventListener)
      window.removeEventListener('softnav:off', off as EventListener)
    }
  }, [])

  return (
    <div
      ref={ref}
      className="softCurtain"
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        pointerEvents: 'none',
        opacity: 0,
        transition: 'opacity .26s ease',
        background:
          'radial-gradient(1200px 600px at 50% -10%, rgba(10,30,24,.75), transparent 60%), #06110D',
      }}
    />
  )
}