// src/app/page.tsx
'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import BackgroundArt from '@/components/BackgroundArt'
import CatSticker from '@/components/CatSticker'
import IntroOverlay from '@/components/IntroOverlay'
import AnchorLayer, { AnchorPinPct } from '@/components/AnchorLayer'

export default function Home() {
  const curtainRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()

  useEffect(() => {
    // запрет скролла на главной
    const html = document.documentElement
    const body = document.body
    const style = body.style as any // ← для overscrollBehavior / touchAction

    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    const prevOSB = style.overscrollBehavior as string | undefined
    const prevTouch = style.touchAction as string | undefined

    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    style.overscrollBehavior = 'none'
    style.touchAction = 'none'

    // мягкая навигация для всех ссылок со спец-атрибутом
    const onClick = (e: MouseEvent) => {
      const a = e.currentTarget as HTMLAnchorElement

      // модификаторы/target=_blank — не перехватываем
      const me = e as MouseEvent
      if (me.metaKey || me.ctrlKey || me.shiftKey || me.altKey || a.target === '_blank') return

      const rawHref = a.getAttribute('href') || a.href
      if (!rawHref) return

      const url = new URL(rawHref, window.location.href)
      const isInternal = url.origin === window.location.origin && url.pathname.startsWith('/')

      // локальная шторка + глобальный флаг
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
        lightning
        lightningMinDelay={2200}
        lightningMaxDelay={5200}
        objectY="38%"
      />

      {/* ─────────────────────────────
          СТАБИЛЬНЫЕ КОТИКИ через AnchorLayer
          Дизайн-плоскость: 1920×1080
          Перенос твоих координат: left/top в % и calc(% ± px) → xp/yp + dx/dy
         ───────────────────────────── */}
      <AnchorLayer
        baseW={1920}
        baseH={1080}
        targetSelector=".bgArt.bgArt--full"
        objectY="38%"   // ← СОВПАДАЕТ с objectY у BackgroundArt
        shiftY={-24}    // ← общий подъём всех котиков
      >
        {/* 1 — Links (был: left calc(73.2% + 50px), top calc(47.4% + 95px), 7.2vw) */}
        <AnchorPinPct xp={73.2} yp={46.8} dx={+50} dy={+95}>
          <CatSticker
            id="anchor-res"
            data-softnav="1"
            src="/siggyland/cats/links-cat.webp"
            alt="Siggy cat — Ritual links"
            title="Open Ritual Links"
            href="https://links.ritual.tools/"
            left="0" top="0"
            width="7.2vw"
            hint="Are you a developer? Click here!"
            hintDx={0}
            hintDy={-8}
          />
        </AnchorPinPct>

        {/* 2 — Academy (88%, 85%, 9.2vw) */}
        <AnchorPinPct xp={88} yp={76}>
          <CatSticker
            data-softnav="1"
            src="/siggyland/cats/academy-cat.png"
            alt="Ritual Academy"
            title="Open Ritual Academy"
            href="https://ritual.academy/about/"
            left="0" top="0"
            width="9.2vw"
            hint="Want to learn more? Ritual Academy is here."
            hintDx={-6}
            hintDy={-10}
          />
        </AnchorPinPct>

        {/* 3 — X (left calc(96% - 10px), top calc(40% - 60px), 8.4vw) */}
        <AnchorPinPct xp={95} yp={39} dx={-10} dy={-60}>
          <CatSticker
            data-softnav="1"
            src="/siggyland/cats/twitter-cat.png"
            alt="Ritual on X"
            title="Open Ritual on X"
            href="https://x.com/ritualnet"
            left="0" top="0"
            width="8.4vw"
            hint="Ritual on X "
            hintDx={-4}
            hintDy={-12}
          />
        </AnchorPinPct>

        {/* 4 — Foundation (77%, 87%, 9vw) */}
        <AnchorPinPct xp={77} yp={81}>
          <CatSticker
            data-softnav="1"
            src="/siggyland/cats/foundation-cat.png"
            alt="Ritual Foundation"
            title="Open Ritual Foundation"
            href="https://www.ritualfoundation.com/"
            left="0" top="0"
            width="9vw"
            hint="Ritual Foundation website"
            hintDx={0}
            hintDy={-10}
          />
        </AnchorPinPct>

        {/* 5 — Discord (корректированная точка) */}
        <AnchorPinPct xp={68} yp={69}>
          <CatSticker
            data-softnav="1"
            src="/siggyland/cats/discord-cat.png"
            alt="Ritual Discord"
            title="Open Ritual Discord"
            href="https://discord.gg/GnY9Ew9cMX"
            left="0" top="0"
            width="9.6vw"
            hint="Join on Discord.  here lives  the community "
            hintDx={2}
            hintDy={-8}
          />
        </AnchorPinPct>

        {/* 6 — Ritual Foundation X (84%, 34%, 9vw) */}
        <AnchorPinPct xp={85} yp={34}>
          <CatSticker
            data-softnav="1"
            src="/siggyland/cats/ritualfnd-x-cat.png"
            alt="Ritual Foundation X"
            title="Open Ritual Foundation X"
            href="https://x.com/ritualfnd"
            left="0" top="0"
            width="9vw"
            hint="Open Ritual Foundation X"
            hintDx={-6}
            hintDy={-12}
          />
        </AnchorPinPct>

        {/* 7 — Relic Labs (23%, 53%, 8.8vw) */}
        <AnchorPinPct xp={23} yp={53}>
          <CatSticker
            id="anchor-eco"
            data-softnav="1"
            src="/siggyland/cats/relic-cat.png"
            alt="Relic Labs on X"
            title="Open Relic Labs on X"
            href="https://x.com/RelicLabs_xyz"
            left="0" top="0"
            width="8.8vw"
            hint="Relic Labs. AI-native finance engine on Ritual"
            hintDx={0}
            hintDy={-10}
          />
        </AnchorPinPct>
      </AnchorLayer>

      {/* ─────────────────────────────
          LEGACY (оставляю нетронутыми, но не рендерим)
          НИЧЕГО НЕ УДАЛЯЮ — можно включить для сравнения, поменяв false → true
         ───────────────────────────── */}
      {false && (
        <>
          {/* Кот 1 — links (как было) */}
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
            width="9.2vw"
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
            left="77%"
            top="87%"
            width="9vw"
          />

          {/* 5 — Discord */}
          <CatSticker
            data-softnav="1"
            src="/siggyland/cats/discord-cat.png"
            alt="Ritual Discord"
            title="Open Ritual Discord"
            href="https://discord.gg/GnY9Ew9cMX"
            left="70%"
            top="78%"
            width="9.6vw"
          />

          {/* 6 — Ritual Foundation X */}
          <CatSticker
            data-softnav="1"
            src="/siggyland/cats/ritualfnd-x-cat.png"
            alt="Ritual Foundation X"
            title="Open Ritual Foundation X"
            href="https://x.com/ritualfnd"
            left="84%"
            top="33%"
            width="9vw"
          />

          {/* 7 — Relic Labs */}
          <CatSticker
            id="anchor-eco"
            data-softnav="1"
            src="/siggyland/cats/relic-cat.png"
            alt="Relic Labs on X"
            title="Open Relic Labs on X"
            href="https://x.com/RelicLabs_xyz"
            left="23%"
            top="57%"
            width="8.8vw"
          />
        </>
      )}

      {/* локальная шторка для мягкого перехода */}
      <div ref={curtainRef} className="softCurtain" aria-hidden />

      {/* онбординг (1 раз) */}
      <IntroOverlay />

      <style jsx>{`
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