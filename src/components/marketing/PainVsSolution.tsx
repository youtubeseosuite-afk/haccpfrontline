// File Path: /src/components/marketing/PainVsSolution.tsx
// Status: NEW FILE
// Description: "The Old Way vs. The New Way" contrast section. Two cards,
// deliberately styled asymmetrically — the Old Way muted and grayscale, the
// New Way crisp with a green-tinted border — so the visual weight itself
// argues for the product before anyone reads a word.

const OLD_WAY = [
  {
    title: 'Manual folders and spreadsheets',
    detail: 'Documents scattered across drives, no version control, no oversight.',
  },
  {
    title: 'Expensive external consultants',
    detail: 'Paying by the hour for reviews that are outdated the moment they\u2019re delivered.',
  },
  {
    title: 'Stress before every audit',
    detail: 'Weeks of scrambling to find evidence you\u2019re not even sure exists.',
  },
  {
    title: '\u201cHope-based\u201d compliance',
    detail: 'You find out you were wrong when the auditor tells you.',
  },
]

const NEW_WAY = [
  {
    title: 'Local Sync Agent',
    detail: 'Your documents stay on your server. Nothing leaves your control.',
  },
  {
    title: 'Automated AI Gap Analysis',
    detail: 'Every requirement checked against your actual evidence, continuously.',
  },
  {
    title: 'Real-time compliance score',
    detail: 'Know exactly where you stand, updated the moment a document changes.',
  },
  {
    title: 'Absolute certainty',
    detail: 'Walk into every audit already knowing the answer.',
  },
]

export function PainVsSolution() {
  return (
    <section className="bg-slate-50 py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            There&rsquo;s an old way to handle compliance.
          </h2>
          <p className="mt-3 text-lg text-slate-600">And there&rsquo;s a better way.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 opacity-80">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              The Old Way
            </p>
            <ul className="mt-6 space-y-5">
              {OLD_WAY.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <XIcon />
                  <div>
                    <p className="font-medium text-slate-600">{item.title}</p>
                    <p className="mt-0.5 text-sm text-slate-400">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border-2 border-green-200 bg-white p-8 shadow-lg shadow-green-900/5">
            <p className="text-sm font-semibold uppercase tracking-wide text-green-600">
              The New Way
            </p>
            <ul className="mt-6 space-y-5">
              {NEW_WAY.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <CheckIcon />
                  <div>
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="mt-0.5 shrink-0 text-slate-300">
      <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6.5 6.5l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="mt-0.5 shrink-0 text-green-600">
      <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 9.2l2.3 2.3 4.2-4.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
