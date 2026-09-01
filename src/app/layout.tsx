// File Path: /src/app/layout.tsx
// Status: UPDATE
// Description: Root layout — required by the Next.js App Router. Applies
// the "Trust & Precision" visual identity globally: Inter typeface, a light
// slate-50 background (an exact match for #F8FAFC), and high-contrast
// slate-900 body text. Wraps every route, including /login and the future
// authenticated app shell.

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI QMS',
  description: 'AI-powered gap analysis and quality management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}>
        {children}
      </body>
    </html>
  )
}
