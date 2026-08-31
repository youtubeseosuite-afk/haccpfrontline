// File Path: /src/app/api/documents/[id]/versions/[versionId]/ingest/route.ts
// Status: NEW FILE
// Description: Extracts text from a document version, chunks it, embeds
//              each chunk via the OpenAI embeddings API, and stores the
//              results in document_chunks for RAG retrieval. Scope for this
//              pass: plain text / markdown files only — PDF and DOCX
//              extraction need a parsing library and are a follow-up.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chunkText } from '@/lib/rag/chunkText'

const EMBEDDING_MODEL = 'text-embedding-3-small'
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
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: chunk.content,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      return NextResponse.json(
        { error: `Embedding request failed: ${errorBody}` },
        { status: 502 }
      )
    }

    const body = await response.json()
    embeddings.push(body.data[0].embedding)
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
