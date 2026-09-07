// File Path: /src/app/(app)/documents/[id]/actions.ts
// Status: NEW FILE
// Description: Server actions for the document detail page — saving
// edited text as a new version, and replacing a PDF/DOCX with a new
// uploaded file as a new version. Both just call createNewVersion() with
// different content; the actual version-creation mechanics live there.

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createNewVersion } from '@/lib/documents/createNewVersion'

export async function saveDocumentEdit(
  documentId: string,
  organizationId: string,
  content: string,
  fileName: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  if (!content.trim()) {
    return { error: 'Content cannot be empty' }
  }

  const result = await createNewVersion({
    supabase,
    documentId,
    organizationId,
    content: new Blob([content], { type: 'text/markdown' }),
    fileName,
    mimeType: 'text/markdown',
    changeSummary: `Edited by ${user.email}`,
    uploadedBy: user.id,
  })

  if (result.error) {
    return { error: result.error }
  }

  revalidatePath(`/documents/${documentId}`)
  revalidatePath('/documents')
  return { success: true }
}

export async function replaceDocumentFile(
  documentId: string,
  organizationId: string,
  file: File
): Promise<{ error?: string; success?: boolean }> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const result = await createNewVersion({
    supabase,
    documentId,
    organizationId,
    content: file,
    fileName: file.name,
    mimeType: file.type,
    changeSummary: `Replaced by ${user.email}`,
    uploadedBy: user.id,
  })

  if (result.error) {
    return { error: result.error }
  }

  revalidatePath(`/documents/${documentId}`)
  revalidatePath('/documents')
  return { success: true }
}
