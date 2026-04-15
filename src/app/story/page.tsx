'use client'

import React from 'react'

const STORY_LAUNCH_AT = new Date('2026-06-01T00:00:00Z').getTime()

type CountdownState = {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function getCountdownState(now = Date.now()): CountdownState {
  const diff = Math.max(0, STORY_LAUNCH_AT - now)
  const totalSeconds = Math.floor(diff / 1000)

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export default function StoryPage() {
  const [countdown, setCountdown] = React.useState<CountdownState>(() => getCountdownState())
  const siteFont = 'var(--font-site)'

  React.useEffect(() => {
    const timerId = window.setInterval(() => {
      setCountdown(getCountdownState())
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [])

  const shellStyle: React.CSSProperties = {
    width: 'min(980px, 100%)',
    background: 'rgba(11, 15, 13, 0.92)',
    border: '1px solid rgba(255, 231, 176, 0.18)',
    borderRadius: 24,
    boxShadow: '0 20px 48px rgba(0,0,0,.34)',
    padding: '28px',
    color: '#fff9ea',
  }

  const metaStyle: React.CSSProperties = {
    margin: 0,
    fontFamily: siteFont,
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
    fontSize: 12,
    fontWeight: 800,
    color: 'rgba(255, 235, 188, 0.82)',
  }

  const titleStyle: React.CSSProperties = {
    margin: '14px 0 10px',
    fontFamily: siteFont,
    fontSize: 'clamp(32px, 5vw, 56px)',
    lineHeight: 0.94,
    letterSpacing: '-0.02em',
    fontWeight: 900,
    color: '#fff9ea',
  }

  const dateStyle: React.CSSProperties = {
    margin: 0,
    fontFamily: siteFont,
    fontSize: 14,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'rgba(236, 241, 224, 0.76)',
  }

  return (
    <main
      className="pageRoot skinStory skinStoryBlue"
      style={{
        position: 'relative',
        minHeight: 'calc(100svh - var(--headerH))',
        overflow: 'auto',
      }}
    >
      <section
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: 'calc(100svh - var(--headerH))',
          display: 'grid',
          alignItems: 'center',
          width: 'min(1120px, 92vw)',
          margin: '0 auto',
          padding: '32px 0 48px',
        }}
      >
        <div style={shellStyle}>
          <p style={metaStyle}></p>
          <h1 style={titleStyle}>Chapter 1</h1>
          <p style={dateStyle}>June 1, 2026 · 12:00 UTC</p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(220px, 1.35fr) repeat(3, minmax(110px, 1fr))',
              gap: 12,
              marginTop: 24,
            }}
          >
            <div
              style={{
                borderRadius: 20,
                border: '1px solid rgba(255, 232, 180, 0.14)',
                background: 'rgba(20, 28, 23, 0.92)',
                padding: '24px 18px 20px',
              }}
            >
              <div
                style={{
                  fontFamily: siteFont,
                  fontSize: 'clamp(84px, 11vw, 148px)',
                  lineHeight: 0.9,
                  letterSpacing: '-0.04em',
                  fontWeight: 900,
                  color: '#fff9ea',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {countdown.days}
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontFamily: siteFont,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'rgba(234, 239, 214, 0.78)',
                }}
              >
                Days
              </div>
            </div>

            {[
              { label: 'Hours', value: pad(countdown.hours) },
              { label: 'Minutes', value: pad(countdown.minutes) },
              { label: 'Seconds', value: pad(countdown.seconds) },
            ].map((unit) => (
              <div
                key={unit.label}
                style={{
                  borderRadius: 16,
                  border: '1px solid rgba(255, 232, 180, 0.12)',
                  background: 'rgba(20, 28, 23, 0.88)',
                  padding: '20px 14px 16px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: siteFont,
                    fontSize: 'clamp(48px, 6vw, 76px)',
                    lineHeight: 0.94,
                    letterSpacing: '-0.03em',
                    fontWeight: 900,
                    color: '#fff9ea',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {unit.value}
                </div>
                <div
                  style={{
                    marginTop: 10,
                    fontFamily: siteFont,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'rgba(234, 239, 214, 0.78)',
                  }}
                >
                  {unit.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
