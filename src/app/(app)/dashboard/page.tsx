// File Path: /src/app/(app)/dashboard/page.tsx
// Status: UPDATE
// Description: Control Tower — the main authenticated hub. Shows one
// overall compliance donut aggregated across every standard visible to the
// org, a "Top 3 Critical Gaps" list ranked by risk_weight, and per-standard
// score cards below. Fix: without generated Supabase Database types, the
// client's select-string type inference treats every nested embed as an
// array — including the doubly-nested evidence_mappings.documents relation
// — so RequirementRow and the gap filter now read documents as an array
// instead of a single object.

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ComplianceDonut } from '@/components/compliance/ComplianceDonut'

type Standard = { id: string; name: string; version: string | null; code: string }

type RequirementRow = {
  id: string
  requirement_code: string
  title: string
  risk_weight: number
  standards: { id: string; name: string } | { id: string; name: string }[] | null
  evidence_mappings:
    | { coverage_status: string; documents: { status: string }[] | null }[]
    | null
}

export default async function DashboardPage() {
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

  const { data: standards } = await supabase
    .from('standards')
    .select('id, name, version, code')
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .order('name', { ascending: true })

  const standardList = (standards ?? []) as Standard[]

  const scored = await Promise.all(
    standardList.map(async (standard) => {
      const { data, error } = await supabase.rpc('compliance_score', {
        p_organization_id: organizationId,
        p_standard_id: standard.id,
      })

      const row = data?.[0]
      const total = Number(row?.total_requirements ?? 0)
      const covered = Number(row?.covered_requirements ?? 0)

      return {
        standard,
        total,
        covered,
        percentage: total > 0 ? Math.round((covered / total) * 100) : 0,
        error: error?.message ?? null,
      }
    })
  )

  const overallTotal = scored.reduce((sum, s) => sum + s.total, 0)
  const overallCovered = scored.reduce((sum, s) => sum + s.covered, 0)
  const overallPercentage = overallTotal > 0 ? Math.round((overallCovered / overallTotal) * 100) : 0

  const { data: requirements } = await supabase
    .from('standard_requirements')
    .select(
      `id, requirement_code, title, risk_weight,
       standards!inner(id, name),
       evidence_mappings(coverage_status, documents(status))`
    )
    .order('risk_weight', { ascending: false })

  const gaps = ((requirements ?? []) as RequirementRow[])
    .filter((req) => {
      const mappings = req.evidence_mappings ?? []
      return !mappings.some(
        (m) => m.coverage_status === 'full' && m.documents?.[0]?.status === 'approved'
      )
    })
    .slice(0, 3)

  return (
    <div className="space-y-10 p-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Control Tower</h1>
        <p className="mt-1 text-sm text-slate-500">Overall compliance across every standard</p>
      </div>

      <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white py-10 shadow-sm">
        <ComplianceDonut percentage={overallPercentage} size={200} strokeWidth={16} />
        <p className="mt-3 text-sm text-slate-500">
          {overallCovered} of {overallTotal} requirements covered
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Top 3 Critical Gaps</h2>
        {gaps.length === 0 ? (
          <p className="text-sm text-slate-500">No gaps found — every requirement is covered.</p>
        ) : (
          <div className="space-y-2">
            {gaps.map((gap) => {
              const standard = Array.isArray(gap.standards) ? gap.standards[0] : gap.standards
              return (
                <Link
                  key={gap.id}
                  href={`/standards/${standard?.id}`}
                  className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 hover:border-red-300"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {gap.requirement_code} — {gap.title}
                    </p>
                    <p className="text-xs text-slate-500">{standard?.name}</p>
                  </div>
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                    Risk {gap.risk_weight}/5
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Standards</h2>
        {scored.length === 0 && (
          <p className="text-sm text-slate-500">No standards available yet.</p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scored.map(({ standard, total, covered, percentage, error }) => (
            <div
              key={standard.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-900">{standard.name}</p>
                  <p className="text-xs text-slate-500">{standard.version}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    percentage >= 85
                      ? 'bg-green-100 text-green-700'
                      : percentage >= 50
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {percentage}%
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {covered} of {total} requirements covered
              </p>
              {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
              <div className="mt-4 flex gap-4 text-sm">
                <Link
                  href={`/standards/${standard.id}`}
                  className="font-medium text-slate-700 hover:text-slate-900"
                >
                  Manage evidence →
                </Link>
                <Link
                  href={`/reports/${standard.id}`}
                  className="font-medium text-slate-700 hover:text-slate-900"
                >
                  View report →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
