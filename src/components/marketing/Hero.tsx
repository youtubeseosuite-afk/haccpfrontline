// File Path: /src/components/marketing/Hero.tsx
// Status: NEW FILE
// Description: Landing page Hero — the first thing a prospective Quality
// Manager or CEO sees. White/near-white background per the "Enterprise
// Trust" palette (navy is for text and authority, not the backdrop), a
// faint radial gradient behind the headline so it doesn't read as flat, and
// a trust strip under the CTAs so credibility lands before anyone scrolls.
// "Book a Demo" points at a mailto for now — swap for a real contact
// form or booking link (Calendly etc.) once you've decided how you want to
// handle demo requests.

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] opacity-60"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, rgba(30,41,59,0.06), transparent 60%)',
        }}
      />

      <div className="mx-auto max-w-4xl px-6 py-24 text-center sm:py-32">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm font-medium text-slate-700">
          <ShieldCheckIcon />
          AI-Powered Compliance for Food &amp; Metal Manufacturers
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
          Stop fearing the auditor.
          <br />
          Be <span className="text-green-600">Audit-Ready</span> 365 days a year.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
          The first AI-powered QMS that finds gaps in your documentation before the auditor
          does. Encrypted, access-controlled, and industry-specific.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="mailto:mick@mickogilvie.dk?subject=Book%20a%20Demo"
            className="rounded-md bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
          >
            Book a Demo
          </a>
          <a
            href="#pricing"
            className="rounded-md border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            See Pricing
          </a>
        </div>

        <p className="mt-8 text-sm font-medium text-slate-400">
          Built for ISO 9001 &middot; HACCP &middot; IATF 16949
        </p>
      </div>
    </section>
  )
}

function ShieldCheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="shrink-0 text-slate-500"
    >
      <path
        d="M8 1.5l5 1.8v3.9c0 3.3-2.1 6.1-5 7.3-2.9-1.2-5-4-5-7.3V3.3l5-1.8z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M5.7 8l1.6 1.6 3-3.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
