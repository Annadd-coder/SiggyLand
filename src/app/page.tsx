// src/app/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import CatSticker from '@/components/CatSticker'
import AnchorLayer, { AnchorPinPct } from '@/components/AnchorLayer'
import { trackInteraction } from '@/lib/trackInteraction'

const SHOW_HOME_CATS = false
const CAT_GUIDE_STORAGE_KEY = 'siggy:home-cat-guide-dismissed:v2'

export default function Home() {
  const curtainRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()
  const [showCatGuide, setShowCatGuide] = useState(false)

  useEffect(() => {
    trackInteraction({ type: 'visit_home', value: 1 })
    trackInteraction({ type: 'site_visit', value: 1, metadata: { page: 'home' } })
    const guideTimer = window.setTimeout(() => {
      try {
        setShowCatGuide(localStorage.getItem(CAT_GUIDE_STORAGE_KEY) !== '1')
      } catch {
        setShowCatGuide(true)
      }
    }, 0)

    // мягкая навигация
    const onClick = (e: MouseEvent) => {
      const a = e.currentTarget as HTMLAnchorElement
      const me = e as MouseEvent
      if (me.metaKey || me.ctrlKey || me.shiftKey || me.altKey || a.target === '_blank') return

      const rawHref = a.getAttribute('href') || a.href
      if (!rawHref) return

      const url = new URL(rawHref, window.location.href)
      const isInternal = url.origin === window.location.origin && url.pathname.startsWith('/')

      curtainRef.current?.classList.add('is-on')
      try {
        sessionStorage.setItem('softnav:next', '1')
        window.dispatchEvent(new Event('softnav:on'))
      } catch {}

      e.preventDefault()
      const navAfter = () => {
        if (isInternal) {
          router.push(url.pathname + url.search + url.hash)
        } else {
          window.location.href = url.toString()
        }
      }
      window.setTimeout(navAfter, 180)
    }

    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[data-softnav="1"]'))
    links.forEach(l => l.addEventListener('click', onClick as EventListener))

    return () => {
      window.clearTimeout(guideTimer)
      links.forEach(l => l.removeEventListener('click', onClick as EventListener))
    }
  }, [router])

  const dismissCatGuide = () => {
    setShowCatGuide(false)
    try {
      localStorage.setItem(CAT_GUIDE_STORAGE_KEY, '1')
    } catch {}
  }

  return (
    <main
      className="pageRoot skinHome homePage"
      style={{
        position: 'relative',
        minHeight: '100svh',
        overflow: 'hidden',
      }}
    >
      <section id="cat-grove" className="homeCatField" aria-label="Siggy Land cat ecosystem">
        <div className="homeCatField__scene">
          <div className="homeSceneTitle" aria-hidden="true">
            <span>Siggy Land</span>
          </div>
          {SHOW_HOME_CATS && <HomeCats targetSelector=".homeCatField__scene" />}
          {SHOW_HOME_CATS && showCatGuide && <CatGuide onDone={dismissCatGuide} />}
        </div>
      </section>

      {/* локальная шторка для мягкого перехода */}
      <div ref={curtainRef} className="softCurtain" aria-hidden />

      {/* ✅ ВАЖНО: без styled-jsx, чтобы не было jsx-хэшей и гидрации в кашу */}
      <style>{`
        .softCurtain{
          position: fixed;
          inset: 0;
          z-index: 100;
          pointer-events: none;
          opacity: 0;
          transition: opacity .26s ease;
          background:
            radial-gradient(1200px 600px at 50% -10%, rgba(10,30,24,.75), transparent 60%),
            #06110D;
        }
        .softCurtain.is-on{ opacity:1; pointer-events:auto }
      `}</style>
    </main>
  )
}

function HomeCats({ targetSelector }: { targetSelector: string }) {
  return (
    <AnchorLayer
      baseW={1920}
      baseH={1080}
      targetSelector={targetSelector}
      objectY="38%"
      shiftY={-24}
    >
      <AnchorPinPct xp={73.2} yp={63.8} dx={+50} dy={+95}>
        <CatSticker
          id="anchor-res"
          data-softnav="1"
          src="/siggyland/cats/links-cat.webp"
          alt="Siggy cat - Ritual links"
          title="Open Ritual Links"
          href="https://links.ritual.tools/"
          left="0"
          top="0"
          width="8.2vw"
          hint="Are you a developer? Click here!"
          hintDx={0}
          hintDy={-8}
        />
      </AnchorPinPct>

      <AnchorPinPct xp={70} yp={85}>
        <CatSticker
          data-softnav="1"
          src="/siggyland/cats/academy-cat.png"
          alt="Ritual Academy"
          title="Open Ritual Academy"
          href="https://ritual.academy/about/"
          left="0"
          top="0"
          width="8.2vw"
          hint="Want to learn more? Ritual Academy is here."
          hintDx={-6}
          hintDy={-10}
        />
      </AnchorPinPct>

      <AnchorPinPct xp={95} yp={37} dx={-10} dy={-60}>
        <CatSticker
          data-softnav="1"
          src="/siggyland/cats/twitter-cat.png"
          alt="Ritual on X"
          title="Open Ritual on X"
          href="https://x.com/ritualnet"
          left="0"
          top="0"
          width="8.4vw"
          hint="Ritual on X "
          hintDx={-4}
          hintDy={-12}
        />
      </AnchorPinPct>

      <AnchorPinPct xp={85} yp={81}>
        <CatSticker
          data-softnav="1"
          src="/siggyland/cats/foundation-cat.png"
          alt="Ritual Foundation"
          title="Open Ritual Foundation"
          href="https://www.ritualfoundation.com/"
          left="0"
          top="0"
          width="11vw"
          hint="Ritual Foundation website"
          hintDx={0}
          hintDy={-10}
        />
      </AnchorPinPct>

      <AnchorPinPct xp={65} yp={67}>
        <CatSticker
          data-softnav="1"
          src="/siggyland/cats/discord-cat.png"
          alt="Ritual Discord"
          title="Open Ritual Discord"
          href="https://discord.gg/GnY9Ew9cMX"
          left="0"
          top="0"
          width="8.6vw"
          hint="Join on Discord.  here lives  the community "
          hintDx={2}
          hintDy={-8}
        />
      </AnchorPinPct>

      <AnchorPinPct xp={83} yp={32}>
        <CatSticker
          data-softnav="1"
          src="/siggyland/cats/ritualfnd-x-cat.png"
          alt="Ritual Foundation X"
          title="Open Ritual Foundation X"
          href="https://x.com/ritualfnd"
          left="0"
          top="0"
          width="8vw"
          hint="Open Ritual Foundation X"
          hintDx={-6}
          hintDy={-12}
        />
      </AnchorPinPct>

      <AnchorPinPct xp={13} yp={76}>
        <CatSticker
          id="anchor-eco"
          data-softnav="1"
          src="/siggyland/cats/relic-cat.png"
          alt="Relic Labs on X"
          title="Open Relic Labs on X"
          href="https://x.com/RelicLabs_xyz"
          left="0"
          top="0"
          width="8.8vw"
          hint="Relic Labs. AI-native finance engine on Ritual"
          hintDx={0}
          hintDy={-10}
        />
      </AnchorPinPct>
    </AnchorLayer>
  )
}

function CatGuide({ onDone }: { onDone: () => void }) {
  return (
    <div className="catGuide" role="status" aria-live="polite">
      <Image src="/siggyland/cats/academy-cat.png" alt="" aria-hidden="true" width={176} height={176} />
      <div className="catGuide__bubble">
        <strong>Tap the cats.</strong>
        <span>Each one opens a Ritual doorway: docs, academy, community, ecosystem, or story.</span>
        <button type="button" onClick={onDone}>Got it</button>
      </div>
    </div>
  )
}
