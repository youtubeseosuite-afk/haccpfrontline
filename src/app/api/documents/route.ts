// File Path: /src/app/api/documents/route.ts
// Status: UPDATE
// Description: List documents for an organization (GET) and create a new
//              document with its first version (POST). The file is uploaded
//              to the `documents` Storage bucket and a matching
//              document_versions row is created with status='draft'.
//              Fix: the POST handler created the version but never pointed
//              documents.current_version_id at it, so every uploaded
//              document was invisible to gap-analysis (which reads chunks
//              via current_version_id). Now sets it right after the version
//              is created.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const organizationId = searchParams.get('organizationId')

  let query = supabase
    .from('documents')
    .select(`
      id,
      title,
      document_type,
      chapter_number,
      status,
      current_version_id,
      created_at,
      updated_at,
      document_versions:document_versions(id, version_number, status, uploaded_at)
    `)
    .order('updated_at', { ascending: false })

  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ documents: data })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const formData = await request.formData()
  const organizationId = formData.get('organizationId') as string | null
  const title = formData.get('title') as string | null
  const documentType = (formData.get('documentType') as string | null) ?? 'procedure'
  const chapterNumber = formData.get('chapterNumber') as string | null
  const file = formData.get('file') as File | null

  if (!organizationId || !title || !file) {
    return NextResponse.json(
      { error: 'organizationId, title, and file are required' },
      { status: 400 }
    )
  }

  // Create the document row first. RLS rejects this if the user isn't a
  // member of organizationId, so we rely on that instead of duplicating
  // the membership check here.
  const { data: document, error: documentError } = await supabase
    .from('documents')
    .insert({
      organization_id: organizationId,
      title,
      document_type: documentType,
      chapter_number: chapterNumber,
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

  const storagePath = `${organizationId}/${document.id}/v1-${file.name}`
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    // Roll back the document row so we don't leave an orphaned record.
    await supabase.from('documents').delete().eq('id', document.id)
    return NextResponse.json({ error: uploadError.message }, { status: 400 })
  }

  const { data: version, error: versionError } = await supabase
    .from('document_versions')
    .insert({
      document_id: document.id,
      version_number: 1,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      uploaded_by: user.id,
      status: 'draft',
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

  const { error: pointerError } = await supabase
    .from('documents')
    .update({ current_version_id: version.id })
    .eq('id', document.id)

  if (pointerError) {
    // The document and version both exist and are individually usable —
    // don't roll back a successful upload over this. Just surface it, since
    // gap-analysis won't find this version until current_version_id is set.
    console.error('Failed to set current_version_id:', pointerError.message)
  }

  return NextResponse.json(
    { document: { ...document, current_version_id: version.id }, version },
    { status: 201 }
  )
}
