// File Path: /src/app/api/documents/[id]/approve/route.ts
// Status: NEW FILE
// Description: Marks a document (and its current version) as approved.
// Runs under the caller's own session — the documents_all_org RLS policy
// already scopes updates to their own org, so a request for another org's
// document simply matches zero rows and comes back as 404.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: document, error: documentError } = await supabase
    .from('documents')
    .update({ status: 'approved' })
    .eq('id', params.id)
    .select('id, current_version_id')
    .single()

  if (documentError || !document) {
    return NextResponse.json(
      { error: documentError?.message ?? 'Document not found' },
      { status: 404 }
    )
  }

  if (document.current_version_id) {
    await supabase
      .from('document_versions')
      .update({ status: 'approved' })
      .eq('id', document.current_version_id)
  }

  return NextResponse.json({ status: 'approved' })
}
