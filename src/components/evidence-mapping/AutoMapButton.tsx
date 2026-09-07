// File Path: /src/components/evidence-mapping/AutoMapButton.tsx
// Status: NEW FILE
// Description: "Auto-Map" button for the Standard View. Calls
// autoMapStandard() and reports how many suggestions it created — the
// suggestions themselves don't need any special review UI here, since
// they show up as ordinary 'planned' mappings in the accordion below
// (RequirementMappingPanel already renders those as Partial Gap with the
// document pre-filled in).

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { autoMapStandard } from '@/app/(app)/standards/[standardId]/auto-map-actions'

export function AutoMapButton({
  standardId,
  organizationId,
}: {
  standardId: string
  organizationId: string
}) {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ suggested: number; alreadyMapped: number } | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setRunning(true)
    setError(null)
    setResult(null)

    const response = await autoMapStandard(standardId, organizationId)

    setRunning(false)

    if (response.error) {
      setError(response.error)
      return
    }

    setResult({
      suggested: response.suggested ?? 0,
      alreadyMapped: response.alreadyMapped ?? 0,
    })
    router.refresh()
  }

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={handleClick}
        disabled={running}
        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {running ? 'Searching your documents…' : 'Auto-Map with AI'}
      </button>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {result && (
        <p className="mt-2 text-sm text-slate-600">
          Suggested {result.suggested} mapping{result.suggested === 1 ? '' : 's'} — review them
          below and confirm or change each one.{' '}
          {result.alreadyMapped > 0 &&
            `(${result.alreadyMapped} requirement${result.alreadyMapped === 1 ? ' was' : 's were'} already mapped and left untouched.)`}
        </p>
      )}
    </div>
  )
}
