// File Path: /src/lib/supabase/client.ts
// Status: NEW FILE
// Description: Browser-side Supabase client for use in Client Components
//              (e.g. the login form). Complements the server client in
//              lib/supabase/server.ts, which only works in Server
//              Components and Route Handlers.

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
