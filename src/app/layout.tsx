import './globals.css'
import type { ReactNode } from 'react'
import Header from '../components/Header'
import SoftCurtain from '../components/SoftCurtain' // ← ДОБАВИЛИ

export const metadata = {
  title: 'SiggyLand',
  description: 'A Ritual portal with living products.',
  themeColor: '#06110D', // ← чтобы адресная строка/система были тёмными
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      {/* head тут не обязателен, themeColor уже задан выше через metadata */}
      <body>
        <Header />
        {children}
        <SoftCurtain /> {/* ← ГЛОБАЛЬНАЯ шторка, переживает роутинг */}
      </body>
    </html>
  )
}