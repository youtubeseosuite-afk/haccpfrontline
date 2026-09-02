// File Path: /src/components/marketing/FeatureHighlights.tsx
// Status: NEW FILE
// Description: "How it works" — the three pillars, numbered to read as a
// sequence (documents stay local -> AI finds the gaps -> AI helps close
// them), which is also the actual order a customer experiences the product.

const FEATURES = [
  {
    number: '01',
    title: 'Local-First Security',
    description: 'Your documents never leave your server. Total data sovereignty.',
    icon: LockIcon,
  },
  {
    number: '02',
    title: 'AI Gap Analysis',
    description:
      'Instant identification of missing requirements in your HACCP or ISO documentation.',
    icon: SearchIcon,
  },
  {
    number: '03',
    title: 'Automated Remediation',
    description: "Don't just find gaps \u2014 close them with AI-assisted drafting.",
    icon: DocumentIcon,
  },
]

export function FeatureHighlights() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            How AI QMS works
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            Three pillars, one continuous cycle toward always being audit-ready.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          {FEATURES.map(({ number, title, description, icon: Icon }) => (
            <div key={number} className="text-center md:text-left">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900 text-white md:mx-0">
                <Icon />
              </div>
              <p className="mt-4 text-xs font-semibold tracking-wide text-slate-400">{number}</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="5" y="10" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7.5 10V7.5a3.5 3.5 0 017 0V10" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="11" cy="14" r="1.2" fill="currentColor" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M14.5 14.5L18.5 18.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M7.5 10l1.8 1.8L13 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DocumentIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path
        d="M6 4h7l4 4v10a1 1 0 01-1 1H6a1 1 0 01-1-1V5a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M13 4v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 12h6M8 15h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
