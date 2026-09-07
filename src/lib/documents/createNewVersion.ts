// File Path: /src/lib/documents/createNewVersion.ts
// Status: NEW FILE
// Description: Shared logic for creating a new document version — used by
// the document editor's "Save as new version" and "Replace file" actions.
// Determines the next version number, marks the previous current version
// 'superseded' (never overwritten), uploads the new content to Storage,
// inserts the version row, and points documents.current_version_id at it.
// This exact sequence was already independently written three times
// (manual upload, AI drafting, the sync agent's upload endpoint) before
// this — pulling it out here so a fourth copy doesn't happen too. Those
// three call sites aren't migrated to use this yet, to avoid touching
// working code without a reason; new version-creation logic should use
// this from here on.

import type { SupabaseClient } from '@supabase/supabase-js'

export async function createNewVersion(params: {
  supabase: SupabaseClient
  documentId: string
  organizationId: string
  content: Blob
  fileName: string
  mimeType: string
  changeSummary: string
  uploadedBy?: string
}): Promise<{ error?: string; versionId?: string; versionNumber?: number }> {
  const {
    supabase,
    documentId,
    organizationId,
    content,
    fileName,
    mimeType,
    changeSummary,
    uploadedBy,
  } = params

  const { data: document, error: documentError } = await supabase
    .from('documents')
    .select('current_version_id')
    .eq('id', documentId)
    .maybeSingle()

  if (documentError || !document) {
    return { error: documentError?.message ?? 'Document not found' }
  }

  const { count } = await supabase
    .from('document_versions')
    .select('id', { count: 'exact', head: true })
    .eq('document_id', documentId)

  const versionNumber = (count ?? 0) + 1
  const storagePath = `${organizationId}/${documentId}/v${versionNumber}-${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, content, { contentType: mimeType, upsert: false })

  if (uploadError) {
    return { error: uploadError.message }
  }

  if (document.current_version_id) {
    await supabase
      .from('document_versions')
      .update({ status: 'superseded' })
      .eq('id', document.current_version_id)
  }

  const { data: version, error: versionError } = await supabase
    .from('document_versions')
    .insert({
      document_id: documentId,
      version_number: versionNumber,
      storage_path: storagePath,
      file_name: fileName,
      mime_type: mimeType,
      uploaded_by: uploadedBy ?? null,
      status: 'draft',
      change_summary: changeSummary,
    })
    .select('id')
    .single()

  if (versionError || !version) {
    await supabase.storage.from('documents').remove([storagePath])
    return { error: versionError?.message ?? 'Failed to create version' }
  }

  const { error: pointerError } = await supabase
    .from('documents')
    .update({ current_version_id: version.id })
    .eq('id', documentId)

  if (pointerError) {
    return { error: pointerError.message }
  }

  return { versionId: version.id, versionNumber }
}
