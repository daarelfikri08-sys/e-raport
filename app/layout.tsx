import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'E-Rapor', template: '%s | E-Rapor' },
   description: 'Ruang kerja akademik sekolah untuk administrator, guru mata pelajaran, dan wali kelas. Kelola periode akademik dan kelas dengan lebih tertib.',
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
