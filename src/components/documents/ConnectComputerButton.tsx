// File Path: /src/components/documents/ConnectComputerButton.tsx
// Status: UPDATE
// Production Ready: Yes
// Description: "Connect my Computer" — generates a sync token scoped to
// the user's own org, downloads a personalized .bat file with that token
// baked in (replaces the earlier qms-sync:// protocol-link approach,
// which needed an app already installed before it could work at all),
// and shows a modal that polls /api/sync/status until the agent's first
// real sync flips it to Connected. No PowerShell, no terminal, no app to
// install ahead of time — download, double-click, done.

'use client'

import { useEffect, useRef, useState } from 'react'
import { createMySyncToken } from '@/app/(app)/documents/sync-actions'
import { generateBatScript } from '@/lib/sync/generateBatScript'

type ModalState = 'idle' | 'preparing' | 'waiting' | 'connected' | 'error'

export function ConnectComputerButton() {
  const [state, setState] = useState<ModalState>('idle')
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  async function handleConnect() {
    setState('preparing')
    setError(null)

    const result = await createMySyncToken()

    if (result.error || !result.token) {
      setError(result.error ?? 'Failed to generate a connection token')
      setState('error')
      return
    }

    const token = result.token
    const apiUrl = window.location.origin
    const batContent = generateBatScript({ token, apiUrl })

    const blob = new Blob([batContent], { type: 'application/bat' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'connect-aiqms.bat'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setState('waiting')

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/sync/status?token=${encodeURIComponent(token)}`)
        const body = await res.json()
        if (body.connected) {
          setState('connected')
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch {
        // Transient network hiccup while polling — just try again next tick.
      }
    }, 3000)
  }

  function closeModal() {
    if (pollRef.current) clearInterval(pollRef.current)
    setState('idle')
  }

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Connect my Computer</h2>
        <p className="mt-1 text-sm text-slate-500">
          Syncs documents from a folder on your own computer automatically — only the
          extracted text ever leaves it, never the original file.
        </p>

        <button
          type="button"
          onClick={handleConnect}
          disabled={state === 'preparing'}
          className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {state === 'preparing' ? 'Preparing…' : 'Connect my Computer'}
        </button>
      </div>

      {(state === 'waiting' || state === 'connected' || state === 'error') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            {state === 'waiting' && (
              <>
                <h3 className="text-base font-semibold text-slate-900">Downloaded ✅</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Find <span className="font-mono">connect-aiqms.bat</span> in your Downloads
                  folder and double-click it to finish connecting.
                </p>
                <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
                  Waiting for it to connect…
                </p>
              </>
            )}

            {state === 'connected' && (
              <>
                <h3 className="text-base font-semibold text-green-700">Connected ✅</h3>
                <p className="mt-2 text-sm text-slate-600">
                  This computer is now syncing documents automatically, every 15 minutes.
                </p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Done
                </button>
              </>
            )}

            {state === 'error' && (
              <>
                <h3 className="text-base font-semibold text-red-700">Something went wrong</h3>
                <p className="mt-2 text-sm text-slate-600">{error}</p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-4 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
