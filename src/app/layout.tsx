// src/app/layout.tsx
import './globals.css'
import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import Header from '../components/Header'
import SoftCurtain from '../components/SoftCurtain'
import AudioToggle from '../components/AudioToggle'

// --- METADATA (title/description/icons остаются здесь)
export const metadata: Metadata = {
  title: 'SiggyLand',
  description: 'A Ritual portal with living products.',
  // файлы лежат в /public → в url пишем без /public
  icons: {
    icon: '/icon.png',    // одна иконка — ок
    apple: '/icon.png',   // можно использовать тот же файл
    // shortcut: '/favicon.ico', // раскомментируешь, если добавишь
  },
}

// --- VIEWPORT: сюда переносим themeColor (чтобы не было варнингов)
export const viewport: Viewport = {
  themeColor: '#06110D',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
        {/* глобальная шторка для мягких переходов */}
        <SoftCurtain />
        {/* компактная кнопка музыки (поверх всего) */}
        <AudioToggle src="/siggyland/audio/siggy-winter-loop.mp3" volume={0.18} />
      </body>
    </html>
  )
}