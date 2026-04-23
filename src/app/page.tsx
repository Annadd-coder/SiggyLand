// src/app/page.tsx
'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import BackgroundArt from '@/components/BackgroundArt'
import CatSticker from '@/components/CatSticker'
import IntroOverlay from '@/components/IntroOverlay'
import AnchorLayer, { AnchorPinPct } from '@/components/AnchorLayer'
import { trackInteraction } from '@/lib/trackInteraction'

// ✅ AudioToggle без SSR, чтобы не ловить hydration mismatch из-за styled-jsx в компоненте
const AudioToggle = dynamic(() => import('@/components/AudioToggle'), { ssr: false })
const SHOW_HOME_CATS = false

const loreBeats = [
  {
    kicker: '01',
    title: 'The Grove',
    text: 'Siggy Land begins as a quiet grove around Ritual: a place where agents, builders, cats, and strange little signals gather before they become useful paths.',
  },
  {
    kicker: '02',
    title: 'The Sigils',
    text: 'Every doorway is a sigil. Some point to docs and ecosystem projects, others unlock stories, assistant memory, and future chapters of the world.',
  },
  {
    kicker: '03',
    title: 'The Keepers',
    text: 'The cats are not decoration. They are tiny guides for the map: they mark resources, guard lore, and make the whole thing feel less like a dashboard.',
  },
]

const nftNotes = [
  'A Chronicle NFT is a chapter, not a random drop.',
  'Each issue can preserve releases, community sparks, and Ritual moments.',
  'Collectors hold a readable memory of how Siggy Land grows over time.',
]

const assistantNotes = [
  'Explain Ritual in plain language.',
  'Turn raw ideas into launch copy or posts.',
  'Answer lore questions without flattening the magic.',
]

export default function Home() {
  const curtainRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()

  useEffect(() => {
    trackInteraction({ type: 'visit_home', value: 1 })
    trackInteraction({ type: 'site_visit', value: 1, metadata: { page: 'home' } })

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
      links.forEach(l => l.removeEventListener('click', onClick as EventListener))
    }
  }, [router])

  return (
    <main
      className="pageRoot skinHome homePage"
      style={{
        position: 'relative',
        minHeight: 'calc(100svh - var(--headerH))',
        overflow: 'visible',
      }}
    >
      <BackgroundArt
        src="/siggyland/world-bg-desktop.jpg"
        parallax={false}
        mist
        objectY="38%"
        sunGlare
      />

      {/* ─────────────────────────────
          СТАБИЛЬНЫЕ КОТИКИ через AnchorLayer
         ───────────────────────────── */}
      {SHOW_HOME_CATS && (
        <AnchorLayer
          baseW={1920}
          baseH={1080}
          targetSelector=".bgArt.bgArt--full"
          objectY="38%"
          shiftY={-24}
        >
          {/* 1 — Links */}
          <AnchorPinPct xp={73.2} yp={63.8} dx={+50} dy={+95}>
            <CatSticker
              id="anchor-res"
              data-softnav="1"
              src="/siggyland/cats/links-cat.webp"
              alt="Siggy cat — Ritual links"
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

          {/* 2 — Academy */}
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

          {/* 3 — X */}
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

          {/* 4 — Foundation */}
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

          {/* 5 — Discord */}
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

          {/* 6 — Ritual Foundation X */}
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

          {/* 7 — Relic Labs */}
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
      )}

      {/* LEGACY (не рендерим) */}
      {false && (
        <>
          {/* Кот 1 — links */}
          <CatSticker
            id="anchor-res"
            data-softnav="1"
            src="/siggyland/cats/links-cat.webp"
            alt="Siggy cat — Ritual links"
            title="Open Ritual Links"
            href="https://links.ritual.tools/"
            left={`calc(73.2% + 50px)`}
            top={`calc(47.4% + 95px)`}
            width="7.2vw"
          />
          {/* Кот 2 — Academy */}
          <CatSticker
            data-softnav="1"
            src="/siggyland/cats/academy-cat.png"
            alt="Ritual Academy"
            title="Open Ritual Academy"
            href="https://ritual.academy/about/"
            left="88%"
            top="85%"
            width="8.2vw"
          />
          {/* Кот 3 — X */}
          <CatSticker
            data-softnav="1"
            src="/siggyland/cats/twitter-cat.png"
            alt="Ritual on X"
            title="Open Ritual on X"
            href="https://x.com/ritualnet"
            left="calc(96% - 10px)"
            top="calc(40% - 60px)"
            width="8.4vw"
          />
          {/* Кот 4 — Foundation */}
          <CatSticker
            data-softnav="1"
            src="/siggyland/cats/foundation-cat.png"
            alt="Ritual Foundation"
            title="Open Ritual Foundation"
            href="https://www.ritualfoundation.com/"
            left="70%"
            top="50%"
            width="10vw"
          />
          {/* 5 — Discord */}
          <CatSticker
            data-softnav="1"
            src="/siggyland/cats/discord-cat.png"
            alt="Ritual Discord"
            title="Open Ritual Discord"
            href="https://discord.gg/GnY9Ew9cMX"
            left="60%"
            top="78%"
            width="10.6vw"
          />
          {/* 6 — Ritual Foundation X */}
          <CatSticker
            data-softnav="1"
            src="/siggyland/cats/ritualfnd-x-cat.png"
            alt="Ritual Foundation X"
            title="Open Ritual Foundation X"
            href="https://x.com/ritualfnd"
            left="86%"
            top="35%"
            width="8vw"
          />
          {/* 7 — Relic Labs */}
          <CatSticker
            id="anchor-eco"
            data-softnav="1"
            src="/siggyland/cats/relic-cat.png"
            alt="Relic Labs on X"
            title="Open Relic Labs on X"
            href="https://x.com/RelicLabs_xyz"
            left="43%"
            top="57%"
            width="8.8vw"
          />
        </>
      )}

      <section className="homeHero" aria-label="Siggy Land">
        <div className="homeHero__shade" aria-hidden />
        <a className="homeHero__cue" href="#siggy-lore" aria-label="Read more about Siggy Land">
          <span />
        </a>
      </section>

      <section id="siggy-lore" className="homeBand homeBand--lore">
        <div className="homeBand__inner">
          <div className="homeBand__copy">
            <p className="homeKicker">Lore of the land</p>
            <h1 className="homeTitle">Siggy Land is a living map, not a menu.</h1>
            <p className="homeLead">
              The world is built around signals: small signs that lead people into Ritual, reveal useful paths,
              and turn ecosystem discovery into a story you can actually remember.
            </p>
          </div>

          <div className="loreGrid" aria-label="Siggy Land lore notes">
            {loreBeats.map((beat) => (
              <article className="loreTile" key={beat.title}>
                <p className="tileKicker">{beat.kicker}</p>
                <h2>{beat.title}</h2>
                <p>{beat.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="homeBand homeBand--split">
        <div className="homeBand__inner homeSplit">
          <div className="homeArt">
            <Image
              className="homeArt__image"
              src="/siggyland/what-chronicle-art.png"
              alt="Siggy Chronicle collectible chapter"
              width={560}
              height={560}
            />
          </div>

          <div className="homePanel">
            <p className="homeKicker">Chronicle NFT</p>
            <h2 className="homeTitle">A collectible memory for each chapter.</h2>
            <p className="homeLead">
              The Chronicle turns the best moments of Siggy Land and Ritual into a compact on-chain artifact:
              readable, warm, and easy to revisit when the world gets bigger.
            </p>

            <div className="noteStack">
              {nftNotes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>

            <div className="homeActions">
              <Link data-softnav="1" className="homeButton" href="/story">
                Open Story
              </Link>
              <span className="homeMeta">Chapter 1 is preparing its first signal.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="homeBand homeBand--split homeBand--reverse">
        <div className="homeBand__inner homeSplit">
          <div className="homePanel">
            <p className="homeKicker">Ask Siggy</p>
            <h2 className="homeTitle">The assistant is the voice of the grove.</h2>
            <p className="homeLead">
              Siggy helps the world feel understandable. It can answer questions, shape ideas, explain Ritual,
              and keep the lore vivid without turning everything into plain software copy.
            </p>

            <div className="siggyList">
              {assistantNotes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>

            <div className="homeActions">
              <Link data-softnav="1" className="homeButton" href="/ask">
                Ask Siggy
              </Link>
              <Link data-softnav="1" className="homeGhost" href="/what">
                Learn the World
              </Link>
            </div>
          </div>

          <div className="homeArt homeArt--ask">
            <Image
              className="homeArt__image"
              src="/siggyland/what-ask-art.png"
              alt="Ask Siggy assistant"
              width={560}
              height={560}
            />
          </div>
        </div>
      </section>

      <section className="homeFinal">
        <div className="homeFinal__inner">
          <p className="homeKicker">Choose a doorway</p>
          <h2 className="homeTitle">The map gets deeper from here.</h2>
          <div className="homeFinal__links">
            <Link data-softnav="1" href="/what">What is Siggy Land</Link>
            <Link data-softnav="1" href="/ask">Ask Siggy</Link>
            <Link data-softnav="1" href="/story">Chronicle</Link>
          </div>
        </div>
      </section>

      {/* локальная шторка для мягкого перехода */}
      <div ref={curtainRef} className="softCurtain" aria-hidden />

      {/* онбординг (1 раз) */}
      <IntroOverlay />

      {/* ✅ ВОТ ОНА КНОПКА МУЗЫКИ КАК БЫЛА */}
      <AudioToggle
        src="/siggyland/audio/siggy-winter-loop.mp3"
        volume={0.18}
        topOffset="calc(var(--headerH) + 12px)"
      />

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
