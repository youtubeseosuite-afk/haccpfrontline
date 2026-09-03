// File Path: /src/app/admin/tenants/page.tsx
// Status: UPDATE
// Description: Owner Dashboard tenant list. Shows every organization with
// its status, creation date, a Risk Analysis module toggle, a Sync Token
// manager (SyncTokenManager) for the Local Sync Agent, and a
// suspend/activate action. Also hosts CreateCustomerForm above the table.
// Server component, data fetched via the service-role client so all orgs
// are visible regardless of RLS.

import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { setTenantStatus } from './actions'
import { CreateCustomerForm } from '@/components/admin/CreateCustomerForm'
import { RiskModuleToggle } from '@/components/admin/RiskModuleToggle'
import { SyncTokenManager } from '@/components/admin/SyncTokenManager'

type Organization = {
  id: string
  name: string
  status: 'active' | 'suspended'
  created_at: string
}

export default async function TenantsPage() {
  await requireAdmin()

  const supabase = createAdminClient()
  const { data: organizations, error } = await supabase
    .from('organizations')
    .select('id, name, status, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600">Failed to load tenants: {error.message}</p>
      </div>
    )
  }

  const orgs = (organizations ?? []) as Organization[]

  const { data: moduleRows } = await supabase
    .from('organization_modules')
    .select('organization_id, config')
    .eq('module_key', 'risk_analysis')

  const riskModuleByOrg = new Map(
    (moduleRows ?? []).map((row) => [row.organization_id as string, row.config as { methodology?: string }])
  )

  const { data: tokenRows } = await supabase
    .from('sync_tokens')
    .select('id, organization_id, label, created_at')
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  const tokensByOrg = new Map<string, { id: string; label: string | null; created_at: string }[]>()
  for (const row of tokenRows ?? []) {
    const list = tokensByOrg.get(row.organization_id as string) ?? []
    list.push({ id: row.id, label: row.label, created_at: row.created_at })
    tokensByOrg.set(row.organization_id as string, list)
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Tenants</h1>

      <CreateCustomerForm organizations={orgs.map((o) => ({ id: o.id, name: o.name }))} />

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                Organization
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                Created
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">
                Risk Analysis
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                Sync Token
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orgs.map((org) => (
              <tr key={org.id}>
                <td className="px-4 py-3 text-sm text-slate-800 align-top">{org.name}</td>
                <td className="px-4 py-3 text-sm align-top">
                  <span
                    className={
                      org.status === 'active'
                        ? 'inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800'
                        : 'inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800'
                    }
                  >
                    {org.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-500 align-top">
                  {new Date(org.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 align-top">
                  <RiskModuleToggle
                    organizationId={org.id}
                    config={riskModuleByOrg.get(org.id) ?? null}
                  />
                </td>
                <td className="px-4 py-3 align-top w-64">
                  <SyncTokenManager
                    organizationId={org.id}
                    tokens={tokensByOrg.get(org.id) ?? []}
                  />
                </td>
                <td className="px-4 py-3 text-right align-top">
                  <form
                    action={async () => {
                      'use server'
                      await setTenantStatus(
                        org.id,
                        org.status === 'active' ? 'suspended' : 'active'
                      )
                    }}
                  >
                    <button
                      type="submit"
                      className={
                        org.status === 'active'
                          ? 'text-sm font-medium text-red-600 hover:text-red-800'
                          : 'text-sm font-medium text-green-600 hover:text-green-800'
                      }
                    >
                      {org.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {orgs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                  No organizations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
