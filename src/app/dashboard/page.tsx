// File Path: /src/app/dashboard/page.tsx
// Status: NEW FILE
// Description: Compliance Dashboard — lists every standard visible to the
//              user's organization with a computed compliance score, via
//              the compliance_score() RPC.

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ComplianceScoreBar } from '@/components/compliance/ComplianceScoreBar'

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
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
      <main style={{ padding: '2rem' }}>
        <p>You are not a member of any organization yet.</p>
      </main>
    )
  }

  const organizationId = membership.organization_id

  const { data: standards } = await supabase
    .from('standards')
    .select('id, name, version, code')
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .order('name', { ascending: true })

  const scored = await Promise.all(
    (standards ?? []).map(async (standard) => {
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

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Compliance Dashboard</h1>

      {scored.length === 0 && <p>No standards available yet.</p>}

      {scored.map(({ standard, total, covered, percentage, error }) => (
        <Link
          key={standard.id}
          href={`/standards/${standard.id}`}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: 6, marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{standard.name} {standard.version}</strong>
              <span>{percentage}%</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>
              {covered} of {total} requirements covered
            </div>
            {error ? (
              <p style={{ color: '#c62828' }}>{error}</p>
            ) : (
              <ComplianceScoreBar percentage={percentage} />
            )}
          </div>
        </Link>
      ))}
    </main>
  )
}
