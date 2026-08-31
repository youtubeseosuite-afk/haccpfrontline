// File Path: /src/app/layout.tsx
// Status: NEW FILE
// Description: Root layout — required by the Next.js App Router. Loads
//              global styles and sets base page metadata.

import type { Metadata } from 'next'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}
