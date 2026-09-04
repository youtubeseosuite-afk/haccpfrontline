// File Path: /src/components/documents/ConnectComputerButton.tsx
// Status: NEW FILE
// Production Ready: Yes
// Description: "Connect my Computer" — generates a sync token scoped to
// the user's own org (via createMySyncToken) and triggers the
// qms-sync://activate magic link, which Windows hands off to the wizard
// app once it's installed and registered as the protocol's handler. If
// the wizard isn't installed, the OS shows its own "no app found to open
// this link" prompt — there's no way to detect that case from here, so
// the copy sets that expectation up front instead of implying this always
// works silently.

'use client'

import { useState } from 'react'
import { createMySyncToken } from '@/app/(app)/documents/sync-actions'

export function ConnectComputerButton() {
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConnect() {
    setConnecting(true)
    setError(null)

    const result = await createMySyncToken()

    setConnecting(false)

    if (result.error || !result.token) {
      setError(result.error ?? 'Failed to generate a connection link')
      return
    }

    const apiUrl = window.location.origin
    const activationUrl = `qms-sync://activate?token=${encodeURIComponent(
      result.token
    )}&apiUrl=${encodeURIComponent(apiUrl)}`

    window.location.href = activationUrl
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">Connect my Computer</h2>
      <p className="mt-1 text-sm text-slate-500">
        Installs a small helper that syncs documents from a folder on your own server —
        nothing but the extracted text ever leaves it. Requires the AI QMS Sync Agent to
        already be installed on the computer you&rsquo;re connecting.
      </p>

      <button
        type="button"
        onClick={handleConnect}
        disabled={connecting}
        className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {connecting ? 'Generating link…' : 'Connect my Computer'}
      </button>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )
}
