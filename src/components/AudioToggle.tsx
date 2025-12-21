// src/components/AudioToggle.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  src: string
  volume?: number
  /** где держать док: по умолчанию — прямо под шапкой */
  topOffset?: string
}

export default function AudioToggle({
  src,
  volume = 0.18,
  topOffset = 'calc(var(--headerH) + 12px)',
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [on, setOn] = useState(false)
  const [isFs, setIsFs] = useState(false)

  // ✅ mount gate, но без раннего return ДО хуков
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('siggy:audio:on')
      if (saved === '1') setOn(true)
    } catch {}

    const onFs = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    el.volume = Math.max(0, Math.min(1, volume))

    if (on) {
      el.muted = false
      el.play().catch(() => {})
      try { localStorage.setItem('siggy:audio:on', '1') } catch {}
    } else {
      el.pause()
      try { localStorage.setItem('siggy:audio:on', '0') } catch {}
    }
  }, [on, volume])

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
      else await document.exitFullscreen()
    } catch {}
  }

  // ✅ теперь ранний return можно, потому что ВСЕ хуки уже вызваны
  if (!mounted) return null

  return (
    <>
      <audio ref={audioRef} src={src} preload="auto" loop muted />

      <div className="siggyAudioDock" style={{ top: topOffset }}>
        {/* Music */}
        <button
          type="button"
          className={`neoBtn ${on ? 'on' : ''}`}
          aria-pressed={on}
          aria-label={on ? 'Pause music' : 'Play music'}
          data-tip={on ? 'Pause' : 'Play'}
          onClick={() => setOn(v => !v)}
        >
          <span className="ring" aria-hidden />
          <span className="sheen" aria-hidden />
          {on ? (
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
              <rect x="5" y="4" width="5" height="16" rx="1.3" />
              <rect x="14" y="4" width="5" height="16" rx="1.3" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
              <path d="M6 4l13 8-13 8z" />
            </svg>
          )}
        </button>

        {/* Fullscreen */}
        <button
          type="button"
          className="neoBtn ghost"
          aria-pressed={isFs}
          aria-label={isFs ? 'Exit full screen' : 'Enter full screen'}
          data-tip={isFs ? 'Exit FS' : 'Full screen'}
          onClick={toggleFullscreen}
        >
          <span className="sheen" aria-hidden />
          {isFs ? (
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
              <path d="M9 3H5a2 2 0 0 0-2 2v4h2V5h4V3zM15 3h4a2 2 0 0 1 2 2v4h-2V5h-4V3zM9 21H5a2 2 0 0 1-2-2v-4h2v4h4v2zM19 21h-4v-2h4v-4h2v4a2 2 0 0 1-2 2z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
              <path d="M9 3v2H5v4H3V5a2 2 0 0 1 2-2h4zm6 0h4a2 2 0 0 1 2 2v4h-2V5h-4V3zM3 15h2v4h4v2H5a2 2 0 0 1-2-2v-4zm18 0v4a2 2 0 0 1-2 2h-4v-2h4v-4h2z" />
            </svg>
          )}
        </button>
      </div>

      <style jsx global>{`
        .siggyAudioDock{
          position: fixed;
          right: calc(14px + env(safe-area-inset-right, 0px));
          z-index: 120;
          display: inline-flex;
          gap: 10px;
          align-items: center;
          pointer-events: auto;
        }

        .neoBtn{
          --c1: var(--brand, #7fe5c9);
          --c2: var(--brand2, #4cc9a6);
          --edge: rgba(0,0,0,.55);
          --glass: rgba(255,255,255,.10);
          position: relative;
          width: 42px; height: 42px;
          display: grid; place-items: center;
          border-radius: 999px;
          border: 1.5px solid rgba(255,255,255,.18);
          background:
            radial-gradient(140% 120% at 30% 0%, rgba(255,255,255,.45), transparent 58%),
            linear-gradient(180deg, var(--glass), rgba(255,255,255,.05));
          box-shadow:
            0 10px 26px rgba(0,0,0,.38),
            inset 0 1px 0 rgba(255,255,255,.35),
            inset 0 -1.5px 0 rgba(0,0,0,.28);
          backdrop-filter: blur(8px) saturate(1.2);
          -webkit-backdrop-filter: blur(8px) saturate(1.2);
          color: #06110D;
          cursor: pointer;
          transition: transform .12s ease, filter .12s ease, box-shadow .12s ease;
          overflow: visible;
        }
        .neoBtn:hover{ transform: translateY(-1px); filter: brightness(1.05) }
        .neoBtn:active{ transform: translateY(0) }
        .neoBtn svg{ display:block; fill: currentColor }

        .neoBtn .ring{
          position:absolute; inset:-3px;
          border-radius: inherit;
          background: conic-gradient(from 0deg, var(--c1), var(--c2), var(--c1));
          filter: blur(6px) saturate(1.2);
          opacity: 0;
          z-index: -1;
          transition: opacity .18s ease;
        }
        .neoBtn.on .ring{ opacity: .65; animation: spin 9s linear infinite }
        @keyframes spin{ to { transform: rotate(360deg) } }

        .neoBtn .sheen{
          content: "";
          position:absolute;
          inset: 2px;
          border-radius: inherit;
          background: radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,.35), transparent 60%);
          pointer-events: none;
          z-index: -1;
        }

        .neoBtn.ghost{
          color: #e6fff6;
          background:
            radial-gradient(140% 120% at 30% 0%, rgba(255,255,255,.25), transparent 58%),
            linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
          border-color: rgba(255,255,255,.22);
        }

        .neoBtn[data-tip]{ position: relative; }
        .neoBtn[data-tip]::after{
          content: attr(data-tip);
          position: absolute;
          bottom: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%) translateY(4px);
          padding: 6px 8px;
          border-radius: 10px;
          font: 800 11px/1 ui-rounded, system-ui, -apple-system, 'Nunito', 'Fredoka', sans-serif;
          letter-spacing: .2px;
          color: #06110D;
          background: linear-gradient(180deg,#eafff3,#c9ffe0);
          border: 1.5px solid #0b0b0f;
          box-shadow: 0 8px 18px rgba(0,0,0,.35);
          pointer-events: none;
          white-space: nowrap;
          opacity: 0;
          transition: opacity .14s ease, transform .14s ease;
        }
        .neoBtn:hover::after,
        .neoBtn:focus-visible::after{
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        @media (max-width: 700px){
          .siggyAudioDock{ right: calc(10px + env(safe-area-inset-right, 0px)) }
          .neoBtn{ width: 44px; height: 44px }
        }
      `}</style>
    </>
  )
}