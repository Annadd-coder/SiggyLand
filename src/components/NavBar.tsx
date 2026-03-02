'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import Paw from './icons/Paw'

type Item = { href: string; label: string; intro?: 'what'|'ask'|'story' }
type SnowFlakeVars = CSSProperties & Record<'--d' | '--delay' | '--sway', string>

const items: Item[] = [
  { href: '/what',  label: 'WHAT IS',   intro: 'what'  },
  { href: '/ask',   label: 'ASK SIGGY', intro: 'ask'   },
  { href: '/story', label: 'STORY',     intro: 'story' },
]

export default function NavBar() {
  const pathname = usePathname() || '/'
  const [visible, setVisible] = useState(true)
  const hoverCapable = useMemo(
    () => (typeof window !== 'undefined' ? !window.matchMedia('(hover: none)').matches : true),
    []
  )
  const hideTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!hoverCapable) {
      document.body.classList.remove('header-hide')
      return
    }
    const headerEl = document.querySelector('.siteHeader') as HTMLElement | null
    const HIDE_DELAY = 1400
    const THRESHOLD_Y = 110

    const show = () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
      setVisible(true)
      document.body.classList.remove('header-hide')
    }
    const scheduleHide = () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
      hideTimer.current = window.setTimeout(() => {
        setVisible(false)
        document.body.classList.add('header-hide')
      }, HIDE_DELAY)
    }

    // показываем, если курсор у верхнего края
    const onMove = (e: MouseEvent) => {
      if (e.clientY <= THRESHOLD_Y) show()
      else if (!headerEl || !headerEl.matches(':hover')) scheduleHide()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Tab') show() }

    // реакции на сам header
    headerEl?.addEventListener('mouseenter', show)
    headerEl?.addEventListener('mouseleave', scheduleHide)

    window.addEventListener('mousemove', onMove)
    window.addEventListener('keydown', onKey)

    // стартовое состояние
    scheduleHide()

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
      headerEl?.removeEventListener('mouseenter', show)
      headerEl?.removeEventListener('mouseleave', scheduleHide)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('header-hide')
    }
  }, [hoverCapable])

  return (
    <nav className="navBar navBar--frost" aria-label="Primary" data-visible={visible ? '1' : '0'}>
      {/* тонкий снежок над шапкой */}
      <div className="hdrSnow" aria-hidden>
        {Array.from({ length: 34 }).map((_, i) => {
          const vars: SnowFlakeVars = {
            '--d': `${4 + (i % 7) * 0.6}s`,
            '--delay': `${(i % 10) * 0.18}s`,
            '--sway': `${8 + (i % 5) * 5}px`,
          }

          return (
            <span
              key={i}
              className="flake"
              style={{
                left: `${(i * 29) % 100}%`,
                width: `${2 + (i % 3)}px`,
                height: `${2 + (i % 3)}px`,
                ...vars,
              }}
            />
          )
        })}
      </div>

      <ul className="navList">
        {items.map(({ href, label, intro }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          const id =
            intro === 'what' ? 'nav-what' :
            intro === 'ask'  ? 'nav-ask'  :
            intro === 'story'? 'nav-story': undefined

          return (
            <li key={href}>
              <Link
                id={id}
                data-nav={intro}
                data-softnav="1"
                href={href}
                prefetch={false}
                className={`navPill navPill--ice${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                title={label}
              >
                <span className="navPaw" aria-hidden="true"><Paw size={28} /></span>
                <span className="navLabel">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
