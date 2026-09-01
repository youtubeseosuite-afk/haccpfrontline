// File Path: /src/components/analysis/AnalysisPanel.tsx
// Status: NEW FILE
// Description: Right-hand panel of the Analysis View. Triggers the AI gap
// analysis on demand (calls POST /api/requirements/[id]/gap-analysis, so
// nothing runs — and nothing gets billed — until the user asks for it),
// then shows the retrieved document excerpts and the AI-conclusion verdict,
// highlighting the excerpts the model actually cited.

'use client'

import { useState } from 'react'

type Excerpt = { chunk_id: string; content: string }

type Verdict = {
  status: 'compliant' | 'partial' | 'non_compliant'
  reasoning: string
  cited_chunk_ids: string[]
  excerpts: Excerpt[]
}

const STATUS_LABEL: Record<Verdict['status'], string> = {
  compliant: 'Compliant',
  partial: 'Partial Gap',
  non_compliant: 'Critical Gap',
}

const STATUS_CLASSES: Record<Verdict['status'], string> = {
  compliant: 'bg-green-100 text-green-700 border-green-200',
  partial: 'bg-amber-100 text-amber-700 border-amber-200',
  non_compliant: 'bg-red-100 text-red-700 border-red-200',
}

export function AnalysisPanel({
  requirementId,
  organizationId,
  hasMappedDocument,
}: {
  requirementId: string
  organizationId: string
  hasMappedDocument: boolean
}) {
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runAnalysis() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/requirements/${requirementId}/gap-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      })

      const responseBody = await res.json()

      if (!res.ok) {
        setError(responseBody.error ?? 'Gap analysis failed')
        return
      }

      setVerdict(responseBody)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Document Evidence
        </h2>
        <button
          type="button"
          onClick={runAnalysis}
          disabled={!hasMappedDocument || loading}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? 'Analyzing…' : 'Run AI Gap Analysis'}
        </button>
      </div>

      {!hasMappedDocument && (
        <p className="text-sm text-slate-500">Map a document to this requirement first.</p>
      )}

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {verdict && (
        <div className="space-y-4">
          <div className={`rounded-lg border p-4 ${STATUS_CLASSES[verdict.status]}`}>
            <p className="text-sm font-semibold">{STATUS_LABEL[verdict.status]}</p>
            <p className="mt-1 text-sm">{verdict.reasoning}</p>
          </div>

          <div className="space-y-2">
            {verdict.excerpts.map((excerpt) => {
              const cited = verdict.cited_chunk_ids.includes(excerpt.chunk_id)
              return (
                <div
                  key={excerpt.chunk_id}
                  className={`rounded-md border p-3 text-sm ${
                    cited
                      ? 'border-slate-300 bg-slate-50 text-slate-800'
                      : 'border-slate-100 text-slate-400'
                  }`}
                >
                  {cited && (
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Cited by AI
                    </p>
                  )}
                  {excerpt.content}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!verdict && !loading && hasMappedDocument && (
        <p className="text-sm text-slate-500">
          Run the analysis to retrieve evidence and see the AI's verdict.
        </p>
      )}
    </div>
  )
}
