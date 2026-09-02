// File Path: /src/components/admin/CreateCustomerForm.tsx
// Status: NEW FILE
// Description: "Create customer" form for the Tenants page. Either creates
// a new organization or picks an existing one, creates the Supabase Auth
// user directly (via createCustomerUser, which uses the service-role
// client — no invite email required), and links them via
// organization_members. On success, shows the generated temporary password
// once so it can be copied and sent to the customer.

'use client'

import { useState, type FormEvent } from 'react'
import { createCustomerUser } from '@/app/admin/tenants/actions'

type OrgOption = { id: string; name: string }

const ROLES = ['owner', 'admin', 'member', 'auditor_readonly'] as const

export function CreateCustomerForm({ organizations }: { organizations: OrgOption[] }) {
  const [mode, setMode] = useState<'new' | 'existing'>('new')
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? '')
  const [newOrgName, setNewOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<(typeof ROLES)[number]>('owner')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ email: string; password: string } | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setResult(null)

    const response = await createCustomerUser({
      organizationId: mode === 'existing' ? organizationId : null,
      newOrganizationName: mode === 'new' ? newOrgName : null,
      email,
      role,
    })

    setSubmitting(false)

    if (response.error) {
      setError(response.error)
      return
    }

    setResult({ email: response.email!, password: response.password! })
    setEmail('')
    setNewOrgName('')
  }

  return (
    <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">Create customer</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input type="radio" checked={mode === 'new'} onChange={() => setMode('new')} />
            New organization
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={mode === 'existing'}
              onChange={() => setMode('existing')}
              disabled={organizations.length === 0}
            />
            Existing organization
          </label>
        </div>

        {mode === 'new' ? (
          <div>
            <label className="block text-sm font-medium text-slate-700">Organization name</label>
            <input
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-slate-700">Organization</label>
            <select
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create customer'}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {result && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
            <p className="font-medium">User created — share these credentials directly:</p>
            <p className="mt-1">
              Email: <span className="font-mono">{result.email}</span>
            </p>
            <p>
              Temporary password: <span className="font-mono">{result.password}</span>
            </p>
          </div>
        )}
      </form>
    </div>
  )
}
