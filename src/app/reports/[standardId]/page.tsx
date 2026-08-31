// File Path: /src/app/reports/[standardId]/page.tsx
// Status: NEW FILE
// Description: Audit-Ready Report (Phase 4) — a print-optimized compliance
//              report for one standard: overall score, a gaps-first summary
//              for remediation prioritization, then the full requirement
//              list in clause order with status and mapped evidence. Uses
//              the browser's native print-to-PDF via the PrintButton client
//              component rather than a server-side PDF library.

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PrintButton } from '@/components/reports/PrintButton'

type RequirementRow = {
  id: string
  requirement_code: string
  title: string
  description: string | null
  parent_requirement_id: string | null
  sort_order: number
}

type MappingRow = {
  requirement_id: string
  document_id: string
  coverage_status: 'full' | 'partial' | 'planned'
}

type DocumentRow = {
  id: string
  title: string
  status: string
}

type Status = 'covered' | 'in_progress' | 'gap'

const STATUS_LABEL: Record<Status, string> = {
  covered: 'Covered',
  in_progress: 'In progress',
  gap: 'Gap',
}

const STATUS_COLOR: Record<Status, string> = {
  covered: '#2e7d32',
  in_progress: '#f9a825',
  gap: '#c62828',
}

export default async function ComplianceReportPage({
  params,
}: {
  params: { standardId: string }
}) {
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

  const { data: organization } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single()

  const { data: standard } = await supabase
    .from('standards')
    .select('id, name, version, code')
    .eq('id', params.standardId)
    .single()

  const { data: requirementsData } = await supabase
    .from('standard_requirements')
    .select('id, requirement_code, title, description, parent_requirement_id, sort_order')
    .eq('standard_id', params.standardId)
    .order('sort_order', { ascending: true })

  const requirements: RequirementRow[] = requirementsData ?? []
  const requirementIds = requirements.map((r) => r.id)

  let mappings: MappingRow[] = []
  if (requirementIds.length > 0) {
    const { data } = await supabase
      .from('evidence_mappings')
      .select('requirement_id, document_id, coverage_status')
      .eq('organization_id', organizationId)
      .in('requirement_id', requirementIds)
    mappings = data ?? []
  }

  const { data: documentsData } = await supabase
    .from('documents')
    .select('id, title, status')
    .eq('organization_id', organizationId)

  const documents: DocumentRow[] = documentsData ?? []
  const documentById = new Map(documents.map((d) => [d.id, d]))
  const mappingByRequirement = new Map(mappings.map((m) => [m.requirement_id, m]))

  function statusFor(requirementId: string): Status {
    const mapping = mappingByRequirement.get(requirementId)
    if (!mapping) return 'gap'
    const doc = documentById.get(mapping.document_id)
    if (mapping.coverage_status === 'full' && doc?.status === 'approved') {
      return 'covered'
    }
    return 'in_progress'
  }

  const { data: scoreRows } = await supabase.rpc('compliance_score', {
    p_organization_id: organizationId,
    p_standard_id: params.standardId,
  })

  const scoreRow = scoreRows?.[0]
  const total = Number(scoreRow?.total_requirements ?? requirements.length)
  const covered = Number(scoreRow?.covered_requirements ?? 0)
  const percentage = total > 0 ? Math.round((covered / total) * 100) : 0

  const gaps = requirements.filter((r) => statusFor(r.id) === 'gap')
  const generatedAt = new Date().toLocaleString()

  return (
    <main style={{ padding: '2rem', maxWidth: 800, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <style>{`
        @media print {
          .no-print { display: none; }
          @page { margin: 2cm; }
        }
      `}</style>

      <div className="no-print" style={{ marginBottom: '1.5rem' }}>
        <PrintButton />
      </div>

      <h1 style={{ marginBottom: 0 }}>Compliance Report</h1>
      <p style={{ color: '#666', marginTop: '0.25rem' }}>
        {organization?.name} — {standard?.name} {standard?.version} ({standard?.code})
      </p>
      <p style={{ color: '#999', fontSize: '0.85rem' }}>Generated {generatedAt}</p>

      <section style={{ margin: '1.5rem 0', padding: '1rem', border: '1px solid #ddd', borderRadius: 6 }}>
        <strong>Overall compliance: {percentage}%</strong>
        <div style={{ color: '#666', fontSize: '0.9rem' }}>
          {covered} of {total} requirements fully covered by approved evidence.
        </div>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Gaps ({gaps.length})</h2>
        {gaps.length === 0 && <p style={{ color: '#2e7d32' }}>No open gaps.</p>}
        {gaps.map((req) => (
          <div key={req.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
            <strong>{req.requirement_code}</strong> — {req.title}
          </div>
        ))}
      </section>

      <section>
        <h2>Full Requirement List</h2>
        {requirements.map((req) => {
          const status = statusFor(req.id)
          const mapping = mappingByRequirement.get(req.id)
          const doc = mapping ? documentById.get(mapping.document_id) : undefined

          return (
            <div
              key={req.id}
              style={{
                padding: '0.5rem 0',
                borderBottom: '1px solid #eee',
                display: 'flex',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div>
                <strong>{req.requirement_code}</strong> — {req.title}
                {doc && (
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    Evidence: {doc.title} ({doc.status})
                  </div>
                )}
              </div>
              <span style={{ color: STATUS_COLOR[status], whiteSpace: 'nowrap' }}>
                {STATUS_LABEL[status]}
              </span>
            </div>
          )
        })}
      </section>
    </main>
  )
}
