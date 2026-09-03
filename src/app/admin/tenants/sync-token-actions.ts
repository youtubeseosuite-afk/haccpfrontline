// File Path: /src/app/admin/tenants/sync-token-actions.ts
// Status: NEW FILE
// Description: Server actions for generating and revoking a Local Sync
// Agent token for an organization. The raw token is returned exactly once,
// on creation — only its SHA-256 hash is ever stored, so if it's lost the
// only recovery is generating a new one. Revoking sets revoked_at rather
// than deleting, keeping an audit trail of what existed.

'use server'

import { randomBytes, createHash } from 'crypto'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminClient } from '@/lib/supabase/admin-client'

function generateToken(): string {
  return randomBytes(24).toString('hex')
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSyncToken(
  organizationId: string,
  label: string
): Promise<{ error?: string; token?: string }> {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  const token = generateToken()
  const tokenHash = hashToken(token)

  const { error } = await supabase.from('sync_tokens').insert({
    organization_id: organizationId,
    token_hash: tokenHash,
    label: label || null,
    created_by: user.id,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/tenants')
  return { token }
}

export async function revokeSyncToken(tokenId: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('sync_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', tokenId)

  if (error) {
    throw new Error(`Failed to revoke token: ${error.message}`)
  }

  revalidatePath('/admin/tenants')
}
