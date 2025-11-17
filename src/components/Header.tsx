'use client'
import Link from 'next/link'
import SiggiBadge from './SiggiBadge'
import NavBar from './NavBar'

export default function Header() {
  return (
    <header className="siteHeader">
      <div className="hdrRow wide left">   {/* ← добавлен класс left */}
        <Link href="/" className="brandWrap" aria-label="SiggyLand — Home">
          <SiggiBadge height={72} mode="single" />
        </Link>
        <NavBar />
      </div>
    </header>
  )
}