// File Path: /src/app/api/documents/[id]/versions/[versionId]/ingest/route.ts
// Status: UPDATE
// Description: Extracts text from a document version, chunks it, embeds
//              each chunk via the shared embedText() utility (now Voyage
//              AI instead of a separate inline OpenAI call), and stores the
//              results in document_chunks for RAG retrieval. Scope for this
//              pass: plain text / markdown files only — PDF and DOCX
//              extraction need a parsing library and are a follow-up.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chunkText } from '@/lib/rag/chunkText'
import { embedText } from '@/lib/ai/embedText'

const TEXT_MIME_TYPES = ['text/plain', 'text/markdown']

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: version, error: versionError } = await supabase
    .from('document_versions')
    .select('id, document_id, storage_path, mime_type, status')
    .eq('id', params.versionId)
    .eq('document_id', params.id)
    .single()

  if (versionError || !version) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 })
  }

  const { data: document, error: documentError } = await supabase
    .from('documents')
    .select('id, organization_id')
    .eq('id', params.id)
    .single()

  if (documentError || !document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  if (!version.mime_type || !TEXT_MIME_TYPES.includes(version.mime_type)) {
    return NextResponse.json(
      {
        error: `Ingestion currently only supports plain text/markdown files (got ${
          version.mime_type ?? 'unknown'
        })`,
      },
      { status: 400 }
    )
  }

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from('documents')
    .download(version.storage_path)

  if (downloadError || !fileBlob) {
    return NextResponse.json(
      { error: downloadError?.message ?? 'Failed to download file' },
      { status: 400 }
    )
  }

  const text = await fileBlob.text()
  const chunks = chunkText(text)

  if (chunks.length === 0) {
    return NextResponse.json({ error: 'Document has no extractable text' }, { status: 400 })
  }

  const embeddings: number[][] = []

  for (const chunk of chunks) {
    const embedding = await embedText(chunk.content, 'document')
    embeddings.push(embedding)
  }

  // Replace any existing chunks for this version. Text never changes after
  // upload, but re-running ingestion should still be idempotent.
  await supabase.from('document_chunks').delete().eq('document_version_id', version.id)

  const rows = chunks.map((chunk, i) => ({
    document_version_id: version.id,
    organization_id: document.organization_id,
    chunk_index: chunk.index,
    content: chunk.content,
    embedding: embeddings[i],
  }))

  const { error: insertError } = await supabase.from('document_chunks').insert(rows)

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 })
  }

  return NextResponse.json({ chunks_ingested: rows.length }, { status: 201 })
}
