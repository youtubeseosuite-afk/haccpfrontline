// File Path: /src/app/(app)/documents/[id]/ReplaceFileControl.tsx
// Status: NEW FILE
// Description: The PDF/DOCX counterpart to DocumentEditor — since there's
// no realistic way to edit those formats inline in a browser, this just
// lets the user upload a replacement file, which becomes a new version via
// replaceDocumentFile(). Same "always a new version, never an overwrite"
// principle as the text editor.

'use client'

import { useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { replaceDocumentFile } from './actions'

export function ReplaceFileControl({
  documentId,
  organizationId,
}: {
  documentId: string
  organizationId: string
}) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleReplace() {
    if (!file) return

    setUploading(true)
    setError(null)
    setSuccess(false)

    const result = await replaceDocumentFile(documentId, organizationId, file)

    setUploading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setSuccess(true)
    setFile(null)
    router.refresh()
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
      <input
        type="file"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          setFile(e.target.files?.[0] ?? null)
          setSuccess(false)
        }}
        className="text-sm text-slate-600"
      />
      <button
        type="button"
        onClick={handleReplace}
        disabled={!file || uploading}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {uploading ? 'Uploading…' : 'Replace with new file'}
      </button>
      {success && <span className="text-sm text-green-600">Uploaded as a new version ✅</span>}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  )
}
