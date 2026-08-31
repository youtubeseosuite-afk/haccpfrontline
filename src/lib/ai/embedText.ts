// File Path: /src/lib/ai/embedText.ts
// Status: UPDATE
// Description: Switched from OpenAI to Voyage AI — Anthropic's recommended
//              embeddings partner (Anthropic doesn't offer its own
//              embedding model). Uses voyage-3.5 at its default 1024
//              dimensions. Needs VOYAGE_API_KEY instead of OPENAI_API_KEY.
//              inputType should be 'document' when embedding chunks for
//              storage and 'query' when embedding a search query — Voyage
//              uses this to improve retrieval quality.

const EMBEDDING_MODEL = 'voyage-3.5'

export async function embedText(
  text: string,
  inputType: 'query' | 'document' = 'document'
): Promise<number[]> {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      input_type: inputType,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Embedding request failed: ${errorBody}`)
  }

  const body = await response.json()
  return body.data[0].embedding as number[]
}
