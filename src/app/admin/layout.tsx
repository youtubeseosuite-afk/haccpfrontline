// File Path: /src/app/admin/layout.tsx
// Status: NEW FILE
// Description: Root layout for the /admin route group (Owner Dashboard).
// Gates every admin page behind requireAdmin() and provides a shared shell
// (header + nav) for the admin sub-pages (Tenants now, AI Usage and
// Standards to follow).

import type { ReactNode } from 'react'
import { requireAdmin } from '@/lib/auth/require-admin'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-8 py-4">
        <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Owner Dashboard
        </span>
      </header>
      <nav className="flex gap-6 border-b border-slate-200 bg-white px-8 py-3 text-sm">
        <a href="/admin/tenants" className="text-slate-600 hover:text-slate-900">
          Tenants
        </a>
        <a href="/admin/usage" className="text-slate-600 hover:text-slate-900">
          AI Usage
        </a>
        <a href="/admin/standards" className="text-slate-600 hover:text-slate-900">
          Standards
        </a>
      </nav>
      <main>{children}</main>
    </div>
  )
}
