// File Path: /src/app/(app)/requirements/[id]/page.tsx
// Status: NEW FILE
// Description: Analysis View — split-screen requirement vs. document
// evidence, with the AI-conclusion panel from the gap-analysis endpoint.
// Left panel is the requirement itself (static, server-rendered); right
// panel is AnalysisPanel, a client component that triggers the AI judge
// call on demand and renders the retrieved excerpts alongside the verdict.

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AnalysisPanel } from '@/components/analysis/AnalysisPanel'

export default async function RequirementAnalysisPage({
  params,
}: {
  params: { id: string }
}) {
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

  const { data: requirement } = await supabase
    .from('standard_requirements')
    .select(
      'id, requirement_code, title, description, risk_weight, standard_id, standards(id, name)'
    )
    .eq('id', params.id)
    .single()

  if (!requirement) {
    return (
      <div className="p-8">
        <p className="text-sm text-slate-500">Requirement not found.</p>
      </div>
    )
  }

  const standard = Array.isArray(requirement.standards)
    ? requirement.standards[0]
    : requirement.standards

  const { data: mapping } = await supabase
    .from('evidence_mappings')
    .select('id, coverage_status, documents(id, title, status)')
    .eq('requirement_id', params.id)
    .eq('organization_id', organizationId)
    .maybeSingle()

  const mappedDocument = mapping
    ? Array.isArray(mapping.documents)
      ? mapping.documents[0]
      : mapping.documents
    : null

  return (
    <div className="p-8">
      <div className="mb-6">
        {standard && (
          <Link
            href={`/standards/${standard.id}`}
            className="text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            ← {standard.name}
          </Link>
        )}
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          {requirement.requirement_code} — {requirement.title}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Requirement
          </h2>
          <p className="text-sm leading-relaxed text-slate-700">
            {requirement.description || 'No description provided.'}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              Risk {requirement.risk_weight}/5
            </span>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-4">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Mapped document
            </h3>
            {mappedDocument ? (
              <p className="text-sm text-slate-700">
                {mappedDocument.title}{' '}
                <span className="text-xs text-slate-400">({mappedDocument.status})</span>
              </p>
            ) : (
              <p className="text-sm text-slate-500">No document mapped yet.</p>
            )}
          </div>
        </div>

        <AnalysisPanel
          requirementId={requirement.id}
          organizationId={organizationId}
          hasMappedDocument={!!mappedDocument}
        />
      </div>
    </div>
  )
}
