// File Path: /src/app/page.tsx
// Status: UPDATE
// Description: Public landing page. Hero, Pain vs. Solution, Feature
// Highlights, and Trust & Compliance now in place; Pricing and Footer come
// in the next batches per the landing page spec.

import { Hero } from '@/components/marketing/Hero'
import { PainVsSolution } from '@/components/marketing/PainVsSolution'
import { FeatureHighlights } from '@/components/marketing/FeatureHighlights'
import { TrustCompliance } from '@/components/marketing/TrustCompliance'

export default function HomePage() {
  return (
    <main>
      <Hero />
      <PainVsSolution />
      <FeatureHighlights />
      <TrustCompliance />
    </main>
  )
}
