// File Path: /src/app/(app)/documents/[id]/DocumentEditor.tsx
// Status: NEW FILE
// Description: The actual editor for text-based document versions (AI
// drafts, plain text/markdown). "Save as new version" only enables once
// the content actually differs from what was loaded, and always creates a
// new version via saveDocumentEdit() rather than overwriting — consistent
// with every other version-creation path in this app.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveDocumentEdit } from './actions'

export function DocumentEditor({
  documentId,
  organizationId,
  initialContent,
  fileName,
}: {
  documentId: string
  organizationId: string
  initialContent: string
  fileName: string
}) {
  const router = useRouter()
  const [content, setContent] = useState(initialContent)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const dirty = content !== initialContent

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)

    const result = await saveDocumentEdit(documentId, organizationId, content, fileName)

    setSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setSaved(true)
    router.refresh()
  }

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value)
          setSaved(false)
        }}
        rows={20}
        className="w-full rounded-md border border-slate-300 p-4 font-mono text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      />

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save as new version'}
        </button>
        {dirty && !saving && <span className="text-xs text-slate-500">Unsaved changes</span>}
        {saved && <span className="text-sm text-green-600">Saved as a new version ✅</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  )
}
