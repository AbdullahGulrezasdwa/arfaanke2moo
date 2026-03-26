'use client'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Phone, PhoneOff } from 'lucide-react'
import type { IncomingCall } from '@/lib/types'

interface IncomingCallModalProps {
  incomingCall: IncomingCall | null
  onAccept: () => void
  onReject: () => void
}

export function IncomingCallModal({
  incomingCall,
  onAccept,
  onReject,
}: IncomingCallModalProps) {
  if (!incomingCall) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-card rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4 animate-in fade-in zoom-in duration-200">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <Avatar className="h-24 w-24 ring-4 ring-primary/20">
              <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                {incomingCall.callerName[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 h-8 w-8 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
              <Phone className="h-4 w-4 text-white" />
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-semibold">{incomingCall.callerName}</h2>
            <p className="text-muted-foreground mt-1">Incoming video call...</p>
          </div>

          <div className="flex items-center gap-6 mt-2">
            <Button
              variant="destructive"
              size="icon"
              className="h-16 w-16 rounded-full"
              onClick={onReject}
            >
              <PhoneOff className="h-7 w-7" />
            </Button>

            <Button
              size="icon"
              className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600"
              onClick={onAccept}
            >
              <Phone className="h-7 w-7" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
