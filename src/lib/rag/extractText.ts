// File Path: /src/lib/rag/extractText.ts
// Status: NEW FILE
// Description: Extracts plain text from a document file for chunking and
//              embedding. Supports plain text, markdown, PDF (via
//              pdf-parse), and DOCX (via mammoth).

import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'

const SUPPORTED_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export function isSupportedForExtraction(mimeType: string | null): boolean {
  return !!mimeType && SUPPORTED_MIME_TYPES.includes(mimeType)
}

export async function extractText(blob: Blob, mimeType: string | null): Promise<string> {
  if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
    return blob.text()
  }

  const buffer = Buffer.from(await blob.arrayBuffer())

  if (mimeType === 'application/pdf') {
    const result = await pdfParse(buffer)
    return result.text
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  throw new Error(`Unsupported file type for text extraction: ${mimeType ?? 'unknown'}`)
}
