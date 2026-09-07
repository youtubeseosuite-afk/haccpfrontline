// File Path: /src/app/api/sync/status/route.ts
// Status: NEW FILE
// Production Ready: Yes
// Description: Read-only status check for the "Connect my Computer" modal
// to poll — reports whether this token has ever successfully synced, via
// sync_tokens.last_used_at. Deliberately separate from the auth check the
// real upload endpoint uses (authenticateSyncToken), which updates
// last_used_at as a side effect — polling itself must never touch that
// timestamp, or "last synced" would just reflect the last time the
// dashboard checked, not the last time the agent actually ran.

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin-client'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'token is required' }, { status: 400 })
  }

  const tokenHash = createHash('sha256').update(token).digest('hex')
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('sync_tokens')
    .select('last_used_at, revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  return NextResponse.json({
    connected: !!data?.last_used_at && !data.revoked_at,
    lastUsedAt: data?.last_used_at ?? null,
  })
}
