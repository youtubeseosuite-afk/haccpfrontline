// File Path: /src/components/marketing/TrustCompliance.tsx
// Status: NEW FILE
// Description: The "Trust & Compliance" section. Deliberately the first
// dark panel on the page (bg-slate-900) — a visual register shift that
// signals weight right where the copy is about security and standards,
// distinct from the lighter sections around it. Left: the Hybrid Model
// (Local Sync Agent -> encrypted -> Cloud AI, zero retention). Right: the
// three standards the product supports.

const STANDARDS = [
  { code: 'ISO 9001', label: 'Quality Management Systems' },
  { code: 'HACCP', label: 'Food Safety Compliance' },
  { code: 'IATF 16949', label: 'Automotive & Metal Manufacturing' },
]

export function TrustCompliance() {
  return (
    <section className="bg-slate-900 py-24">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-16 px-6 md:grid-cols-2">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-4 py-1.5 text-sm font-medium text-slate-300">
            <ShieldIcon />
            Security First
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-white">
            Your documents never leave your infrastructure.
          </h2>
          <p className="mt-4 leading-relaxed text-slate-400">
            Built on a Hybrid Model: a secure Local Sync Agent extracts and analyzes your
            documents on your own server. Only what&rsquo;s needed for AI analysis is sent to
            the cloud, and nothing is retained. Total data sovereignty, without sacrificing
            intelligence.
          </p>

          <div className="mt-8 flex items-center gap-3 text-sm text-slate-300">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3">
              <ServerIcon />
              Local Sync Agent
            </div>
            <div className="text-slate-600">&rarr;</div>
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3">
              <CloudIcon />
              Cloud AI &middot; Zero Retention
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Built for your standards
          </h3>
          <div className="mt-5 space-y-3">
            {STANDARDS.map((standard) => (
              <div
                key={standard.code}
                className="flex items-center gap-4 rounded-lg border border-slate-700 bg-slate-800 px-5 py-4"
              >
                <CertificateIcon />
                <div>
                  <p className="font-semibold text-white">{standard.code}</p>
                  <p className="text-sm text-slate-400">{standard.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path
        d="M8 1.5l5 1.8v3.9c0 3.3-2.1 6.1-5 7.3-2.9-1.2-5-4-5-7.3V3.3l5-1.8z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ServerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 text-slate-400">
      <rect x="3" y="3" width="12" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="3" y="10.5" width="12" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="5.5" cy="5.25" r="0.6" fill="currentColor" />
      <circle cx="5.5" cy="12.75" r="0.6" fill="currentColor" />
    </svg>
  )
}

function CloudIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 text-slate-400">
      <path
        d="M5.5 13a3 3 0 01-.4-5.98A4 4 0 0113 6.1 3.2 3.2 0 0112.7 13H5.5z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CertificateIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0 text-slate-400">
      <circle cx="12" cy="9" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9.5 14.5L8 21l4-2 4 2-1.5-6.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M9.3 9l1.8 1.8L14.7 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
