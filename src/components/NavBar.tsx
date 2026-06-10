'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import Paw from './icons/Paw'

type Item = { href: string; label: string; intro?: 'what'|'ask'|'story' }

const items: Item[] = [
  { href: '/what',  label: 'WHAT IS',   intro: 'what'  },
  { href: '/ask',   label: 'ASK SIGGY', intro: 'ask'   },
  { href: '/story', label: 'NFT STORY', intro: 'story' },
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
      <div className="hdrSunSheen" aria-hidden />

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
