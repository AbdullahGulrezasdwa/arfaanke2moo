export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface FriendRequest {
  id: string
  from_user_id: string
  to_user_id: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  from_profile?: Profile
  to_profile?: Profile
}

export interface Friendship {
  id: string
  user_id: string
  friend_id: string
  created_at: string
  friend?: Profile
}

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  read: boolean
  created_at: string
}

export interface ChatUser extends Profile {
  isOnline?: boolean
  unreadCount?: number
}

export interface IncomingCall {
  callerId: string
  callerName: string
  peerId: string
}
