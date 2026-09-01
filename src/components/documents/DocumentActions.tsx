// File Path: /src/components/documents/DocumentActions.tsx
// Status: NEW FILE
// Description: Per-document row actions in the Document Library — a plain
// Download link (no JS needed, the download route itself redirects to a
// signed URL) and an Approve button (calls POST /api/documents/[id]/approve
// and refreshes), shown only while the document isn't already approved.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DocumentActions({ documentId, status }: { documentId: string; status: string }) {
  const router = useRouter()
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleApprove() {
    setApproving(true)
    setError(null)

    try {
      const res = await fetch(`/api/documents/${documentId}/approve`, { method: 'POST' })

      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'Failed to approve')
        return
      }

      router.refresh()
    } finally {
      setApproving(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-3">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <a
        href={`/api/documents/${documentId}/download`}
        className="text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        Download
      </a>
      {status !== 'approved' && (
        <button
          type="button"
          onClick={handleApprove}
          disabled={approving}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {approving ? 'Approving…' : 'Approve'}
        </button>
      )}
    </div>
  )
}
