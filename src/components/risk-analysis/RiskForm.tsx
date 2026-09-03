// File Path: /src/components/risk-analysis/RiskForm.tsx
// Status: NEW FILE
// Description: "Add risk" form. Shows Likelihood + Severity (1-5) for
// simple_matrix, or Severity + Occurrence + Detection (1-10) for fmea —
// whichever the org's module config specifies — with a live-computed score
// preview so the number isn't a surprise after saving. The actual score
// used in the database is still computed server-side in createRisk().

'use client'

import { useState, type FormEvent } from 'react'
import { createRisk } from '@/app/(app)/risk-analysis/actions'

const SCALE_5 = [1, 2, 3, 4, 5]
const SCALE_10 = Array.from({ length: 10 }, (_, i) => i + 1)

export function RiskForm({
  organizationId,
  methodology,
}: {
  organizationId: string
  methodology: 'simple_matrix' | 'fmea'
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [mitigationPlan, setMitigationPlan] = useState('')
  const [likelihood, setLikelihood] = useState(3)
  const [severity, setSeverity] = useState(methodology === 'fmea' ? 5 : 3)
  const [occurrence, setOccurrence] = useState(5)
  const [detection, setDetection] = useState(5)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const score =
    methodology === 'simple_matrix' ? likelihood * severity : severity * occurrence * detection

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const result = await createRisk({
      organizationId,
      methodology,
      title,
      description,
      category,
      mitigationPlan,
      likelihood: methodology === 'simple_matrix' ? likelihood : undefined,
      severity,
      occurrence: methodology === 'fmea' ? occurrence : undefined,
      detection: methodology === 'fmea' ? detection : undefined,
    })

    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setTitle('')
    setCategory('')
    setDescription('')
    setMitigationPlan('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-6 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Add risk
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <label className="block text-sm font-medium text-slate-700">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Category (optional)</label>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. Process, Supplier, Equipment"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      {methodology === 'simple_matrix' ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Likelihood (1-5)</label>
            <select
              value={likelihood}
              onChange={(e) => setLikelihood(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              {SCALE_5.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Severity (1-5)</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              {SCALE_5.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Severity (1-10)</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              {SCALE_10.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Occurrence (1-10)</label>
            <select
              value={occurrence}
              onChange={(e) => setOccurrence(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              {SCALE_10.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Detection (1-10)</label>
            <select
              value={detection}
              onChange={(e) => setDetection(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              {SCALE_10.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <p className="text-sm text-slate-600">
        {methodology === 'fmea' ? 'RPN' : 'Risk score'}:{' '}
        <span className="font-semibold text-slate-900">{score}</span>
      </p>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Mitigation plan (optional)
        </label>
        <textarea
          value={mitigationPlan}
          onChange={(e) => setMitigationPlan(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save risk'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  )
}
