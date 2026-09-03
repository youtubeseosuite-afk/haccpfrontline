// File Path: /src/components/admin/SyncTokenManager.tsx
// Status: NEW FILE
// Description: Per-tenant Local Sync Agent token control. Lists active
// (non-revoked) tokens by label with a Revoke button, and a small form to
// generate a new one. The raw token is shown exactly once right after
// creation, in the same "copy this now" pattern as CreateCustomerForm's
// temporary password — it's never retrievable again afterward.

'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createSyncToken, revokeSyncToken } from '@/app/admin/tenants/sync-token-actions'

type TokenRow = { id: string; label: string | null; created_at: string }

export function SyncTokenManager({
  organizationId,
  tokens,
}: {
  organizationId: string
  tokens: TokenRow[]
}) {
  const router = useRouter()
  const [label, setLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    setNewToken(null)

    const result = await createSyncToken(organizationId, label)

    setCreating(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setNewToken(result.token ?? null)
    setLabel('')
    router.refresh()
  }

  async function handleRevoke(tokenId: string) {
    setRevokingId(tokenId)
    try {
      await revokeSyncToken(tokenId)
      router.refresh()
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <div className="space-y-2">
      {tokens.map((t) => (
        <div key={t.id} className="flex items-center justify-between text-xs">
          <span className="text-slate-600">{t.label || 'Unlabeled'}</span>
          <button
            type="button"
            onClick={() => handleRevoke(t.id)}
            disabled={revokingId === t.id}
            className="font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            {revokingId === t.id ? 'Revoking…' : 'Revoke'}
          </button>
        </div>
      ))}

      <form onSubmit={handleCreate} className="flex items-center gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (e.g. Main Server)"
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs"
        />
        <button
          type="submit"
          disabled={creating}
          className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {creating ? 'Generating…' : 'Generate'}
        </button>
      </form>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {newToken && (
        <div className="rounded-md bg-green-50 p-2 text-xs text-green-800">
          <p className="font-medium">Copy this now — it won&rsquo;t be shown again:</p>
          <p className="mt-1 break-all font-mono">{newToken}</p>
        </div>
      )}
    </div>
  )
}
