// File Path: /src/app/admin/tenants/actions.ts
// Status: NEW FILE
// Description: Server action for suspending/activating tenant organizations
// from the Owner Dashboard. Gated by requireAdmin(), then updates
// organizations.status via the service-role client, bypassing RLS.

'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminClient } from '@/lib/supabase/admin-client'

export async function setTenantStatus(orgId: string, status: 'active' | 'suspended') {
  await requireAdmin()

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('organizations')
    .update({ status })
    .eq('id', orgId)

  if (error) {
    throw new Error(`Failed to update tenant status: ${error.message}`)
  }

  revalidatePath('/admin/tenants')
}
