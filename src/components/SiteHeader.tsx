'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function SiteHeader() {
  const pathname = usePathname()
  const is = (p: string) => pathname === p

  return (
    <header className="siteHeader">
      <div className="wide">
        <div className="hdrRow left">
          {/* Лого → домой */}
          <Link href="/" className="brandWrap" aria-label="Siggy Land — Home">
            <span className="brandText">
              <span className="brand-letter">S</span>
              <span className="brand-letter">i</span>
              <span className="brand-letter">g</span>
              <span className="brand-letter">g</span>
              <span className="brand-letter">y</span>&nbsp;
              <span className="brand-letter">L</span>
              <span className="brand-letter">a</span>
              <span className="brand-letter">n</span>
              <span className="brand-letter">d</span>
            </span>
          </Link>

          {/* Навигация */}
          <nav className="navBar" aria-label="Primary">
            <ul className="navList">
              <li>
                <Link href="/what" className={`navPill${is('/what') ? ' is-active' : ''}`}>
                  <span className="navLabel">WHAT IS</span>
                  <span className="badgeSoon">SOON</span>
                </Link>
              </li>
              <li>
                <Link href="/why" className={`navPill${is('/why') ? ' is-active' : ''}`}>
                  <span className="navLabel">WHY THIS</span>
                  <span className="badgeSoon">SOON</span>
                </Link>
              </li>
              <li>
                <Link href="/how" className={`navPill${is('/how') ? ' is-active' : ''}`}>
                  <span className="navLabel">HOW IT WORKS</span>
                  <span className="badgeSoon">SOON</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
      <style jsx>{`
        /* необязательно, но приятно подсветить активную */
        .is-active { filter: brightness(1.06); transform: translateY(-1px); }
      `}</style>
    </header>
  )
}