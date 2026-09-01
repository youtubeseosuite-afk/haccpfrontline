// File Path: /src/lib/ai/pricing.ts
// Status: NEW FILE
// Description: Rough USD cost estimates for AI usage logging, matched by
// model-name substring against known per-million-token rates (Aug 2026
// pricing). Falls back to 0 for an unrecognized model string rather than
// guessing — a $0 row in the cost dashboard is a clearer signal to update
// this table than a silently wrong number. If ANTHROPIC_MODEL uses a
// different naming convention than the entries below, extend this list.

type Rate = { input: number; output: number } // USD per 1M tokens

const CLAUDE_RATES: Array<{ match: string; rate: Rate }> = [
  { match: 'haiku-4-5', rate: { input: 1, output: 5 } },
  { match: 'haiku-3-5', rate: { input: 0.8, output: 4 } },
  { match: 'sonnet-5', rate: { input: 2, output: 10 } },
  { match: 'sonnet-4-6', rate: { input: 3, output: 15 } },
  { match: 'sonnet-4', rate: { input: 3, output: 15 } },
  { match: 'sonnet-3-7', rate: { input: 3, output: 15 } },
  { match: 'opus-5', rate: { input: 5, output: 25 } },
  { match: 'opus-4', rate: { input: 5, output: 25 } },
  { match: 'fable-5', rate: { input: 10, output: 50 } },
  { match: 'mythos-5', rate: { input: 10, output: 50 } },
]

const VOYAGE_RATES: Array<{ match: string; rate: Rate }> = [
  { match: 'voyage-3.5-lite', rate: { input: 0.02, output: 0 } },
  { match: 'voyage-3.5', rate: { input: 0.06, output: 0 } },
  { match: 'voyage-3-large', rate: { input: 0.18, output: 0 } },
]

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const table = model.startsWith('voyage') ? VOYAGE_RATES : CLAUDE_RATES
  const found = table.find((entry) => model.includes(entry.match))

  if (!found) return 0

  const cost =
    (inputTokens / 1_000_000) * found.rate.input +
    (outputTokens / 1_000_000) * found.rate.output

  return Number(cost.toFixed(6))
}
