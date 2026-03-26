import { createBrowserClient } from '@supabase/ssr'

// This variable lives OUTSIDE the function so it persists
let browserClient: ReturnType<typeof createBrowserClient>

export function createClient() {
  // If we already made a client, just give that one back
  if (browserClient) return browserClient

  // Otherwise, make it exactly once
  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return browserClient
}
