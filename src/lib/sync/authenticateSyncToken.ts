// File Path: /src/lib/sync/authenticateSyncToken.ts
// Status: NEW FILE
// Description: Validates a Local Sync Agent bearer token against
// sync_tokens (hash comparison, must not be revoked), and updates
// last_used_at on success so token activity is visible from
// /admin/tenants. Uses the service-role client since there's no Supabase
// Auth session in this flow at all — the token itself is the auth.

import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin-client'

export async function authenticateSyncToken(
  rawToken: string | null
): Promise<{ organizationId: string } | { error: string }> {
  if (!rawToken) {
    return { error: 'Missing sync token' }
  }

  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  const supabase = createAdminClient()

  const { data: tokenRow, error } = await supabase
    .from('sync_tokens')
    .select('id, organization_id, revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (error || !tokenRow || tokenRow.revoked_at) {
    return { error: 'Invalid or revoked sync token' }
  }

  await supabase
    .from('sync_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', tokenRow.id)

  return { organizationId: tokenRow.organization_id }
}
