// File Path: /src/app/page.tsx
// Status: UPDATE
// Description: Public landing page. Replaces the Phase-1 placeholder.
// Currently just the Hero section — Pain vs. Solution, Feature Highlights,
// Trust & Compliance, Pricing, and Footer come in the next batches per the
// landing page spec.

import { Hero } from '@/components/marketing/Hero'

export default function HomePage() {
  return (
    <main>
      <Hero />
    </main>
  )
}
