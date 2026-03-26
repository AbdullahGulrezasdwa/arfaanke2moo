'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Peer from 'peerjs'
import type { MediaConnection, DataConnection } from 'peerjs'
import type { IncomingCall } from '@/lib/types'

interface UsePeerOptions {
  userId: string
  onIncomingCall?: (call: IncomingCall) => void
}

export function usePeer({ userId, onIncomingCall }: UsePeerOptions) {
  const [peer, setPeer] = useState<Peer | null>(null)
  const [peerId, setPeerId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle')
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)

  const currentCallRef = useRef<MediaConnection | null>(null)
  const dataConnectionRef = useRef<DataConnection | null>(null)

  // Initialize peer connection
  useEffect(() => {
    // Use userId as the peer ID so others can call directly
    const newPeer = new Peer(userId, {
      debug: 0,
    })

    newPeer.on('open', (id) => {
      setPeerId(id)
      setIsConnected(true)
    })

    newPeer.on('error', (err) => {
      console.error('Peer error:', err)
      if (err.type === 'unavailable-id') {
        // ID is taken, try with a suffix
        const retryPeer = new Peer(`${userId}-${Date.now()}`, { debug: 0 })
        retryPeer.on('open', (id) => {
          setPeerId(id)
          setIsConnected(true)
          setPeer(retryPeer)
        })
      }
    })

    newPeer.on('call', async (call) => {
      // Handle incoming call
      const callerInfo = call.metadata as { callerName: string; callerId: string }
      
      if (onIncomingCall) {
        onIncomingCall({
          callerId: callerInfo.callerId,
          callerName: callerInfo.callerName,
          peerId: call.peer,
        })
      }

      // Store the call for later answering
      currentCallRef.current = call
    })

    newPeer.on('connection', (conn) => {
      dataConnectionRef.current = conn
      
      conn.on('data', (data) => {
        if (typeof data === 'object' && data !== null && 'type' in data) {
          const message = data as { type: string }
          if (message.type === 'call-ended') {
            handleCallEnded()
          }
        }
      })
    })

    newPeer.on('disconnected', () => {
      setIsConnected(false)
      newPeer.reconnect()
    })

    setPeer(newPeer)

    return () => {
      newPeer.destroy()
    }
  }, [userId, onIncomingCall])

  // Get local media stream
  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      setLocalStream(stream)
      return stream
    } catch (err) {
      console.error('Error getting media:', err)
      throw err
    }
  }, [])

  // Start a call
  const startCall = useCallback(async (
    remotePeerId: string,
    callerName: string,
    callerId: string
  ) => {
    if (!peer) return

    setCallStatus('calling')

    try {
      const stream = await getLocalStream()

      // Open data connection first
      const conn = peer.connect(remotePeerId)
      dataConnectionRef.current = conn

      conn.on('open', () => {
        // Make the media call
        const call = peer.call(remotePeerId, stream, {
          metadata: { callerName, callerId },
        })

        currentCallRef.current = call

        call.on('stream', (remoteMediaStream) => {
          setRemoteStream(remoteMediaStream)
          setCallStatus('connected')
        })

        call.on('close', () => {
          handleCallEnded()
        })

        call.on('error', (err) => {
          console.error('Call error:', err)
          handleCallEnded()
        })
      })

      conn.on('data', (data) => {
        if (typeof data === 'object' && data !== null && 'type' in data) {
          const message = data as { type: string }
          if (message.type === 'call-ended') {
            handleCallEnded()
          }
        }
      })
    } catch (err) {
      console.error('Error starting call:', err)
      setCallStatus('idle')
    }
  }, [peer, getLocalStream])

  // Answer an incoming call
  const answerCall = useCallback(async () => {
    if (!currentCallRef.current) return

    setCallStatus('connecting')

    try {
      const stream = await getLocalStream()
      
      currentCallRef.current.answer(stream)

      currentCallRef.current.on('stream', (remoteMediaStream) => {
        setRemoteStream(remoteMediaStream)
        setCallStatus('connected')
      })

      currentCallRef.current.on('close', () => {
        handleCallEnded()
      })

      currentCallRef.current.on('error', (err) => {
        console.error('Call error:', err)
        handleCallEnded()
      })
    } catch (err) {
      console.error('Error answering call:', err)
      setCallStatus('idle')
    }
  }, [getLocalStream])

  // End the call
  const endCall = useCallback(() => {
    // Notify the other peer
    if (dataConnectionRef.current?.open) {
      dataConnectionRef.current.send({ type: 'call-ended' })
    }

    handleCallEnded()
  }, [])

  const handleCallEnded = useCallback(() => {
    // Close the media call
    if (currentCallRef.current) {
      currentCallRef.current.close()
      currentCallRef.current = null
    }

    // Close data connection
    if (dataConnectionRef.current) {
      dataConnectionRef.current.close()
      dataConnectionRef.current = null
    }

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
      setLocalStream(null)
    }

    setRemoteStream(null)
    setCallStatus('ended')
    setIsMuted(false)
    setIsVideoOff(false)

    // Reset status after a moment
    setTimeout(() => setCallStatus('idle'), 100)
  }, [localStream])

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled
      })
      setIsMuted((prev) => !prev)
    }
  }, [localStream])

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled
      })
      setIsVideoOff((prev) => !prev)
    }
  }, [localStream])

  return {
    peer,
    peerId,
    isConnected,
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
  }
}
