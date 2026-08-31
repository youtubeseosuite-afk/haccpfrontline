// File Path: /src/components/organizations/OrgSwitcher.tsx
// Status: NEW FILE
// Description: Dropdown for switching the active organization. Renders
//              nothing when the user only belongs to one org, so
//              single-tenant users never see it.

'use client'

import { useRouter } from 'next/navigation'
import type { OrganizationOption } from '@/lib/organizations/getCurrentOrganization'

type Props = {
  organizations: OrganizationOption[]
  currentOrganizationId: string | null
}

export function OrgSwitcher({ organizations, currentOrganizationId }: Props) {
  const router = useRouter()

  if (organizations.length <= 1) {
    return null
  }

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const organizationId = e.target.value

    await fetch('/api/organizations/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId }),
    })

    router.refresh()
  }

  return (
    <select value={currentOrganizationId ?? ''} onChange={handleChange}>
      {organizations.map((org) => (
        <option key={org.id} value={org.id}>
          {org.name}
        </option>
      ))}
    </select>
  )
}
