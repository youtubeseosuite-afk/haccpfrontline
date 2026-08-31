// File Path: /src/lib/supabase/admin-client.ts
// Status: NEW FILE
// Description: Service-role Supabase client for platform-admin operations
// that must bypass RLS (e.g. reading/updating organizations across all
// tenants, reading ai_usage_events for the cost dashboard later). Never
// import this into client components or any path reachable by non-admins.
// Requires SUPABASE_SERVICE_ROLE_KEY as a server-only env var in Vercel —
// this repo doesn't set it yet, add it before this ships.

import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase admin credentials — check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.'
    )
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
