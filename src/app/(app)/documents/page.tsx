// File Path: /src/app/(app)/documents/page.tsx
// Status: UPDATE
// Description: DMS entry point — the Document Library. Lists every
// document for the org (synced by the Local Sync Agent or uploaded here
// directly) with its type, status, chapter tag, and version count. Hosts
// the upload form, per-row Approve/Download actions, and now
// ConnectComputerButton for the Local Sync Agent's Magic Link activation.

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DocumentUploadForm } from '@/components/documents/DocumentUploadForm'
import { DocumentActions } from '@/components/documents/DocumentActions'
import { ConnectComputerButton } from '@/components/documents/ConnectComputerButton'

type DocumentRow = {
  id: string
  title: string
  document_type: string
  chapter_number: string | null
  status: string
  current_version_id: string | null
  created_at: string
  updated_at: string
  document_versions: { id: string; version_number: number; status: string; uploaded_at: string }[]
}

const STATUS_CLASSES: Record<string, string> = {
  approved: 'bg-green-100 text-green-700',
  in_review: 'bg-amber-100 text-amber-700',
  draft: 'bg-amber-100 text-amber-700',
  archived: 'bg-slate-100 text-slate-500',
}

export default async function DocumentsPage() {
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

  const { data: documents } = await supabase
    .from('documents')
    .select(
      `id, title, document_type, chapter_number, status, current_version_id, created_at, updated_at,
       document_versions(id, version_number, status, uploaded_at)`
    )
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })

  const rows = (documents ?? []) as DocumentRow[]

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Documents</h1>
          <p className="mt-1 text-sm text-slate-500">
            Files synced by the Local Agent, plus anything uploaded here directly
          </p>
        </div>
        <DocumentUploadForm organizationId={organizationId} />
      </div>

      <ConnectComputerButton />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Versions
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Updated
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((doc) => (
              <tr key={doc.id}>
                <td className="px-4 py-3 text-sm text-slate-900">
                  {doc.title}
                  {doc.chapter_number && (
                    <span className="ml-2 text-xs text-slate-400">Ch. {doc.chapter_number}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm capitalize text-slate-600">
                  {doc.document_type.replace('_', ' ')}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      STATUS_CLASSES[doc.status] ?? 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {doc.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {doc.document_versions?.length ?? 0}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {new Date(doc.updated_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {doc.current_version_id ? (
                    <DocumentActions documentId={doc.id} status={doc.status} />
                  ) : (
                    <span className="block text-right text-xs text-slate-400">No file</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                  No documents yet — upload one, or install the Local Agent to sync your folder.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
