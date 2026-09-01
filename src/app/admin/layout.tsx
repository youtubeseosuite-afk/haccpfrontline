// File Path: /src/app/admin/layout.tsx
// Status: UPDATE
// Description: Gate for the Owner Dashboard (/admin/*). Kept as a separate
// top-level route rather than moved under the (app) group, to avoid another
// disruptive multi-file relocation — it now renders the same AppShell used
// everywhere else, so the admin area shares the collapsible sidebar and top
// nav instead of its own plain header. requireAdmin() still handles both
// the auth check and the platform-admin check, redirecting non-admins to
// /dashboard, and now its returned user feeds AppShell's userEmail.

import type { ReactNode } from 'react'
import { requireAdmin } from '@/lib/auth/require-admin'
import { AppShell } from '@/components/layout/AppShell'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin()

  return (
    <AppShell userEmail={user.email ?? ''} organizationName="Platform Admin" isAdmin>
      {children}
    </AppShell>
  )
}
