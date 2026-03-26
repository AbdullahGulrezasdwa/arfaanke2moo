'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useChat } from '@/hooks/use-chat'
import { ChatSidebar } from '@/components/chat/chat-sidebar'
import { MessageArea } from '@/components/chat/message-area'
import { VideoCall } from '@/components/chat/video-call'
import { IncomingCallModal } from '@/components/chat/incoming-call-modal'
import { Spinner } from '@/components/ui/spinner'
import type { Profile, ChatUser, IncomingCall } from '@/lib/types'

interface ChatClientProps {
  initialProfile: Profile
}

export function ChatClient({ initialProfile }: ChatClientProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [isInCall, setIsInCall] = useState(false)
  const [callPartner, setCallPartner] = useState<ChatUser | null>(null)
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const [remotePeerId, setRemotePeerId] = useState<string | null>(null)

  const {
    friends,
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
  } = useChat(initialProfile.id)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const handleStartCall = useCallback((friend: ChatUser) => {
    setCallPartner(friend)
    setRemotePeerId(null)
    setIsInCall(true)
  }, [])

  const handleIncomingCall = useCallback((call: IncomingCall) => {
    setIncomingCall(call)
  }, [])

  const handleAcceptCall = useCallback(() => {
    if (incomingCall) {
      const friend = friends.find(f => f.id === incomingCall.callerId)
      if (friend) {
        setCallPartner(friend)
        setRemotePeerId(incomingCall.peerId)
        setIsInCall(true)
      }
      setIncomingCall(null)
    }
  }, [incomingCall, friends])

  const handleRejectCall = useCallback(() => {
    setIncomingCall(null)
  }, [])

  const handleEndCall = useCallback(() => {
    setIsInCall(false)
    setCallPartner(null)
    setRemotePeerId(null)
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-svh items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="flex h-svh">
      <ChatSidebar
        currentUser={initialProfile}
        friends={friends}
        pendingRequests={pendingRequests}
        sentRequests={sentRequests}
        selectedFriend={selectedFriend}
        onSelectFriend={setSelectedFriend}
        onSendFriendRequest={sendFriendRequest}
        onAcceptRequest={acceptFriendRequest}
        onRejectRequest={rejectFriendRequest}
        onCancelRequest={cancelFriendRequest}
        onRemoveFriend={removeFriend}
        onStartCall={handleStartCall}
        onSignOut={handleSignOut}
      />

      <MessageArea
        currentUser={initialProfile}
        selectedFriend={selectedFriend}
        messages={messages}
        onSendMessage={sendMessage}
        onStartCall={handleStartCall}
        onRemoveFriend={removeFriend}
      />

      {isInCall && callPartner && (
        <VideoCall
          currentUser={initialProfile}
          callPartner={callPartner}
          remotePeerId={remotePeerId}
          onEndCall={handleEndCall}
          onIncomingCall={handleIncomingCall}
        />
      )}

      <IncomingCallModal
        incomingCall={incomingCall}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />
    </div>
  )
}
