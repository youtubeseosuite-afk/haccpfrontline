// File Path: /src/lib/ai/logAiUsage.ts
// Status: NEW FILE
// Description: Writes one row to ai_usage_events for the Owner Dashboard
// cost monitor. Runs under the caller's own session — the RLS insert policy
// only allows a tenant to insert rows for their own organization_id, so this
// never needs the service-role client. Never throws: a failed usage log
// should never break the AI response the user is waiting on.

import { createClient } from '@/lib/supabase/server'
import { estimateCostUsd } from './pricing'

type AiEventType = 'gap_analysis' | 'ai_draft' | 'embedding'

export async function logAiUsage(params: {
  organizationId: string
  eventType: AiEventType
  model: string
  inputTokens: number
  outputTokens: number
  userId?: string
}) {
  try {
    const supabase = createClient()

    await supabase.from('ai_usage_events').insert({
      organization_id: params.organizationId,
      event_type: params.eventType,
      model: params.model,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      estimated_cost_usd: estimateCostUsd(
        params.model,
        params.inputTokens,
        params.outputTokens
      ),
      created_by: params.userId ?? null,
    })
  } catch (err) {
    console.error('Failed to log AI usage event:', err)
  }
}
