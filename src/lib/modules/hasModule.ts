// File Path: /src/lib/modules/hasModule.ts
// Status: NEW FILE
// Description: Checks whether an organization has a given module enabled,
// and returns its config if so (e.g. { methodology: 'fmea' } for
// risk_analysis). Uses the regular (RLS-scoped) server client —
// organization_modules_select_own_org already restricts this to the
// caller's own org, so no service-role access is needed. Used both by QA
// Manager route gates (e.g. /risk-analysis) and the sidebar, so the nav
// item and the page itself always agree on entitlement.

import { createClient } from '@/lib/supabase/server'

export async function getModuleConfig(
  organizationId: string,
  moduleKey: string
): Promise<Record<string, unknown> | null> {
  const supabase = createClient()

  const { data } = await supabase
    .from('organization_modules')
    .select('config')
    .eq('organization_id', organizationId)
    .eq('module_key', moduleKey)
    .maybeSingle()

  return data ? (data.config as Record<string, unknown>) : null
}

export async function hasModule(organizationId: string, moduleKey: string): Promise<boolean> {
  const config = await getModuleConfig(organizationId, moduleKey)
  return config !== null
}
