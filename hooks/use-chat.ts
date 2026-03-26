'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import type {
  Profile,
  FriendRequest,
  Message,
  ChatUser,
} from '@/lib/types'

export function useChat(currentUserId: string | null) {
  const [friends, setFriends] = useState<ChatUser[]>([])
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([])
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedFriend, setSelectedFriend] = useState<ChatUser | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  
  const supabase = createClient()
  
  // Use a ref for the selected friend so the Realtime listener 
  // doesn't have to restart every time you switch chats.
  const selectedFriendRef = useRef<string | null>(null)
  useEffect(() => {
    selectedFriendRef.current = selectedFriend?.id || null
  }, [selectedFriend])

  // --- 1. DATA FETCHERS (Static Dependencies) ---
  const fetchFriends = useCallback(async () => {
    if (!currentUserId) return
    const { data } = await supabase
      .from('friendships')
      .select(`id, friend_id, friend:profiles!friendships_friend_id_fkey(*)`)
      .eq('user_id', currentUserId)

    if (data) {
      setFriends(data.map((f) => ({
        ...((f.friend as unknown as Profile) || {}),
        isOnline: false,
      })) as ChatUser[])
    }
  }, [currentUserId, supabase])

  const fetchRequests = useCallback(async () => {
    if (!currentUserId) return
    const { data: pending } = await supabase
      .from('friend_requests')
      .select('*, from_profile:profiles!friend_requests_from_user_id_fkey(*)')
      .eq('to_user_id', currentUserId)
      .eq('status', 'pending')

    const { data: sent } = await supabase
      .from('friend_requests')
      .select('*, to_profile:profiles!friend_requests_to_user_id_fkey(*)')
      .eq('from_user_id', currentUserId)
      .eq('status', 'pending')

    setPendingRequests((pending || []) as FriendRequest[])
    setSentRequests((sent || []) as FriendRequest[])
  }, [currentUserId, supabase])

  const fetchMessages = useCallback(async (friendId: string) => {
    if (!currentUserId) return
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true })

    setMessages(data || [])
    
    // Mark as read
    await supabase.from('messages').update({ read: true })
      .eq('sender_id', friendId).eq('receiver_id', currentUserId).eq('read', false)
  }, [currentUserId, supabase])

  // --- 2. REALTIME (Safe Dependencies) ---
  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase.channel('db-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as Message
        if (selectedFriendRef.current === msg.sender_id || selectedFriendRef.current === msg.receiver_id) {
          setMessages(prev => [...prev, msg])
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, () => fetchRequests())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => fetchFriends())
      .subscribe()

    const presence = supabase.channel('online-sync')
      .on('presence', { event: 'sync' }, () => {
        const state = presence.presenceState()
        const online = new Set<string>()
        Object.values(state).forEach((items: any) => {
          items.forEach((p: any) => online.add(p.user_id))
        })
        setOnlineUsers(online)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await presence.track({ user_id: currentUserId })
      })

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(presence)
    }
  }, [currentUserId, supabase, fetchFriends, fetchRequests])

  // --- 3. INITIAL LOAD ---
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      await Promise.all([fetchFriends(), fetchRequests()])
      setIsLoading(false)
    }
    load()
  }, [fetchFriends, fetchRequests])

  // --- 4. MESSAGE SYNC ---
  useEffect(() => {
    if (selectedFriend) fetchMessages(selectedFriend.id)
    else setMessages([])
  }, [selectedFriend, fetchMessages])

  // --- 5. LOOP BREAKER (Derived State) ---
  const friendsWithStatus = useMemo(() => {
    return friends.map(f => ({
      ...f,
      isOnline: onlineUsers.has(f.id)
    }))
  }, [friends, onlineUsers])

  // --- ACTIONS ---
  const sendMessage = async (content: string) => {
    if (!currentUserId || !selectedFriend || !content.trim()) return
    await supabase.from('messages').insert({
      sender_id: currentUserId,
      receiver_id: selectedFriend.id,
      content: content.trim(),
    })
  }

  const sendFriendRequest = async (username: string) => {
    if (!currentUserId) return { success: false, error: 'Not logged in' }
    const { data: profile } = await supabase.from('profiles').select('id').eq('username', username.toLowerCase()).single()
    if (!profile) return { success: false, error: 'User not found' }
    const { error } = await supabase.from('friend_requests').insert({ from_user_id: currentUserId, to_user_id: profile.id })
    if (error) return { success: false, error: error.message }
    await fetchRequests()
    return { success: true, error: null }
  }

  const acceptFriendRequest = async (requestId: string, fromUserId: string) => {
    if (!currentUserId) return
    await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId)
    await supabase.from('friendships').insert([{ user_id: currentUserId, friend_id: fromUserId }, { user_id: fromUserId, friend_id: currentUserId }])
    await fetchFriends(); await fetchRequests()
  }

  const rejectFriendRequest = async (requestId: string) => {
    await supabase.from('friend_requests').update({ status: 'rejected' }).eq('id', requestId)
    await fetchRequests()
  }

  const cancelFriendRequest = async (requestId: string) => {
    await supabase.from('friend_requests').delete().eq('id', requestId)
    await fetchRequests()
  }

  const removeFriend = async (friendId: string) => {
    if (!currentUserId) return
    await supabase.from('friendships').delete().or(`and(user_id.eq.${currentUserId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${currentUserId})`)
    if (selectedFriend?.id === friendId) setSelectedFriend(null)
    await fetchFriends()
  }

  return {
    friends: friendsWithStatus,
    pendingRequests,
    sentRequests,
    messages,
    selectedFriend,
    setSelectedFriend,
    isLoading,
    sendMessage,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriend,
  }
}
