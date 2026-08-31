// File Path: /src/lib/auth/require-admin.ts
// Status: NEW FILE
// Description: Gate for platform-admin-only routes. Reads the current user
// via the regular (RLS-respecting) server client and checks their own row in
// platform_admins — safe under RLS since the platform_admins_self_read
// policy only allows a user to read their own row. Redirects non-admins.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function requireAdmin() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: admin } = await supabase
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!admin) {
    redirect('/dashboard')
  }

  return user
}
