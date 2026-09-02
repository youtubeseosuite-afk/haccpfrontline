// File Path: /src/app/api/admin/parse-pdf/route.ts
// Status: NEW FILE
// Description: Admin-only endpoint for the Standard Parsing Pipeline.
// Extracts text from an uploaded PDF (reusing the same extractText() helper
// the RAG ingestion pipeline already uses — pdf-parse is already a
// dependency, nothing new to install) and sends it to Claude with a strict
// structure-extraction prompt, returning the resulting ParsedStandard JSON
// for the admin to review. Nothing is written to the database here — the
// "Commit" step is planned to reuse the existing importStandard() action
// unchanged, since ParsedStandard's shape matches its input type exactly.
// Not logged to ai_usage_events: that table's organization_id is required,
// and this action isn't tied to any tenant.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { extractText } from '@/lib/rag/extractText'
import { STANDARD_PARSING_SYSTEM_PROMPT } from '@/lib/ai/standardParsingPrompt'
import type { ParsedStandard } from '@/lib/ai/standardParsingTypes'

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL

export async function POST(request: NextRequest) {
  await requireAdmin()

  if (!ANTHROPIC_MODEL) {
    return NextResponse.json(
      { error: 'ANTHROPIC_MODEL environment variable is not set' },
      { status: 500 }
    )
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'A PDF file is required' }, { status: 400 })
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
  }

  let rawText: string
  try {
    rawText = await extractText(file, file.type)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Text extraction failed' },
      { status: 400 }
    )
  }

  if (!rawText.trim()) {
    return NextResponse.json({ error: 'No extractable text found in this PDF' }, { status: 400 })
  }

  const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 8192,
      system: STANDARD_PARSING_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: rawText }],
    }),
  })

  if (!anthropicResponse.ok) {
    const errorBody = await anthropicResponse.text()
    return NextResponse.json(
      { error: `Standard parsing request failed: ${errorBody}` },
      { status: 502 }
    )
  }

  const anthropicBody = await anthropicResponse.json()
  const rawJsonText: string = anthropicBody.content?.[0]?.text ?? ''

  // The prompt forbids markdown fences, but strip them defensively in case
  // the model adds them anyway.
  const cleaned = rawJsonText.replace(/^```json\s*|^```\s*|```$/gm, '').trim()

  let parsed: ParsedStandard
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return NextResponse.json(
      { error: 'AI response was not valid JSON', raw: rawJsonText },
      { status: 502 }
    )
  }

  if (!parsed.code || !parsed.name || !Array.isArray(parsed.requirements)) {
    return NextResponse.json(
      {
        error: 'AI response was missing required fields (code, name, requirements)',
        raw: parsed,
      },
      { status: 502 }
    )
  }

  return NextResponse.json({ parsed })
}
