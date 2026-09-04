// File Path: /src/app/(app)/documents/sync-actions.ts
// Status: NEW FILE
// Production Ready: Yes — same hashing/scoping pattern already proven in
// the admin-side createSyncToken.
// Description: Lets a regular (non-admin) org member generate their own
// Local Sync Agent token for their own organization — the customer-facing
// counterpart to the admin-only createSyncToken in
// /admin/tenants/sync-token-actions.ts. organizationId always comes from
// the caller's own session/membership, never from client input, so
// there's no way to mint a token for a different org. Uses the
// service-role client internally since sync_tokens has no RLS policies at
// all by design — this action is the one deliberate, narrow exception,
// not a loosening of that table's access model.

'use server'

import { randomBytes, createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'

function generateToken(): string {
  return randomBytes(24).toString('hex')
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createMySyncToken(): Promise<{
  error?: string
  token?: string
}> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!membership) {
    return { error: 'You are not a member of any organization yet' }
  }

  const token = generateToken()
  const tokenHash = hashToken(token)

  const admin = createAdminClient()
  const { error } = await admin.from('sync_tokens').insert({
    organization_id: membership.organization_id,
    token_hash: tokenHash,
    label: 'Connect my Computer',
    created_by: user.id,
  })

  if (error) {
    return { error: error.message }
  }

  return { token }
}
