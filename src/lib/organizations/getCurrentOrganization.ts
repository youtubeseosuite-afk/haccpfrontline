// File Path: /src/lib/organizations/getCurrentOrganization.ts
// Status: NEW FILE
// Description: Shared server-side helper for resolving which organization
//              is "active" for the current request. Reads the
//              current_organization_id cookie (set by the switch route) and
//              validates it against the user's actual memberships, falling
//              back to their first membership if the cookie is unset or
//              points at an org they're no longer in. Meant to replace the
//              inline first-org lookups duplicated across dashboard,
//              standards, and reports pages.

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const ORGANIZATION_COOKIE_NAME = 'current_organization_id'

export type OrganizationOption = {
  id: string
  name: string
}

export async function getCurrentOrganization(): Promise<{
  organizationId: string | null
  organizations: OrganizationOption[]
}> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { organizationId: null, organizations: [] }
  }

  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id, organizations(name)')
    .eq('user_id', user.id)

  const organizations: OrganizationOption[] = (memberships ?? []).map((m: any) => ({
    id: m.organization_id,
    name: m.organizations?.name ?? 'Unnamed organization',
  }))

  const cookieOrgId = cookies().get(ORGANIZATION_COOKIE_NAME)?.value
  const validCookieOrg = organizations.find((o) => o.id === cookieOrgId)

  const organizationId = validCookieOrg?.id ?? organizations[0]?.id ?? null

  return { organizationId, organizations }
}
