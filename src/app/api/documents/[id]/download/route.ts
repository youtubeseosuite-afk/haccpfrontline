// File Path: /src/app/api/documents/[id]/download/route.ts
// Status: NEW FILE
// Description: Redirects to a short-lived signed URL for a document's
// current version. Looks up current_version_id and its storage_path in two
// plain queries (rather than one embedded select) since documents and
// document_versions have two FKs between them in opposite directions,
// which PostgREST can't embed without a disambiguating hint. Runs under the
// caller's own session, so RLS already scopes both lookups to their org.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: document, error: documentError } = await supabase
    .from('documents')
    .select('current_version_id')
    .eq('id', params.id)
    .maybeSingle()

  if (documentError || !document?.current_version_id) {
    return NextResponse.json({ error: 'No file available for this document' }, { status: 404 })
  }

  const { data: version, error: versionError } = await supabase
    .from('document_versions')
    .select('storage_path')
    .eq('id', document.current_version_id)
    .maybeSingle()

  if (versionError || !version?.storage_path) {
    return NextResponse.json({ error: 'No file available for this document' }, { status: 404 })
  }

  const { data: signed, error: signError } = await supabase.storage
    .from('documents')
    .createSignedUrl(version.storage_path, 60)

  if (signError || !signed) {
    return NextResponse.json(
      { error: signError?.message ?? 'Failed to create download link' },
      { status: 400 }
    )
  }

  return NextResponse.redirect(signed.signedUrl)
}
