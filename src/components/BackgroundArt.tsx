// src/components/BackgroundArt.tsx
'use client'
import React, { useRef } from 'react'

type BgArtVars = React.CSSProperties & Record<'--bgY' | '--bgYMobile', string>

type Props = {
  /** Десктопный фон (лежит в /public) */
  src?: string
  /** Мобильный фон (если нет — используется src) */
  mobileSrc?: string
  /** object-position-Y для десктопа (например '38%') */
  objectY?: string
  /** object-position-Y для мобилы (если не задан — берём objectY) */
  objectYMobile?: string

  /** Пар над водой */
  mist?: boolean

  /** Летние солнечные блики поверх арта */
  sunGlare?: boolean

  /** совместимость */
  parallax?: boolean
}

export default function BackgroundArt({
  src = '/siggyland/world-bg-desktop.jpg',
  mobileSrc,
  objectY = '55%',
  objectYMobile,

  mist = true,
  sunGlare = false,

  parallax = false,
}: Props) {
  // фолбэк для проблемных форматов
  const triedFallbackRef = useRef(false)
  const onImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (triedFallbackRef.current) return
    triedFallbackRef.current = true

    const img = e.currentTarget
    const cur = img.currentSrc || img.src

    // если упал mobileSrc — уводим на desktop src
    if (mobileSrc && cur.includes(mobileSrc)) {
      img.src = src
      return
    }

    // дальше — замены формата
    if (cur.endsWith('.webp')) img.src = cur.replace(/\.webp$/, '.png')
    else if (cur.endsWith('.jpg') || cur.endsWith('.jpeg')) img.src = cur.replace(/\.jpe?g$/, '.png')
    else if (cur.endsWith('.png')) img.style.display = 'none'
  }

  const yMobile = objectYMobile ?? objectY

  return (
    <div
      className={`bgArt bgArt--full ${parallax ? 'bgArt--parallax' : ''}`}
      aria-hidden
      style={
        {
          // ✅ управляем object-position через CSS переменные (и media-query)
          '--bgY': objectY,
          '--bgYMobile': yMobile,
        } as BgArtVars
      }
    >
      {/* фон */}
      <div className="bgArt__imageWrap bgArt--cover">
        <picture>
          {mobileSrc ? <source media="(max-width: 700px)" srcSet={mobileSrc} /> : null}
          <img
            src={src}
            alt=""
            loading="eager"
            decoding="async"
            fetchPriority="high"
            onError={onImgError}
            className="bgArt__img"
          />
        </picture>
      </div>

      {/* пар */}
      {mist && (
        <div className="bgArt__fx">
          <div className="mist mist--pond" />
          <div className="mist mist--wispL" />
          <div className="mist mist--wispR" />
        </div>
      )}

      {/* летние блики */}
      {sunGlare && <SunGlareLayer />}

      {/* хотспот по статуе */}
      <div className="bgArt__hotspots">
        <a
          className="hotspot hotspot--cat"
          href="https://www.ritualfoundation.org/docs/overview/what-is-ritual"
          aria-label="Open Ritual docs — What is Ritual"
          title="Open Ritual docs — What is Ritual"
        />
      </div>

      {/* стили (оставляем локально как у тебя) */}
      <style jsx global>{`
        .bgArt__img{
          width:100%;
          height:100%;
          object-fit:cover;
          object-position:center var(--bgY, 50%);
          display:block;
        }
        @media (max-width:700px){
          .bgArt__img{
            object-position:center var(--bgYMobile, var(--bgY, 50%));
          }
        }

        .sunGlareLayer{
          position:absolute; inset:0; pointer-events:none; overflow:hidden;
          z-index:2;
          transform: translate(-6cm, -1cm);
          will-change: transform;
        }
        .sunGlow{
          position:absolute;
          border-radius:999px;
          will-change: transform, opacity;
        }
        .sunGlareLayer::before{
          content:'';
          position:absolute;
          inset:0;
          background:
            radial-gradient(54% 42% at 18% 4%, rgba(255, 240, 182, .24), transparent 72%),
            linear-gradient(180deg, rgba(255, 228, 145, .14), rgba(255,255,255,0) 28%);
          opacity:.9;
        }
        .sunGlow--halo{
          top:-31%;
          left:-14%;
          width:min(58vw, 920px);
          height:min(58vw, 920px);
          background:
            radial-gradient(circle,
              rgba(255,255,255,.58) 0,
              rgba(255,244,194,.34) 18%,
              rgba(255,220,125,.18) 36%,
              rgba(255,197,96,0) 68%);
          filter: blur(26px);
          opacity:.9;
          animation: sunHaloDrift 18s ease-in-out infinite alternate;
        }
        .sunGlow--core{
          top:-2%;
          left:10%;
          width:min(18vw, 260px);
          aspect-ratio:1;
          background:
            radial-gradient(circle at 34% 34%,
              rgba(255,255,255,.98) 0 9%,
              rgba(255,247,208,.94) 18%,
              rgba(255,223,138,.76) 36%,
              rgba(255,196,90,.26) 56%,
              rgba(255,196,90,0) 76%);
          filter: blur(3px);
          opacity:.96;
          animation: sunPulse 12s ease-in-out infinite;
        }
        .sunGlow--beam{
          top:-9%;
          left:4%;
          width:min(76vw, 1180px);
          height:42%;
          background:
            linear-gradient(52deg,
              rgba(255,251,235,.40) 0%,
              rgba(255,230,160,.26) 16%,
              rgba(255,214,120,.12) 28%,
              rgba(255,255,255,0) 58%);
          clip-path: polygon(0 0, 100% 0, 88% 100%, 30% 100%);
          filter: blur(16px);
          opacity:.62;
          transform: rotate(-12deg);
          mix-blend-mode: screen;
          animation: sunBeamShift 14s ease-in-out infinite;
        }
        .sunGlow--orb{
          aspect-ratio:1;
          background:
            radial-gradient(circle at 36% 36%,
              rgba(255,255,255,.24),
              rgba(255,233,165,.17) 48%,
              rgba(255,210,120,0) 72%);
          border:1px solid rgba(255,245,210,.14);
          mix-blend-mode: screen;
          filter: blur(.2px);
        }
        .sunGlow--orbA{
          top:13%;
          left:23%;
          width:min(12vw, 164px);
          opacity:.34;
          animation: lensFloat 18s ease-in-out infinite;
        }
        .sunGlow--orbB{
          top:24%;
          left:35%;
          width:min(7vw, 94px);
          opacity:.24;
          animation: lensFloat 15s ease-in-out -4s infinite;
        }
        .sunGlow--orbC{
          top:34%;
          left:45%;
          width:min(4.5vw, 60px);
          opacity:.18;
          animation: lensFloat 12s ease-in-out -7s infinite;
        }
        .sunGlow--spark{
          width:28px;
          height:28px;
          background:
            radial-gradient(circle,
              rgba(255,255,255,.96) 0 10%,
              rgba(255,247,208,.82) 18%,
              rgba(255,216,122,.32) 42%,
              rgba(255,216,122,0) 76%);
          mix-blend-mode: screen;
          filter: drop-shadow(0 0 18px rgba(255, 226, 145, .55));
        }
        .sunGlow--sparkA{
          top:16%;
          left:20%;
          opacity:.72;
          animation: sparkleBlink 7.5s ease-in-out infinite;
        }
        .sunGlow--sparkB{
          top:28%;
          left:32%;
          width:20px;
          height:20px;
          opacity:.46;
          animation: sparkleBlink 9.5s ease-in-out -2.4s infinite;
        }
        @keyframes sunPulse {
          0%, 100% { opacity: .88; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes sunHaloDrift {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          100% { transform: translate3d(-2%, 2%, 0) scale(1.06); }
        }
        @keyframes sunBeamShift {
          0%, 100% { opacity: .45; transform: translate3d(0, 0, 0) rotate(-12deg); }
          50% { opacity: .72; transform: translate3d(3%, 2%, 0) rotate(-8deg); }
        }
        @keyframes lensFloat {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-10px, 8px, 0) scale(1.07); }
        }
        @keyframes sparkleBlink {
          0%, 100% { opacity: .3; transform: scale(.9); }
          40% { opacity: .85; transform: scale(1.16); }
          68% { opacity: .48; transform: scale(1); }
        }
        @media (max-width:700px){
          .sunGlow--halo{
            top:-18%;
            left:-28%;
            width:min(92vw, 560px);
            height:min(92vw, 560px);
          }
          .sunGlow--core{
            top:0;
            left:8%;
            width:min(30vw, 180px);
          }
          .sunGlow--beam{
            top:-4%;
            left:-2%;
            width:96vw;
            height:30%;
            opacity:.42;
          }
          .sunGlow--orbA{
            top:16%;
            left:24%;
            width:min(18vw, 112px);
          }
          .sunGlow--orbB{
            top:25%;
            left:37%;
            width:min(12vw, 74px);
          }
          .sunGlow--orbC{
            top:33%;
            left:49%;
            width:min(8vw, 48px);
          }
          .sunGlow--sparkA{ top:19%; left:18%; }
          .sunGlow--sparkB{ top:28%; left:31%; }
        }
        @media (prefers-reduced-motion: reduce){
          .sunGlow{ animation:none; }
        }
      `}</style>
    </div>
  )
}

function SunGlareLayer() {
  return (
    <div className="sunGlareLayer" aria-hidden>
      <span className="sunGlow sunGlow--halo" />
      <span className="sunGlow sunGlow--beam" />
      <span className="sunGlow sunGlow--core" />
      <span className="sunGlow sunGlow--orb sunGlow--orbA" />
      <span className="sunGlow sunGlow--orb sunGlow--orbB" />
      <span className="sunGlow sunGlow--orb sunGlow--orbC" />
      <span className="sunGlow sunGlow--spark sunGlow--sparkA" />
      <span className="sunGlow sunGlow--spark sunGlow--sparkB" />
    </div>
  )
}
