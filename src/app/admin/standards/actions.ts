// File Path: /src/app/admin/standards/actions.ts
// Status: NEW FILE
// Description: Imports a standard as a global "curated template"
// (organization_id = null, is_system_standard = true) from a pasted JSON
// blob: { code, name, version?, description?, requirements: [...] }, where
// each requirement can nest "children" for the chapter -> clause ->
// requirement hierarchy. IDs are generated client-side so the whole tree can
// be flattened and inserted in one batch, then the standard row itself is
// rolled back if the requirements insert fails, so a bad import never leaves
// an empty standard behind. Uses the service-role client since RLS only
// allows tenants to write their own org's rows, never organization_id=null.

'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminClient } from '@/lib/supabase/admin-client'

type RequirementInput = {
  code: string
  title: string
  description?: string
  risk_weight?: number
  children?: RequirementInput[]
}

type StandardImportInput = {
  code: string
  name: string
  version?: string
  description?: string
  requirements: RequirementInput[]
}

type RequirementRow = {
  id: string
  standard_id: string
  parent_requirement_id: string | null
  requirement_code: string
  title: string
  description: string | null
  risk_weight: number
  sort_order: number
}

function flattenRequirements(
  nodes: RequirementInput[],
  standardId: string,
  parentId: string | null,
  rows: RequirementRow[],
  counter: { value: number }
): RequirementRow[] {
  for (const node of nodes) {
    const id = randomUUID()
    rows.push({
      id,
      standard_id: standardId,
      parent_requirement_id: parentId,
      requirement_code: node.code,
      title: node.title,
      description: node.description ?? null,
      risk_weight: node.risk_weight ?? 1,
      sort_order: counter.value++,
    })
    if (node.children?.length) {
      flattenRequirements(node.children, standardId, id, rows, counter)
    }
  }
  return rows
}

export async function importStandard(rawJson: string): Promise<{
  error?: string
  success?: boolean
  requirementCount?: number
}> {
  await requireAdmin()

  let parsed: StandardImportInput
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    return { error: 'Invalid JSON — check the format and try again.' }
  }

  if (!parsed.code || !parsed.name || !Array.isArray(parsed.requirements)) {
    return { error: 'JSON must include "code", "name", and a "requirements" array.' }
  }

  const supabase = createAdminClient()

  const { data: standard, error: standardError } = await supabase
    .from('standards')
    .insert({
      organization_id: null,
      code: parsed.code,
      name: parsed.name,
      version: parsed.version ?? null,
      description: parsed.description ?? null,
      is_system_standard: true,
    })
    .select()
    .single()

  if (standardError || !standard) {
    const message = standardError?.message ?? 'Failed to create standard.'
    return {
      error: message.includes('duplicate')
        ? `A standard with code "${parsed.code}" already exists.`
        : message,
    }
  }

  const rows = flattenRequirements(parsed.requirements, standard.id, null, [], { value: 0 })

  if (rows.length === 0) {
    await supabase.from('standards').delete().eq('id', standard.id)
    return { error: 'No requirements found in the JSON — nothing was imported.' }
  }

  const { error: requirementsError } = await supabase.from('standard_requirements').insert(rows)

  if (requirementsError) {
    // Roll back the standard so a failed import doesn't leave an empty shell.
    await supabase.from('standards').delete().eq('id', standard.id)
    return { error: requirementsError.message }
  }

  revalidatePath('/admin/standards')
  return { success: true, requirementCount: rows.length }
}
