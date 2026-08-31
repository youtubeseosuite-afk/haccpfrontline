// File Path: /src/app/api/evidence-mappings/route.ts
// Status: NEW FILE
// Description: Create or replace a requirement-to-document mapping (POST),
//              and remove one (DELETE). This UI treats one document as the
//              primary evidence per requirement — picking a different
//              document for the same requirement replaces the old mapping
//              rather than creating a second row.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()
  const { organizationId, requirementId, documentId, coverageStatus, notes } = body

  if (!organizationId || !requirementId || !documentId || !coverageStatus) {
    return NextResponse.json(
      { error: 'organizationId, requirementId, documentId, and coverageStatus are required' },
      { status: 400 }
    )
  }

  const { data: existing } = await supabase
    .from('evidence_mappings')
    .select('id, document_id')
    .eq('organization_id', organizationId)
    .eq('requirement_id', requirementId)
    .maybeSingle()

  if (existing && existing.document_id !== documentId) {
    await supabase.from('evidence_mappings').delete().eq('id', existing.id)
  }

  const { data: mapping, error } = await supabase
    .from('evidence_mappings')
    .upsert(
      {
        organization_id: organizationId,
        requirement_id: requirementId,
        document_id: documentId,
        coverage_status: coverageStatus,
        notes: notes ?? null,
        mapped_by: user.id,
        mapped_at: new Date().toISOString(),
      },
      { onConflict: 'requirement_id,document_id' }
    )
    .select()
    .single()

  if (error || !mapping) {
    return NextResponse.json(
      { error: error?.message ?? 'Failed to save mapping' },
      { status: 400 }
    )
  }

  return NextResponse.json({ mapping }, { status: 200 })
}

export async function DELETE(request: NextRequest) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const { error } = await supabase.from('evidence_mappings').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ status: 'deleted' })
}
