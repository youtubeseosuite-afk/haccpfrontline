// File Path: /src/app/(app)/layout.tsx
// Status: NEW FILE
// Description: Server-side gate for every authenticated page (Dashboard now;
// Standards/Analysis/Reports move under this route group in later steps).
// Redirects to /login with no session, loads the user's organization name
// and platform-admin status, and renders AppShell around the page content.
// Mirrors requireAdmin()'s pattern but doesn't redirect non-admins — isAdmin
// here only controls whether the Admin nav link shows.

import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: membership }, { data: admin }] = await Promise.all([
    supabase
      .from('organization_members')
      .select('organizations(name)')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle(),
    supabase.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle(),
  ])

  const orgRelation = membership?.organizations as { name: string } | { name: string }[] | null
  const organizationName = Array.isArray(orgRelation) ? orgRelation[0]?.name : orgRelation?.name

  return (
    <AppShell userEmail={user.email ?? ''} organizationName={organizationName} isAdmin={!!admin}>
      {children}
    </AppShell>
  )
}
