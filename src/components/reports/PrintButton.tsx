// File Path: /src/components/reports/PrintButton.tsx
// Status: NEW FILE
// Description: One-click "print / save as PDF" trigger for the compliance
//              report. Uses the browser's native print dialog rather than a
//              server-side PDF library — no extra dependency, and it's the
//              PDF path every browser already supports.

'use client'

export function PrintButton() {
  return <button onClick={() => window.print()}>Print / Save as PDF</button>
}
