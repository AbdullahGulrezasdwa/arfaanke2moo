import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChatClient } from './chat-client'

// CRITICAL: This stops Vercel from using a "stale" version of the page
export const dynamic = 'force-dynamic'

export default async function ChatPage() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  // If no user, get them out of here immediately
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // If the profile is missing, don't loop or redirect to an error yet.
  // Just pass a temporary profile to ChatClient so the app actually LOADS.
  if (!profile) {
    const tempProfile = {
      id: user.id,
      username: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
      display_name: user.user_metadata?.display_name || 'New User',
      avatar_url: null,
    }
    
    // We can try to create it in the background or just let them use the app
    // for now. This PREVENTS the "Failed to create profile" redirect loop.
    return <ChatClient initialProfile={tempProfile as any} />
  }

  return <ChatClient initialProfile={profile} />
}
