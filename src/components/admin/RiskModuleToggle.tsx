// File Path: /src/components/admin/RiskModuleToggle.tsx
// Status: NEW FILE
// Description: Per-tenant-row control for the Risk Analysis module.
// Disabled state shows an "Enable" button that reveals a methodology
// picker (Simple Matrix / FMEA) before confirming; enabled state shows
// which methodology is active plus a Disable button. Calls
// enableModule()/disableModule() directly — both are generic across module
// keys, this component just always passes 'risk_analysis'.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { enableModule, disableModule } from '@/app/admin/tenants/modules-actions'

const METHODOLOGIES = [
  { value: 'simple_matrix', label: 'Simple Matrix' },
  { value: 'fmea', label: 'FMEA' },
] as const

type Methodology = (typeof METHODOLOGIES)[number]['value']

export function RiskModuleToggle({
  organizationId,
  config,
}: {
  organizationId: string
  config: { methodology?: string } | null
}) {
  const router = useRouter()
  const [choosing, setChoosing] = useState(false)
  const [methodology, setMethodology] = useState<Methodology>('simple_matrix')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleEnable() {
    setBusy(true)
    setError(null)
    try {
      await enableModule(organizationId, 'risk_analysis', { methodology })
      setChoosing(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable')
    } finally {
      setBusy(false)
    }
  }

  async function handleDisable() {
    setBusy(true)
    setError(null)
    try {
      await disableModule(organizationId, 'risk_analysis')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable')
    } finally {
      setBusy(false)
    }
  }

  if (config) {
    const label =
      METHODOLOGIES.find((m) => m.value === config.methodology)?.label ?? config.methodology

    return (
      <div className="flex items-center justify-end gap-2">
        {error && <span className="text-xs text-red-600">{error}</span>}
        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
          {label}
        </span>
        <button
          type="button"
          onClick={handleDisable}
          disabled={busy}
          className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          Disable
        </button>
      </div>
    )
  }

  if (choosing) {
    return (
      <div className="flex items-center justify-end gap-2">
        {error && <span className="text-xs text-red-600">{error}</span>}
        <select
          value={methodology}
          onChange={(e) => setMethodology(e.target.value as Methodology)}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
        >
          {METHODOLOGIES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleEnable}
          disabled={busy}
          className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {busy ? 'Enabling…' : 'Confirm'}
        </button>
        <button
          type="button"
          onClick={() => setChoosing(false)}
          className="text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={() => setChoosing(true)}
        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
      >
        Enable Risk Analysis
      </button>
    </div>
  )
}
