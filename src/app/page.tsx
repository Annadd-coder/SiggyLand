// src/app/page.tsx
'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import BackgroundArt from '@/components/BackgroundArt'
import CatSticker from '@/components/CatSticker'
import IntroOverlay from '@/components/IntroOverlay'
import AnchorLayer, { AnchorPinPct } from '@/components/AnchorLayer'

// ✅ AudioToggle без SSR, чтобы не ловить hydration mismatch из-за styled-jsx в компоненте
const AudioToggle = dynamic(() => import('@/components/AudioToggle'), { ssr: false })

export default function Home() {
  const curtainRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()

  useEffect(() => {
    // запрет скролла на главной
    const html = document.documentElement
    const body = document.body
    const style = body.style as any

    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    const prevOSB = style.overscrollBehavior as string | undefined
    const prevTouch = style.touchAction as string | undefined

    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    style.overscrollBehavior = 'none'
    style.touchAction = 'none'

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
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
      style.overscrollBehavior = prevOSB
      style.touchAction = prevTouch
      links.forEach(l => l.removeEventListener('click', onClick as EventListener))
    }
  }, [router])

  return (
    <main
      className="pageRoot"
      style={{
        position: 'relative',
        minHeight: 'calc(100svh - var(--headerH))',
        height: 'calc(100svh - var(--headerH))',
        overflow: 'hidden',
      }}
    >
      <BackgroundArt
        src="/siggyland/world-bg-desktop.jpg"
        parallax={false}
        mist
        objectY="38%"
        /* ↓ молнии убраны, включаем снег */
        snow
        snowCount={180}
        snowSpeedBase={14}
        snowDrift={28}
      />

      {/* GIF-оверлей — ДВИЖЕНИЕ КАК У КОТИКОВ:
          меняй left/top/width прямо в style ниже */}
      <div className="gifOverlay" aria-hidden>
        {/* Пример 1 — проценты (как у твоего Foundation-кота) */}
        <div
          id="gif-2"
          className="gifSticker"
          style={{ left: '35%', top: '82%', width: '20vw' }}
        >
          <Image
            className="gifImg"
            src="/siggyland/gifs/gif-2.gif"
            alt=""
            width={800}
            height={800}
            unoptimized
          />
        </div>

        {/* Пример 2 — calc(% ± px) */}
        <div
          id="gif-1"
          className="gifSticker"
          style={{ left: 'calc(50.2% + 50px)', top: 'calc(63.4% + 95px)', width: '25vw' }}
        >
          <Image
            className="gifImg"
            src="/siggyland/gifs/gif-1.gif"
            alt=""
            width={800}
            height={800}
            unoptimized
          />
        </div>
      </div>

      {/* ─────────────────────────────
          СТАБИЛЬНЫЕ КОТИКИ через AnchorLayer
         ───────────────────────────── */}
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

        .gifOverlay{
          position: fixed;
          inset: 0;
          z-index: 90;
          pointer-events: none;
        }
        .gifSticker{
          position: absolute;
          transform: translate(-50%, -50%);
        }
        .gifImg{
          display: block;
          width: 100%;
          height: auto;
          image-rendering: auto;
          filter:
            drop-shadow(0 8px 20px rgba(0,0,0,.45))
            drop-shadow(0 0 14px rgba(160,245,230,.18));
        }
      `}</style>
    </main>
  )
}