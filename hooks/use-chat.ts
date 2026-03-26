'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import type {
  Profile,
  FriendRequest,
  Message,
  ChatUser,
} from '@/lib/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useChat(currentUserId: string | null) {
  const [friends, setFriends] = useState<ChatUser[]>([])
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([])
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedFriend, setSelectedFriend] = useState<ChatUser | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  const supabase = useMemo(() => createClient(), [])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const presenceChannelRef = useRef<RealtimeChannel | null>(null)
  const selectedFriendIdRef = useRef<string | null>(null)

  useEffect(() => {
    selectedFriendIdRef.current = selectedFriend?.id ?? null
  }, [selectedFriend?.id])

  const fetchFriends = useCallback(async () => {
    if (!currentUserId) return

    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        friend_id,
        friend:profiles!friendships_friend_id_fkey(*)
      `)
      .eq('user_id', currentUserId)

    if (error) {
      console.error('Error fetching friends:', error)
      return
    }

    setFriends((data || []).map((f) => ({
      ...((f.friend as unknown as Profile) || {}),
      isOnline: false,
    })) as ChatUser[])
  }, [currentUserId, supabase])

  const fetchRequests = useCallback(async () => {
    if (!currentUserId) return

    const { data: pending } = await supabase
      .from('friend_requests')
      .select(`*, from_profile:profiles!friend_requests_from_user_id_fkey(*)`)
      .eq('to_user_id', currentUserId)
      .eq('status', 'pending')

    const { data: sent } = await supabase
      .from('friend_requests')
      .select(`*, to_profile:profiles!friend_requests_to_user_id_fkey(*)`)
      .eq('from_user_id', currentUserId)
      .eq('status', 'pending')

    setPendingRequests((pending || []) as FriendRequest[])
    setSentRequests((sent || []) as FriendRequest[])
  }, [currentUserId, supabase])

  const fetchMessages = useCallback(async (friendId: string) => {
    if (!currentUserId) return

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      return
    }

    setMessages(data || [])

    await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_id', friendId)
      .eq('receiver_id', currentUserId)
      .eq('read', false)
  }, [currentUserId, supabase])

  const sendMessage = useCallback(async (content: string) => {
    if (!currentUserId || !selectedFriendIdRef.current || !content.trim()) return

    const { error } = await supabase.from('messages').insert({
      sender_id: currentUserId,
      receiver_id: selectedFriendIdRef.current,
      content: content.trim(),
    })

    if (error) console.error('Error sending message:', error)
  }, [currentUserId, supabase])

  const sendFriendRequest = useCallback(async (username: string) => {
    if (!currentUserId) return { success: false, error: 'Not logged in' }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .single()

    if (profileError || !profile) return { success: false, error: 'User not found' }
    if (profile.id === currentUserId) return { success: false, error: 'You cannot add yourself' }

    const { data: existingFriendship } = await supabase
      .from('friendships')
      .select('id')
      .eq('user_id', currentUserId)
      .eq('friend_id', profile.id)
      .single()

    if (existingFriendship) return { success: false, error: 'Already friends' }

    const { error } = await supabase.from('friend_requests').insert({
      from_user_id: currentUserId,
      to_user_id: profile.id,
    })

    if (error) return { success: false, error: error.message }

    await fetchRequests()
    return { success: true, error: null }
  }, [currentUserId, supabase, fetchRequests])

  const acceptFriendRequest = useCallback(async (requestId: string, fromUserId: string) => {
    if (!currentUserId) return

    // 1. Update the request status
    const { error: requestError } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId)

    if (requestError) {
      console.error('Error accepting request:', requestError)
      return
    }

    // 2. THE FIX: Create the two-way relationship rows
    const { error: friendshipError } = await supabase
      .from('friendships')
      .insert([
        { user_id: currentUserId, friend_id: fromUserId },
        { user_id: fromUserId, friend_id: currentUserId }
      ])

    if (friendshipError) {
      console.error('Error creating friendship:', friendshipError)
    }

    await fetchFriends()
    await fetchRequests()
  }, [currentUserId, supabase, fetchFriends, fetchRequests])

  const rejectFriendRequest = useCallback(async (requestId: string) => {
    await supabase.from('friend_requests').update({ status: 'rejected' }).eq('id', requestId)
    await fetchRequests()
  }, [supabase, fetchRequests])

  const cancelFriendRequest = useCallback(async (requestId: string) => {
    await supabase.from('friend_requests').delete().eq('id', requestId)
    await fetchRequests()
  }, [supabase, fetchRequests])

  const removeFriend = useCallback(async (friendId: string) => {
    if (!currentUserId) return
    await supabase
      .from('friendships')
      .delete()
      .or(`and(user_id.eq.${currentUserId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${currentUserId})`)

    if (selectedFriendIdRef.current === friendId) setSelectedFriend(null)
    await fetchFriends()
  }, [currentUserId, supabase, fetchFriends])

  useEffect(() => {
    if (!currentUserId) return
    let mounted = true

    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchFriends(), fetchRequests()])
      if (mounted) setIsLoading(false)
    }

    loadData()
    return () => { mounted = false }
  }, [currentUserId, supabase, fetchFriends, fetchRequests])

  useEffect(() => {
    if (!currentUserId) return

    channelRef.current = supabase
      .channel(`chat-messages-${currentUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUserId}` }, (payload) => {
        const newMessage = payload.new as Message
        if (selectedFriendIdRef.current === newMessage.sender_id) {
          setMessages((prev) => [...prev, newMessage])
          supabase.from('messages').update({ read: true }).eq('id', newMessage.id)
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${currentUserId}` }, (payload) => {
        const newMessage = payload.new as Message
        if (selectedFriendIdRef.current === newMessage.receiver_id) setMessages((prev) => [...prev, newMessage])
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, () => fetchRequests())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => fetchFriends())
      .subscribe()

    presenceChannelRef.current = supabase
      .channel('online-users')
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannelRef.current?.presenceState() || {}
        const online = new Set<string>()
        Object.values(state).forEach((users: any) => {
          users.forEach((u: { user_id: string }) => online.add(u.user_id))
        })
        setOnlineUsers(online)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await presenceChannelRef.current?.track({ user_id: currentUserId })
      })

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (presenceChannelRef.current) supabase.removeChannel(presenceChannelRef.current)
    }
  }, [currentUserId, supabase, fetchFriends, fetchRequests])

  useEffect(() => {
    setFriends((prev) => prev.map((f) => ({ ...f, isOnline: onlineUsers.has(f.id) })))
  }, [onlineUsers])

  useEffect(() => {
    if (selectedFriend) fetchMessages(selectedFriend.id)
    else setMessages([])
  }, [selectedFriend?.id, fetchMessages])

  return {
    friends,
    pendingRequests,
    sentRequests,
    messages,
    selectedFriend,
    setSelectedFriend,
    onlineUsers,
    isLoading,
    sendMessage,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriend,
    fetchFriends,
  }
}