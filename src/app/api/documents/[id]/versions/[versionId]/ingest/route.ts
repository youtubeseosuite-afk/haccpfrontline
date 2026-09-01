// File Path: /src/app/api/documents/[id]/versions/[versionId]/ingest/route.ts
// Status: UPDATE
// Description: Extracts text from a document version — plain text,
//              markdown, PDF, or DOCX, via extractText() — chunks it,
//              embeds each chunk via embedText(), and stores the results in
//              document_chunks for RAG retrieval. Now logs the total
//              embedding token usage for the run to ai_usage_events for the
//              Owner Dashboard cost monitor, and matches embedText()'s
//              updated { embedding, tokens } return shape.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chunkText } from '@/lib/rag/chunkText'
import { embedText } from '@/lib/ai/embedText'
import { extractText, isSupportedForExtraction } from '@/lib/rag/extractText'
import { logAiUsage } from '@/lib/ai/logAiUsage'

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

  if (!isSupportedForExtraction(version.mime_type)) {
    return NextResponse.json(
      {
        error: `Ingestion doesn't support this file type yet (${
          version.mime_type ?? 'unknown'
        }). Supported: plain text, markdown, PDF, DOCX.`,
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

  let text: string
  try {
    text = await extractText(fileBlob, version.mime_type)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Text extraction failed' },
      { status: 400 }
    )
  }

  const chunks = chunkText(text)

  if (chunks.length === 0) {
    return NextResponse.json({ error: 'Document has no extractable text' }, { status: 400 })
  }

  const embeddings: number[][] = []
  let totalEmbeddingTokens = 0

  for (const chunk of chunks) {
    const { embedding, tokens } = await embedText(chunk.content, 'document')
    embeddings.push(embedding)
    totalEmbeddingTokens += tokens
  }

  await logAiUsage({
    organizationId: document.organization_id,
    eventType: 'embedding',
    model: 'voyage-3.5',
    inputTokens: totalEmbeddingTokens,
    outputTokens: 0,
    userId: user.id,
  })

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
