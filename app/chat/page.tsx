import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChatClient } from './chat-client'

export default async function ChatPage() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    // Profile not found - this could happen if the trigger failed
    // Try to create it manually
    const username = user.user_metadata?.username || `user_${user.id.slice(0, 8)}`
    const displayName = user.user_metadata?.display_name || null

    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        username,
        display_name: displayName,
      })
      .select()
      .single()

    if (createError) {
      // Username might conflict, try with timestamp
      const { data: retryProfile } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: `user_${Date.now()}`,
          display_name: displayName,
        })
        .select()
        .single()

      if (!retryProfile) {
        redirect('/auth/error?error=Failed to create profile')
      }

      return <ChatClient initialProfile={retryProfile} />
    }

    return <ChatClient initialProfile={newProfile} />
  }

  return <ChatClient initialProfile={profile} />
}
