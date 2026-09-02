// File Path: /src/app/page.tsx
// Status: UPDATE
// Description: Public landing page. Hero + Pain vs. Solution now in place;
// Feature Highlights, Trust & Compliance, Pricing, and Footer come in the
// next batches per the landing page spec.

import { Hero } from '@/components/marketing/Hero'
import { PainVsSolution } from '@/components/marketing/PainVsSolution'

export default function HomePage() {
  return (
    <main>
      <Hero />
      <PainVsSolution />
    </main>
  )
}
