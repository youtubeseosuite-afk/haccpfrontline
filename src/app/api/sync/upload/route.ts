// File Path: /src/app/api/sync/upload/route.ts
// Status: NEW FILE
// Description: Token-authenticated endpoint for the Local Sync Agent.
// Receives already-locally-extracted text (never the raw file) plus
// relativePath, a stable identifier for the file's location in the
// customer's synced folder. Matches against documents.sync_path within the
// org: same path -> a real new version of the existing document (the
// previous current version is marked 'superseded', not overwritten); new
// path -> a brand-new document at version 1. Stores the extracted text
// itself as the "file" in Storage, so download and the chunk/embed
// pipeline keep working unchanged. Chunks and embeds immediately — no
// human review step, since this runs unattended via cron/Task Scheduler.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { authenticateSyncToken } from '@/lib/sync/authenticateSyncToken'
import { chunkText } from '@/lib/rag/chunkText'
import { embedText } from '@/lib/ai/embedText'
import { logAiUsage } from '@/lib/ai/logAiUsage'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const rawToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  const auth = await authenticateSyncToken(rawToken)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const { organizationId } = auth

  const body = await request.json()
  const relativePath = body.relativePath as string | undefined
  const extractedText = body.extractedText as string | undefined
  const title = (body.title as string | undefined) ?? relativePath?.split('/').pop()

  if (!relativePath || !extractedText || !title) {
    return NextResponse.json(
      { error: 'relativePath, extractedText, and title are required' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  const { data: existingDocument } = await supabase
    .from('documents')
    .select('id, current_version_id')
    .eq('organization_id', organizationId)
    .eq('sync_path', relativePath)
    .maybeSingle()

  let documentId: string
  let versionNumber: number

  if (existingDocument) {
    documentId = existingDocument.id

    const { count } = await supabase
      .from('document_versions')
      .select('id', { count: 'exact', head: true })
      .eq('document_id', documentId)

    versionNumber = (count ?? 0) + 1

    if (existingDocument.current_version_id) {
      await supabase
        .from('document_versions')
        .update({ status: 'superseded' })
        .eq('id', existingDocument.current_version_id)
    }
  } else {
    const { data: newDocument, error: documentError } = await supabase
      .from('documents')
      .insert({
        organization_id: organizationId,
        title,
        document_type: 'procedure',
        status: 'draft',
        sync_path: relativePath,
      })
      .select('id')
      .single()

    if (documentError || !newDocument) {
      return NextResponse.json(
        { error: documentError?.message ?? 'Failed to create document' },
        { status: 400 }
      )
    }

    documentId = newDocument.id
    versionNumber = 1
  }

  const fileName = `${title.replace(/\W+/g, '-')}-v${versionNumber}.txt`
  const storagePath = `${organizationId}/${documentId}/v${versionNumber}-${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, new Blob([extractedText], { type: 'text/plain' }), {
      contentType: 'text/plain',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 })
  }

  const { data: version, error: versionError } = await supabase
    .from('document_versions')
    .insert({
      document_id: documentId,
      version_number: versionNumber,
      storage_path: storagePath,
      file_name: fileName,
      mime_type: 'text/plain',
      status: 'draft',
      change_summary: 'Synced by Local Sync Agent',
    })
    .select('id')
    .single()

  if (versionError || !version) {
    await supabase.storage.from('documents').remove([storagePath])
    return NextResponse.json(
      { error: versionError?.message ?? 'Failed to create version' },
      { status: 400 }
    )
  }

  await supabase
    .from('documents')
    .update({ current_version_id: version.id })
    .eq('id', documentId)

  const chunks = chunkText(extractedText)
  const embeddings: number[][] = []
  let totalEmbeddingTokens = 0

  for (const chunk of chunks) {
    const { embedding, tokens } = await embedText(chunk.content, 'document')
    embeddings.push(embedding)
    totalEmbeddingTokens += tokens
  }

  await logAiUsage({
    organizationId,
    eventType: 'embedding',
    model: 'voyage-3.5',
    inputTokens: totalEmbeddingTokens,
    outputTokens: 0,
  })

  await supabase.from('document_chunks').delete().eq('document_version_id', version.id)

  if (chunks.length > 0) {
    const rows = chunks.map((chunk, i) => ({
      document_version_id: version.id,
      organization_id: organizationId,
      chunk_index: chunk.index,
      content: chunk.content,
      embedding: embeddings[i],
    }))

    await supabase.from('document_chunks').insert(rows)
  }

  return NextResponse.json(
    { documentId, versionId: version.id, versionNumber, chunksIngested: chunks.length },
    { status: 201 }
  )
}
