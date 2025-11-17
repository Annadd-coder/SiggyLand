// src/app/layout.tsx
import './globals.css'
import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import Header from '../components/Header'
import SoftCurtain from '../components/SoftCurtain'

// МЕТАДАННЫЕ
export const metadata: Metadata = {
  title: 'SiggyLand',
  description: 'A Ritual portal with living products.',
  // важно: файлы лежат в /public, но в url пишем без /public
  icons: {
    icon: '/icon.png',   // один файл — ок
    apple: '/icon.png',  // тот же файл пойдёт и как apple-touch
    // shortcut: '/favicon.ico', // подключишь позже, если будет
  },
}

// VIEWPORT (сюда перенесли themeColor)
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
      </body>
    </html>
  )
}