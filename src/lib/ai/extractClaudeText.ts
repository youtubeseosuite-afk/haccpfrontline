// File Path: /src/lib/ai/extractClaudeText.ts
// Status: NEW FILE
// Description: Pulls the actual text out of a Claude API response's
// content array. Fixes a real bug: content[0] is not always the text
// block — if the model returns a 'thinking' block first, content[0].text
// is undefined, even though the model produced a real answer. This finds
// the first block with type 'text' instead of assuming it's at position 0.
// Used by every route that calls the Claude API directly (gap-analysis,
// draft, parse-pdf).

type ClaudeContentBlock = { type: string; text?: string }

export function extractClaudeText(content: ClaudeContentBlock[] | undefined): string {
  if (!content) return ''
  const textBlock = content.find((block) => block.type === 'text')
  return textBlock?.text ?? ''
}
