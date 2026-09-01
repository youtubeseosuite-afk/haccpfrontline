// File Path: /src/components/documents/DocumentUploadForm.tsx
// Status: NEW FILE
// Description: "Upload document" button that opens a small inline form
// (title, type, chapter, file) and posts it to the existing
// POST /api/documents endpoint as multipart form data. Refreshes the
// Document Library on success.

'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

const DOCUMENT_TYPES = ['procedure', 'policy', 'work_instruction', 'record', 'form']

export function DocumentUploadForm({ organizationId }: { organizationId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0])
  const [chapterNumber, setChapterNumber] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('organizationId', organizationId)
    formData.append('title', title)
    formData.append('documentType', documentType)
    if (chapterNumber) formData.append('chapterNumber', chapterNumber)
    formData.append('file', file)

    try {
      const res = await fetch('/api/documents', { method: 'POST', body: formData })
      const body = await res.json()

      if (!res.ok) {
        setError(body.error ?? 'Upload failed')
        return
      }

      setOpen(false)
      setTitle('')
      setChapterNumber('')
      setFile(null)
      router.refresh()
    } finally {
      setUploading(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Upload document
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
    >
      <div>
        <label className="block text-xs font-medium text-slate-600">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600">Type</label>
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          className="mt-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          {DOCUMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600">Chapter (optional)</label>
        <input
          value={chapterNumber}
          onChange={(e) => setChapterNumber(e.target.value)}
          className="mt-1 w-20 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600">File</label>
        <input
          type="file"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1 text-sm text-slate-600"
        />
      </div>

      <button
        type="submit"
        disabled={uploading}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {uploading ? 'Uploading…' : 'Save'}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        Cancel
      </button>

      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  )
}
