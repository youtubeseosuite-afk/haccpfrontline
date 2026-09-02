// File Path: /src/app/admin/tenants/modules-actions.ts
// Status: NEW FILE
// Description: Server actions for granting/revoking optional module access
// per organization. Currently used for 'risk_analysis' (with a
// { methodology: 'simple_matrix' | 'fmea' } config), but
// organization_modules is generic, so future optional modules reuse this
// same enable/disable pattern rather than a bespoke action each time.

'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminClient } from '@/lib/supabase/admin-client'

export async function enableModule(
  organizationId: string,
  moduleKey: string,
  config: Record<string, unknown> = {}
) {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase.from('organization_modules').upsert(
    {
      organization_id: organizationId,
      module_key: moduleKey,
      config,
      enabled_by: user.id,
      enabled_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id,module_key' }
  )

  if (error) {
    throw new Error(`Failed to enable module: ${error.message}`)
  }

  revalidatePath('/admin/tenants')
}

export async function disableModule(organizationId: string, moduleKey: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('organization_modules')
    .delete()
    .eq('organization_id', organizationId)
    .eq('module_key', moduleKey)

  if (error) {
    throw new Error(`Failed to disable module: ${error.message}`)
  }

  revalidatePath('/admin/tenants')
}
