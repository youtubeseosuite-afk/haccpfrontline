// File Path: /src/app/api/requirements/[id]/gap-analysis/route.ts
// Status: UPDATE
// Description: Runs the AI gap analysis for one requirement against its
//              mapped evidence document. Retrieves the most relevant chunks
//              from that document via pgvector similarity, then asks Claude
//              — prompted as a "Critical Auditor" restricted to those
//              excerpts — for a grounded compliant / partial / non_compliant
//              verdict. Does not modify the evidence_mapping or persist the
//              excerpts/response anywhere; it just returns the verdict.
//              Embeds the requirement text with input_type='query' to match
//              how embedText() expects retrieval queries to be tagged.
//              Now also logs the query embedding call and the Claude judge
//              call to ai_usage_events for the Owner Dashboard cost monitor.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { embedText } from '@/lib/ai/embedText'
import { logAiUsage } from '@/lib/ai/logAiUsage'

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL

const AUDITOR_SYSTEM_PROMPT = `You are a Critical Auditor performing a compliance gap analysis.

Rules:
- Evaluate ONLY the evidence excerpts provided below. Never assume compliance based on a document's title, filename, or your general knowledge of the standard.
- Ground every claim in specific detail from the excerpts. Do not invent or infer evidence that isn't present.
- If the excerpts don't address the requirement, say so plainly rather than being lenient.

Classify the requirement as one of:
- "compliant": the excerpts clearly and specifically satisfy the requirement.
- "partial": the excerpts address part of the requirement but leave an identifiable gap.
- "non_compliant": the excerpts do not address the requirement, or no relevant evidence was retrieved.

Respond with ONLY valid JSON, no other text, matching exactly:
{"status": "compliant" | "partial" | "non_compliant", "reasoning": string, "cited_chunk_ids": string[]}`

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!ANTHROPIC_MODEL) {
    return NextResponse.json(
      { error: 'ANTHROPIC_MODEL environment variable is not set' },
      { status: 500 }
    )
  }

  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()
  const organizationId = body.organizationId as string | undefined

  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId is required' }, { status: 400 })
  }

  const requirementId = params.id

  const { data: requirement, error: requirementError } = await supabase
    .from('standard_requirements')
    .select('id, requirement_code, title, description')
    .eq('id', requirementId)
    .single()

  if (requirementError || !requirement) {
    return NextResponse.json({ error: 'Requirement not found' }, { status: 404 })
  }

  const { data: mapping } = await supabase
    .from('evidence_mappings')
    .select('id, document_id')
    .eq('requirement_id', requirementId)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (!mapping) {
    return NextResponse.json({
      status: 'non_compliant',
      reasoning: 'No document is mapped to this requirement.',
      cited_chunk_ids: [],
    })
  }

  const { data: document } = await supabase
    .from('documents')
    .select('id, current_version_id')
    .eq('id', mapping.document_id)
    .single()

  if (!document?.current_version_id) {
    return NextResponse.json({
      status: 'non_compliant',
      reasoning: 'The mapped document has no approved version yet.',
      cited_chunk_ids: [],
    })
  }

  const queryText = `${requirement.requirement_code} ${requirement.title}. ${requirement.description ?? ''}`
  const { embedding: queryEmbedding, tokens: embeddingTokens } = await embedText(
    queryText,
    'query'
  )

  await logAiUsage({
    organizationId,
    eventType: 'embedding',
    model: 'voyage-3.5',
    inputTokens: embeddingTokens,
    outputTokens: 0,
    userId: user.id,
  })

  const { data: chunks, error: matchError } = await supabase.rpc('match_document_chunks', {
    p_document_version_id: document.current_version_id,
    p_query_embedding: queryEmbedding,
    p_match_count: 5,
  })

  if (matchError) {
    return NextResponse.json({ error: matchError.message }, { status: 400 })
  }

  if (!chunks || chunks.length === 0) {
    return NextResponse.json({
      status: 'non_compliant',
      reasoning: 'The mapped document has not been ingested yet, so no evidence could be retrieved.',
      cited_chunk_ids: [],
    })
  }

  const excerptsBlock = chunks
    .map((c: { chunk_id: string; content: string }) => `[chunk_id: ${c.chunk_id}]\n${c.content}`)
    .join('\n\n---\n\n')

  const userMessage = `Requirement ${requirement.requirement_code}: ${requirement.title}
${requirement.description ?? ''}

Evidence excerpts:

${excerptsBlock}`

  const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1000,
      system: AUDITOR_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!anthropicResponse.ok) {
    const errorBody = await anthropicResponse.text()
    return NextResponse.json(
      { error: `Gap analysis request failed: ${errorBody}` },
      { status: 502 }
    )
  }

  const anthropicBody = await anthropicResponse.json()
  const rawText = anthropicBody.content?.[0]?.text ?? ''

  await logAiUsage({
    organizationId,
    eventType: 'gap_analysis',
    model: ANTHROPIC_MODEL,
    inputTokens: anthropicBody.usage?.input_tokens ?? 0,
    outputTokens: anthropicBody.usage?.output_tokens ?? 0,
    userId: user.id,
  })

  let verdict
  try {
    verdict = JSON.parse(rawText)
  } catch {
    return NextResponse.json(
      { error: 'Auditor response was not valid JSON', raw: rawText },
      { status: 502 }
    )
  }

  return NextResponse.json(verdict)
}
