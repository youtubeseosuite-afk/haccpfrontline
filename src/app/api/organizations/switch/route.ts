// File Path: /src/app/api/organizations/switch/route.ts
// Status: NEW FILE
// Description: Sets the current_organization_id cookie after confirming the
//              user is actually a member of the requested organization.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ORGANIZATION_COOKIE_NAME } from '@/lib/organizations/getCurrentOrganization'

export async function POST(request: NextRequest) {
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

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of that organization' }, { status: 403 })
  }

  cookies().set(ORGANIZATION_COOKIE_NAME, organizationId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })

  return NextResponse.json({ status: 'switched' })
}
