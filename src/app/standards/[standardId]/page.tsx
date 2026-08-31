// File Path: /src/app/standards/[standardId]/page.tsx
// Status: NEW FILE
// Description: Server-rendered page for one standard. Fetches the
//              requirement tree, the org's documents, and any existing
//              evidence mappings, then hands them to the client-side
//              mapping panel.

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RequirementMappingPanel } from '@/components/evidence-mapping/RequirementMappingPanel'

export default async function StandardMappingPage({
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
    <main style={{ padding: '2rem' }}>
      <h1>{standard?.name} {standard?.version}</h1>
      <p style={{ color: '#666' }}>{standard?.code}</p>

      <RequirementMappingPanel
        organizationId={organizationId}
        requirements={requirements ?? []}
        documents={documents ?? []}
        mappings={mappings}
      />
    </main>
  )
}
