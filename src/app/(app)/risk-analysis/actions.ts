// File Path: /src/app/(app)/risk-analysis/actions.ts
// Status: NEW FILE
// Description: Creates a new risk. Computes risk_score server-side from
// the methodology-appropriate fields — likelihood x severity for
// simple_matrix, severity x occurrence x detection (RPN) for fmea —
// rather than trusting a client-submitted score. Runs under the caller's
// own session; the risks_all_org RLS policy already scopes the insert to
// their own org.

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type CreateRiskInput = {
  organizationId: string
  methodology: 'simple_matrix' | 'fmea'
  title: string
  description?: string
  category?: string
  mitigationPlan?: string
  likelihood?: number
  severity: number
  occurrence?: number
  detection?: number
}

export async function createRisk(
  input: CreateRiskInput
): Promise<{ error?: string; success?: boolean }> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  if (!input.title.trim()) {
    return { error: 'Title is required' }
  }

  let riskScore: number
  if (input.methodology === 'simple_matrix') {
    if (!input.likelihood || !input.severity) {
      return { error: 'Likelihood and severity are required' }
    }
    riskScore = input.likelihood * input.severity
  } else {
    if (!input.severity || !input.occurrence || !input.detection) {
      return { error: 'Severity, occurrence, and detection are all required for FMEA' }
    }
    riskScore = input.severity * input.occurrence * input.detection
  }

  const { error } = await supabase.from('risks').insert({
    organization_id: input.organizationId,
    title: input.title,
    description: input.description || null,
    category: input.category || null,
    methodology: input.methodology,
    likelihood: input.methodology === 'simple_matrix' ? input.likelihood : null,
    severity: input.severity,
    occurrence: input.methodology === 'fmea' ? input.occurrence : null,
    detection: input.methodology === 'fmea' ? input.detection : null,
    risk_score: riskScore,
    mitigation_plan: input.mitigationPlan || null,
    status: 'open',
    owner_user_id: user.id,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/risk-analysis')
  return { success: true }
}
