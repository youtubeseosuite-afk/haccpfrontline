// File Path: /src/app/(app)/risk-analysis/page.tsx
// Status: NEW FILE
// Description: Risk register. Gated by the risk_analysis module
// entitlement — orgs without it see a friendly explanation instead of a
// 404, since a customer noticing this route should learn it's an add-on,
// not hit a dead end. Lists existing risks ordered by score, labeled with
// the org's chosen methodology. The "Add risk" form (methodology-aware) is
// the next piece to wire in.

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getModuleConfig } from '@/lib/modules/hasModule'

type Risk = {
  id: string
  title: string
  category: string | null
  methodology: 'simple_matrix' | 'fmea'
  likelihood: number | null
  severity: number | null
  occurrence: number | null
  detection: number | null
  risk_score: number | null
  status: 'open' | 'mitigating' | 'closed'
}

const STATUS_CLASSES: Record<Risk['status'], string> = {
  open: 'bg-red-100 text-red-700',
  mitigating: 'bg-amber-100 text-amber-700',
  closed: 'bg-green-100 text-green-700',
}

export default async function RiskAnalysisPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!membership) {
    return (
      <div className="p-8">
        <p className="text-sm text-slate-500">You are not a member of any organization yet.</p>
      </div>
    )
  }

  const organizationId = membership.organization_id

  const config = await getModuleConfig(organizationId, 'risk_analysis')

  if (!config) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-lg font-semibold text-slate-900">
            Risk Analysis isn&rsquo;t enabled
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            This is an optional module. Contact us if you&rsquo;d like it added to your account.
          </p>
        </div>
      </div>
    )
  }

  const methodology = (config.methodology as string) ?? 'simple_matrix'

  const { data: risks } = await supabase
    .from('risks')
    .select(
      'id, title, category, methodology, likelihood, severity, occurrence, detection, risk_score, status'
    )
    .eq('organization_id', organizationId)
    .order('risk_score', { ascending: false })

  const rows = (risks ?? []) as Risk[]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Risk Analysis</h1>
        <p className="mt-1 text-sm text-slate-500">
          Methodology:{' '}
          {methodology === 'fmea'
            ? 'FMEA (Severity × Occurrence × Detection)'
            : 'Simple Matrix (Likelihood × Severity)'}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Risk
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Score
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((risk) => (
              <tr key={risk.id}>
                <td className="px-4 py-3 text-sm text-slate-900">{risk.title}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{risk.category ?? '—'}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-800">
                  {risk.risk_score ?? '—'}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[risk.status]}`}
                  >
                    {risk.status}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                  No risks logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
