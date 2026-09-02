// File Path: /tailwind.config.ts
// Status: UPDATE
// Description: Adds semantic color names for the "Enterprise Trust" /
// "Trust & Precision" identity: brand (navy/slate authority), success
// (green, for CTAs), warning (amber), critical (red). These are aliases for
// Tailwind's built-in slate/green/amber/red scales, not new hex values —
// the app already uses those directly everywhere (bg-slate-900,
// bg-green-100, etc.), so brand-900 and slate-900 render identically. This
// just gives the palette a name to reach for on the marketing pages without
// introducing a second, potentially-drifting color system.

import type { Config } from 'tailwindcss'
import colors from 'tailwindcss/colors'

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: colors.slate,
        success: colors.green,
        warning: colors.amber,
        critical: colors.red,
      },
    },
  },
  plugins: [],
}

export default config
