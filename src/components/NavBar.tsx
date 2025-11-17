'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Paw from './icons/Paw'

type Item = { href: string; label: string; intro?: 'what'|'ask'|'story' }

const items: Item[] = [
  { href: '/what',  label: 'WHAT IS',   intro: 'what'  },
  { href: '/ask',   label: 'ASK SIGGY', intro: 'ask'   },
  { href: '/story', label: 'STORY',     intro: 'story' },
]

export default function NavBar() {
  const pathname = usePathname() || '/'

  return (
    <nav className="navBar" aria-label="Primary">
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
                data-nav={intro}       // ← якорь для IntroOverlay (стрелка на навбар)
                data-softnav="1"       // ← мягкий переход со «шторкой»
                href={href}
                prefetch={false}
                className={`navPill${active ? ' is-active' : ''}`}
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