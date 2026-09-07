// File Path: /src/app/(app)/documents/[id]/page.tsx
// Status: NEW FILE
// Description: Document detail page — metadata and full version history
// for one document. For the current version, if it's text-based
// (markdown/plain text — AI drafts or plain-text uploads), fetches and
// displays its content directly. PDF/DOCX versions show a download link
// instead, since there's no meaningful way to preview those inline. This
// is read-only for now — the actual editor (a real textarea + Save, and
// the "replace file" control, both wired to actions.ts) is the next
// piece built on top of this.

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

const TEXT_MIME_TYPES = ['text/markdown', 'text/plain']

export default async function DocumentDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!membership) {
    return (
      <div className="p-8">
        <p className="text-sm text-slate-500">You are not a member of any organization yet.</p>
      </div>
    )
  }

  const organizationId = membership.organization_id

  const { data: document } = await supabase
    .from('documents')
    .select(
      'id, title, document_type, status, chapter_number, current_version_id, organization_id'
    )
    .eq('id', params.id)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (!document) {
    notFound()
  }

  const { data: versions } = await supabase
    .from('document_versions')
    .select('id, version_number, status, mime_type, file_name, change_summary, uploaded_at, storage_path')
    .eq('document_id', document.id)
    .order('version_number', { ascending: false })

  const currentVersion = (versions ?? []).find((v) => v.id === document.current_version_id)

  let textContent: string | null = null
  if (currentVersion && TEXT_MIME_TYPES.includes(currentVersion.mime_type)) {
    const { data: fileBlob } = await supabase.storage
      .from('documents')
      .download(currentVersion.storage_path)

    if (fileBlob) {
      textContent = await fileBlob.text()
    }
  }

  return (
    <div className="p-8">
      <Link href="/documents" className="text-sm font-medium text-slate-500 hover:text-slate-800">
        ← Documents
      </Link>

      <div className="mt-2 mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{document.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {document.document_type} · {document.status}
          {document.chapter_number && ` · Ch. ${document.chapter_number}`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Current version
            </h2>
            {textContent !== null ? (
              <pre className="whitespace-pre-wrap rounded-md bg-slate-50 p-4 text-sm text-slate-700">
                {textContent}
              </pre>
            ) : currentVersion ? (
              <p className="text-sm text-slate-500">
                {currentVersion.file_name} is a {currentVersion.mime_type} file — preview isn&rsquo;t
                available for this type.{' '}
                <a
                  href={`/api/documents/${document.id}/download`}
                  className="font-medium text-slate-700 hover:text-slate-900"
                >
                  Download it
                </a>{' '}
                instead.
              </p>
            ) : (
              <p className="text-sm text-slate-500">No file uploaded yet.</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Version history
          </h2>
          <div className="space-y-2">
            {(versions ?? []).map((v) => (
              <div
                key={v.id}
                className={`rounded-lg border p-3 text-sm ${
                  v.id === document.current_version_id
                    ? 'border-slate-300 bg-white'
                    : 'border-slate-100 bg-slate-50 text-slate-400'
                }`}
              >
                <p className="font-medium">
                  v{v.version_number}
                  {v.id === document.current_version_id && (
                    <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white">
                      Current
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs">{v.status}</p>
                {v.change_summary && <p className="mt-1 text-xs">{v.change_summary}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
