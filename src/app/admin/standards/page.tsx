// File Path: /src/app/admin/standards/page.tsx
// Status: NEW FILE
// Description: Owner Dashboard standards manager. Lists every global
// standard (organization_id is null) with its requirement count, and hosts
// the JSON import form for adding new curated templates like ISO 9001.

import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { ImportStandardForm } from './ImportStandardForm'

type StandardRow = {
  id: string
  code: string
  name: string
  version: string | null
  is_system_standard: boolean
  created_at: string
  standard_requirements: { count: number }[]
}

export default async function StandardsPage() {
  await requireAdmin()

  const supabase = createAdminClient()
  const { data: standards, error } = await supabase
    .from('standards')
    .select('id, code, name, version, is_system_standard, created_at, standard_requirements(count)')
    .is('organization_id', null)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600">Failed to load standards: {error.message}</p>
      </div>
    )
  }

  const rows = (standards ?? []) as unknown as StandardRow[]

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Standards</h1>
        <p className="text-sm text-slate-500">
          Global standards visible to every tenant (organization_id is null).
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                Version
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                Requirements
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 text-sm font-medium text-slate-800">{s.code}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{s.name}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{s.version ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {s.standard_requirements?.[0]?.count ?? 0}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                  No global standards yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Import a standard</h2>
        <p className="text-sm text-slate-500 mb-3">
          Paste a JSON object with "code", "name", and a nested "requirements" array (each
          requirement can have "code", "title", "description", "risk_weight", and "children").
        </p>
        <ImportStandardForm />
      </div>
    </div>
  )
}
