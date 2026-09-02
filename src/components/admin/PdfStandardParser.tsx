// File Path: /src/components/admin/PdfStandardParser.tsx
// Status: NEW FILE
// Description: "Parse a standard from PDF" — the Review & Commit step of
// the parsing pipeline. Uploads a PDF to /api/admin/parse-pdf, shows the
// returned JSON in an editable textarea so the admin can review or correct
// it (nothing is written to the database until they choose to), then
// commits via the existing importStandard() action — no separate commit
// logic, since ParsedStandard's shape matches its input exactly.

'use client'

import { useState, type ChangeEvent } from 'react'
import { importStandard } from '@/app/admin/standards/actions'

export function PdfStandardParser() {
  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [jsonText, setJsonText] = useState('')

  const [committing, setCommitting] = useState(false)
  const [commitError, setCommitError] = useState<string | null>(null)
  const [commitSuccess, setCommitSuccess] = useState<number | null>(null)

  async function handleParse() {
    if (!file) return

    setParsing(true)
    setParseError(null)
    setJsonText('')
    setCommitSuccess(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/parse-pdf', { method: 'POST', body: formData })
      const body = await res.json()

      if (!res.ok) {
        setParseError(body.error ?? 'Failed to parse PDF')
        return
      }

      setJsonText(JSON.stringify(body.parsed, null, 2))
    } finally {
      setParsing(false)
    }
  }

  async function handleCommit() {
    setCommitting(true)
    setCommitError(null)
    setCommitSuccess(null)

    try {
      const result = await importStandard(jsonText)

      if (result.error) {
        setCommitError(result.error)
        return
      }

      setCommitSuccess(result.requirementCount ?? 0)
      setJsonText('')
      setFile(null)
    } finally {
      setCommitting(false)
    }
  }

  return (
    <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-slate-800">Parse a standard from PDF</h2>
      <p className="mb-4 text-sm text-slate-500">
        Upload the standard&rsquo;s PDF. The AI extracts its chapter/clause structure into the
        JSON below &mdash; review or edit it before committing anything.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept="application/pdf"
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-slate-600"
        />
        <button
          type="button"
          onClick={handleParse}
          disabled={!file || parsing}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {parsing ? 'Parsing…' : 'Parse PDF'}
        </button>
      </div>

      {parseError && <p className="mt-3 text-sm text-red-600">{parseError}</p>}

      {jsonText && (
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Review before committing
          </label>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={16}
            className="w-full rounded-md border border-slate-300 p-3 font-mono text-xs"
          />
          <button
            type="button"
            onClick={handleCommit}
            disabled={committing}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {committing ? 'Committing…' : 'Commit to database'}
          </button>
          {commitError && <p className="text-sm text-red-600">{commitError}</p>}
        </div>
      )}

      {commitSuccess !== null && (
        <p className="mt-3 text-sm text-green-600">
          Committed successfully &mdash; {commitSuccess} requirements added.
        </p>
      )}
    </div>
  )
}
