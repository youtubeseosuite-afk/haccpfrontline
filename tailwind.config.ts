// File Path: /tailwind.config.ts
// Status: NEW FILE
// Description: Tailwind config. Content globs are scoped to /src so classes
//              used anywhere under app/ or future components/ are picked up.

import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
