// File Path: /src/app/api/requirements/[id]/draft/route.ts
// Status: NEW FILE
// Description: AI-Drafting (Phase 4) — generates a complete draft procedure
//              document for a requirement via Claude, stores it as a new
//              document + first version (status='draft', pending human
//              review), and links it to the requirement as a 'planned'
//              evidence mapping so the gap shows as in-progress instead of
//              untouched.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL

const DRAFTING_SYSTEM_PROMPT = `You are drafting a QMS procedure document to satisfy a specific standard requirement.

Rules:
- Write a complete, practical, usable procedure — not a placeholder or outline with "[TODO]" markers.
- Stay grounded in what the requirement literally asks for. Do not invent scope, roles, or claims beyond what's needed to satisfy it.
- Structure the document with these sections: Purpose, Scope, Responsibilities, Procedure, Records.
- This is a first draft for a human to review, edit, and approve — write it as if it will genuinely be used, not as an example.

Respond with the procedure document in Markdown. No preamble, no commentary — just the document itself, starting with a top-level heading.`

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

  const userMessage = `Requirement ${requirement.requirement_code}: ${requirement.title}
${requirement.description ?? ''}`

  const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2000,
      system: DRAFTING_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!anthropicResponse.ok) {
    const errorBody = await anthropicResponse.text()
    return NextResponse.json(
      { error: `Draft generation failed: ${errorBody}` },
      { status: 502 }
    )
  }

  const anthropicBody = await anthropicResponse.json()
  const draftText: string = anthropicBody.content?.[0]?.text ?? ''

  if (!draftText.trim()) {
    return NextResponse.json({ error: 'Draft generation returned no content' }, { status: 502 })
  }

  const title = `AI Draft — ${requirement.requirement_code} ${requirement.title}`

  const { data: document, error: documentError } = await supabase
    .from('documents')
    .insert({
      organization_id: organizationId,
      title,
      document_type: 'procedure',
      status: 'draft',
      owner_user_id: user.id,
    })
    .select()
    .single()

  if (documentError || !document) {
    return NextResponse.json(
      { error: documentError?.message ?? 'Failed to create document' },
      { status: 400 }
    )
  }

  const fileName = `${requirement.requirement_code.replace(/\W+/g, '-')}-ai-draft.md`
  const storagePath = `${organizationId}/${document.id}/v1-${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, new Blob([draftText], { type: 'text/markdown' }), {
      contentType: 'text/markdown',
      upsert: false,
    })

  if (uploadError) {
    await supabase.from('documents').delete().eq('id', document.id)
    return NextResponse.json({ error: uploadError.message }, { status: 400 })
  }

  const { data: version, error: versionError } = await supabase
    .from('document_versions')
    .insert({
      document_id: document.id,
      version_number: 1,
      storage_path: storagePath,
      file_name: fileName,
      mime_type: 'text/markdown',
      uploaded_by: user.id,
      status: 'draft',
      change_summary: 'AI-generated draft, pending human review',
    })
    .select()
    .single()

  if (versionError || !version) {
    await supabase.storage.from('documents').remove([storagePath])
    await supabase.from('documents').delete().eq('id', document.id)
    return NextResponse.json(
      { error: versionError?.message ?? 'Failed to create version' },
      { status: 400 }
    )
  }

  // Link the draft to the requirement so the gap shows as "in progress"
  // rather than untouched. coverage_status='planned' because nothing is
  // approved yet — a human still has to review and approve the draft.
  await supabase.from('evidence_mappings').upsert(
    {
      organization_id: organizationId,
      requirement_id: requirementId,
      document_id: document.id,
      coverage_status: 'planned',
      source: 'ai_suggested',
      mapped_by: user.id,
      mapped_at: new Date().toISOString(),
    },
    { onConflict: 'requirement_id,document_id' }
  )

  return NextResponse.json({ document, version }, { status: 201 })
}
