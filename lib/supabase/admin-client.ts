// lib/supabase/admin-client.ts
// NEW FILE — Service-role Supabase client for platform-admin operations that must
// bypass RLS (e.g. reading/updating organizations across all tenants, reading
// ai_usage_events for the cost dashboard later). Never import this into client
// components or any code path reachable by non-admin users — it has full DB access.
// Requires SUPABASE_SERVICE_ROLE_KEY set as a server-only env var in Vercel.

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
