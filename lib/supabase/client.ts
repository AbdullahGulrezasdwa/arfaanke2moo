import { createBrowserClient } from '@supabase/ssr'

// 1. Define a variable outside the function to hold the instance
let browserClient: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  // 2. If the client already exists, don't make a new one—just return it
  if (browserClient) return browserClient

  // 3. Create the client only once
  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return browserClient
}
