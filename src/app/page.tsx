// File Path: /src/app/page.tsx
// Status: UPDATE
// Description: Public landing page. Hero, Pain vs. Solution, and Feature
// Highlights now in place; Trust & Compliance, Pricing, and Footer come in
// the next batches per the landing page spec.

import { Hero } from '@/components/marketing/Hero'
import { PainVsSolution } from '@/components/marketing/PainVsSolution'
import { FeatureHighlights } from '@/components/marketing/FeatureHighlights'

export default function HomePage() {
  return (
    <main>
      <Hero />
      <PainVsSolution />
      <FeatureHighlights />
    </main>
  )
}
