// File Path: /src/app/(app)/standards/[standardId]/page.tsx
// Status: NEW FILE
// Description: Server-rendered page for one standard's checklist. Fetches
// the requirement tree, the org's documents, and any existing evidence
// mappings, then hands them to the accordion mapping panel. Moved under the
// (app) route group so it renders inside AppShell — delete the old
// src/app/standards/[standardId]/page.tsx or the build will fail with a
// duplicate route, same as the dashboard move.

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RequirementMappingPanel } from '@/components/evidence-mapping/RequirementMappingPanel'

export default async function StandardMappingPage({
  params,
}: {
  params: { standardId: string }
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

  const { data: standard } = await supabase
    .from('standards')
    .select('id, name, version, code')
    .eq('id', params.standardId)
    .single()

  const { data: requirements } = await supabase
    .from('standard_requirements')
    .select('id, requirement_code, title, description, parent_requirement_id, sort_order')
    .eq('standard_id', params.standardId)
    .order('sort_order', { ascending: true })

  const { data: documents } = await supabase
    .from('documents')
    .select('id, title, status, current_version_id')
    .eq('organization_id', organizationId)
    .order('title', { ascending: true })

  const requirementIds = (requirements ?? []).map((r) => r.id)

  let mappings: {
    id: string
    requirement_id: string
    document_id: string
    coverage_status: 'full' | 'partial' | 'planned'
    notes: string | null
  }[] = []

  if (requirementIds.length > 0) {
    const { data } = await supabase
      .from('evidence_mappings')
      .select('id, requirement_id, document_id, coverage_status, notes')
      .eq('organization_id', organizationId)
      .in('requirement_id', requirementIds)

    mappings = data ?? []
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          {standard?.name} <span className="text-slate-400">{standard?.version}</span>
        </h1>
        <p className="text-sm text-slate-500">{standard?.code}</p>
      </div>

      <RequirementMappingPanel
        organizationId={organizationId}
        requirements={requirements ?? []}
        documents={documents ?? []}
        mappings={mappings}
      />
    </div>
  )
}
