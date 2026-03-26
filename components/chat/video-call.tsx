'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { usePeer } from '@/hooks/use-peer'
import type { Profile, ChatUser, IncomingCall } from '@/lib/types'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface VideoCallProps {
  currentUser: Profile
  callPartner: ChatUser
  remotePeerId: string | null
  onEndCall: () => void
  onIncomingCall: (call: IncomingCall) => void
}

export function VideoCall({
  currentUser,
  callPartner,
  remotePeerId,
  onEndCall,
  onIncomingCall,
}: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    peerId,
    localStream,
    remoteStream,
    callStatus,
    isMuted,
    isVideoOff,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = usePeer({
    userId: currentUser.id,
    onIncomingCall,
  })

  // Set up local video
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  // Set up remote video
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // Start or answer call
  useEffect(() => {
    if (peerId && callPartner) {
      if (remotePeerId) {
        // Answering an incoming call
        answerCall()
      } else {
        // Starting a new call
        const callerName = currentUser.display_name || currentUser.username
        startCall(callPartner.id, callerName, currentUser.id)
      }
    }
  }, [peerId, callPartner, remotePeerId, answerCall, startCall, currentUser])

  const handleEndCall = useCallback(() => {
    endCall()
    onEndCall()
  }, [endCall, onEndCall])

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
    >
      {/* Main video area */}
      <div className="relative flex-1 flex items-center justify-center">
        {/* Remote video (or placeholder) */}
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-32 w-32">
              <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
                {callPartner.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-white">
                {callPartner.display_name || callPartner.username}
              </h2>
              <p className="text-gray-400 mt-1">
                {callStatus === 'calling' && 'Calling...'}
                {callStatus === 'connecting' && 'Connecting...'}
                {callStatus === 'connected' && 'Connected'}
                {callStatus === 'ended' && 'Call ended'}
                {callStatus === 'idle' && 'Starting call...'}
              </p>
            </div>
          </div>
        )}

        {/* Local video (picture-in-picture) */}
        <div className="absolute bottom-24 right-6 w-48 aspect-video rounded-lg overflow-hidden bg-gray-900 shadow-lg border border-gray-700">
          {localStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                'w-full h-full object-cover',
                isVideoOff && 'hidden'
              )}
            />
          ) : null}
          {(isVideoOff || !localStream) && (
            <div className="w-full h-full flex items-center justify-center">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-gray-700 text-gray-300">
                  {currentUser.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
          {isMuted && (
            <div className="absolute bottom-2 left-2 p-1 rounded-full bg-red-500">
              <MicOff className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        {/* Fullscreen toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-white hover:bg-white/20"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? (
            <Minimize2 className="h-5 w-5" />
          ) : (
            <Maximize2 className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Call controls */}
      <div className="flex items-center justify-center gap-4 p-6 bg-black/50">
        <Button
          variant="outline"
          size="icon"
          className={cn(
            'h-14 w-14 rounded-full border-2',
            isMuted
              ? 'bg-red-500 border-red-500 hover:bg-red-600 hover:border-red-600'
              : 'bg-white/10 border-white/20 hover:bg-white/20'
          )}
          onClick={toggleMute}
        >
          {isMuted ? (
            <MicOff className="h-6 w-6 text-white" />
          ) : (
            <Mic className="h-6 w-6 text-white" />
          )}
        </Button>

        <Button
          variant="outline"
          size="icon"
          className={cn(
            'h-14 w-14 rounded-full border-2',
            isVideoOff
              ? 'bg-red-500 border-red-500 hover:bg-red-600 hover:border-red-600'
              : 'bg-white/10 border-white/20 hover:bg-white/20'
          )}
          onClick={toggleVideo}
        >
          {isVideoOff ? (
            <VideoOff className="h-6 w-6 text-white" />
          ) : (
            <Video className="h-6 w-6 text-white" />
          )}
        </Button>

        <Button
          variant="destructive"
          size="icon"
          className="h-14 w-14 rounded-full"
          onClick={handleEndCall}
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  )
}
