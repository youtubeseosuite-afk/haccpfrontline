// File Path: /src/lib/rag/chunkText.ts
// Status: NEW FILE
// Description: Splits document text into overlapping chunks for embedding.
//              Chunks by approximate word count rather than true tokens —
//              close enough for consistent chunk sizing without pulling in
//              a tokenizer dependency.

export type TextChunk = {
  index: number
  content: string
}

const DEFAULT_CHUNK_SIZE_WORDS = 350
const DEFAULT_OVERLAP_WORDS = 50

export function chunkText(
  text: string,
  chunkSizeWords: number = DEFAULT_CHUNK_SIZE_WORDS,
  overlapWords: number = DEFAULT_OVERLAP_WORDS
): TextChunk[] {
  const words = text.split(/\s+/).filter(Boolean)

  if (words.length === 0) {
    return []
  }

  const chunks: TextChunk[] = []
  let start = 0
  let index = 0

  while (start < words.length) {
    const end = Math.min(start + chunkSizeWords, words.length)
    const content = words.slice(start, end).join(' ')

    chunks.push({ index, content })
    index += 1

    if (end === words.length) {
      break
    }

    start = end - overlapWords
  }

  return chunks
}
