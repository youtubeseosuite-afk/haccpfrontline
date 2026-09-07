// File Path: /src/app/(app)/standards/[standardId]/auto-map-actions.ts
// Status: NEW FILE
// Description: For every requirement in a standard that doesn't already
// have an evidence mapping, embeds the requirement text and searches the
// org's entire document library (via match_org_document_chunks) for the
// closest match, then creates that as a suggested mapping —
// coverage_status: 'planned', source: 'ai_suggested' (same convention
// already used for AI-drafted documents). Never touches requirements that
// already have a mapping — this only fills gaps, it doesn't second-guess
// decisions already made. Pure vector similarity, no Claude call per
// requirement, by design — keeps this fast and effectively free even on a
// large standard.

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { embedText } from '@/lib/ai/embedText'
import { logAiUsage } from '@/lib/ai/logAiUsage'

export async function autoMapStandard(
  standardId: string,
  organizationId: string
): Promise<{ error?: string; success?: boolean; suggested?: number; alreadyMapped?: number }> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: requirements, error: reqError } = await supabase
    .from('standard_requirements')
    .select('id, requirement_code, title, description')
    .eq('standard_id', standardId)

  if (reqError) {
    return { error: reqError.message }
  }

  const requirementIds = (requirements ?? []).map((r) => r.id)

  const { data: existingMappings } = await supabase
    .from('evidence_mappings')
    .select('requirement_id')
    .eq('organization_id', organizationId)
    .in('requirement_id', requirementIds)

  const alreadyMappedIds = new Set((existingMappings ?? []).map((m) => m.requirement_id))
  const unmapped = (requirements ?? []).filter((r) => !alreadyMappedIds.has(r.id))

  let suggested = 0

  for (const req of unmapped) {
    const queryText = `${req.requirement_code} ${req.title}. ${req.description ?? ''}`

    const { embedding, tokens } = await embedText(queryText, 'query')

    await logAiUsage({
      organizationId,
      eventType: 'embedding',
      model: 'voyage-3.5',
      inputTokens: tokens,
      outputTokens: 0,
      userId: user.id,
    })

    const { data: matches } = await supabase.rpc('match_org_document_chunks', {
      p_organization_id: organizationId,
      p_query_embedding: embedding,
      p_match_count: 1,
    })

    const bestMatch = matches?.[0]
    if (!bestMatch) continue

    const { data: version } = await supabase
      .from('document_versions')
      .select('document_id')
      .eq('id', bestMatch.document_version_id)
      .maybeSingle()

    if (!version) continue

    const { error: insertError } = await supabase.from('evidence_mappings').insert({
      organization_id: organizationId,
      requirement_id: req.id,
      document_id: version.document_id,
      coverage_status: 'planned',
      source: 'ai_suggested',
      mapped_by: user.id,
      mapped_at: new Date().toISOString(),
    })

    if (!insertError) suggested++
  }

  revalidatePath(`/standards/${standardId}`)

  return { success: true, suggested, alreadyMapped: alreadyMappedIds.size }
}
