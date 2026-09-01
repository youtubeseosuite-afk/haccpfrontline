// File Path: /src/app/admin/usage/page.tsx
// Status: NEW FILE
// Description: Owner Dashboard AI cost monitor. Reads ai_usage_events via
// the service-role client (there's no tenant-facing select policy on this
// table by design — see the platform_admin_foundation migration) and
// summarizes total spend, spend by call type, and spend by tenant over the
// last 30 days.

import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminClient } from '@/lib/supabase/admin-client'

type UsageEvent = {
  organization_id: string
  event_type: 'gap_analysis' | 'ai_draft' | 'embedding'
  input_tokens: number
  output_tokens: number
  estimated_cost_usd: number
}

const EVENT_LABELS: Record<UsageEvent['event_type'], string> = {
  gap_analysis: 'Gap Analysis',
  ai_draft: 'AI Draft',
  embedding: 'Embedding',
}

export default async function UsagePage() {
  await requireAdmin()

  const supabase = createAdminClient()

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: events, error: eventsError }, { data: organizations }] = await Promise.all([
    supabase
      .from('ai_usage_events')
      .select('organization_id, event_type, input_tokens, output_tokens, estimated_cost_usd')
      .gte('created_at', thirtyDaysAgo),
    supabase.from('organizations').select('id, name'),
  ])

  if (eventsError) {
    return (
      <div className="p-8">
        <p className="text-red-600">Failed to load usage: {eventsError.message}</p>
      </div>
    )
  }

  const rows = (events ?? []) as UsageEvent[]
  const orgNames = new Map((organizations ?? []).map((o) => [o.id, o.name]))

  const totalCost = rows.reduce((sum, r) => sum + Number(r.estimated_cost_usd), 0)
  const totalInputTokens = rows.reduce((sum, r) => sum + r.input_tokens, 0)
  const totalOutputTokens = rows.reduce((sum, r) => sum + r.output_tokens, 0)

  const byEventType = new Map<UsageEvent['event_type'], { cost: number; calls: number }>()
  for (const type of ['gap_analysis', 'ai_draft', 'embedding'] as const) {
    byEventType.set(type, { cost: 0, calls: 0 })
  }
  for (const row of rows) {
    const entry = byEventType.get(row.event_type)!
    entry.cost += Number(row.estimated_cost_usd)
    entry.calls += 1
  }

  const byOrg = new Map<string, { cost: number; calls: number }>()
  for (const row of rows) {
    const entry = byOrg.get(row.organization_id) ?? { cost: 0, calls: 0 }
    entry.cost += Number(row.estimated_cost_usd)
    entry.calls += 1
    byOrg.set(row.organization_id, entry)
  }
  const orgRows = Array.from(byOrg.entries())
    .map(([orgId, stats]) => ({
      orgId,
      name: orgNames.get(orgId) ?? 'Unknown organization',
      ...stats,
    }))
    .sort((a, b) => b.cost - a.cost)

  const formatUsd = (n: number) => (n > 0 && n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`)

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">AI Usage</h1>
        <p className="text-sm text-slate-500">Last 30 days, across all tenants</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Estimated cost
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-800">{formatUsd(totalCost)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">AI calls</p>
          <p className="mt-1 text-2xl font-semibold text-slate-800">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Tokens (in / out)
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-800">
            {totalInputTokens.toLocaleString()} / {totalOutputTokens.toLocaleString()}
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">By call type</h2>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Calls
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(['gap_analysis', 'ai_draft', 'embedding'] as const).map((type) => {
                const stats = byEventType.get(type)!
                return (
                  <tr key={type}>
                    <td className="px-4 py-3 text-sm text-slate-800">{EVENT_LABELS[type]}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{stats.calls}</td>
                    <td className="px-4 py-3 text-sm text-slate-800">{formatUsd(stats.cost)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">By tenant</h2>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Organization
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Calls
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orgRows.map((org) => (
                <tr key={org.orgId}>
                  <td className="px-4 py-3 text-sm text-slate-800">{org.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{org.calls}</td>
                  <td className="px-4 py-3 text-sm text-slate-800">{formatUsd(org.cost)}</td>
                </tr>
              ))}
              {orgRows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-500">
                    No AI usage in the last 30 days.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
