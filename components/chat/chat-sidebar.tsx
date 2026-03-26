'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  UserPlus,
  Users,
  Check,
  X,
  Clock,
  Trash2,
  Video,
  LogOut,
} from 'lucide-react'
import type { ChatUser, FriendRequest, Profile } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ChatSidebarProps {
  currentUser: Profile
  friends: ChatUser[]
  pendingRequests: FriendRequest[]
  sentRequests: FriendRequest[]
  selectedFriend: ChatUser | null
  onSelectFriend: (friend: ChatUser) => void
  onSendFriendRequest: (username: string) => Promise<{ success: boolean; error: string | null }>
  onAcceptRequest: (requestId: string, fromUserId: string) => void
  onRejectRequest: (requestId: string) => void
  onCancelRequest: (requestId: string) => void
  onRemoveFriend: (friendId: string) => void
  onStartCall: (friend: ChatUser) => void
  onSignOut: () => void
}

export function ChatSidebar({
  currentUser,
  friends,
  pendingRequests,
  sentRequests,
  selectedFriend,
  onSelectFriend,
  onSendFriendRequest,
  onAcceptRequest,
  onRejectRequest,
  onCancelRequest,
  onRemoveFriend,
  onStartCall,
  onSignOut,
}: ChatSidebarProps) {
  const [addFriendOpen, setAddFriendOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleAddFriend = async () => {
    if (!username.trim()) return

    setIsLoading(true)
    setError(null)

    const result = await onSendFriendRequest(username.trim())
    
    if (result.success) {
      setUsername('')
      setAddFriendOpen(false)
    } else {
      setError(result.error)
    }

    setIsLoading(false)
  }

  return (
    <div className="flex h-full w-80 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Video className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <span className="font-semibold text-sidebar-foreground">ProMeet</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSignOut}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      {/* Current User */}
      <div className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
              {currentUser.username[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium text-sidebar-foreground truncate">
              {currentUser.display_name || currentUser.username}
            </span>
            <span className="text-xs text-sidebar-foreground/60 truncate">
              @{currentUser.username}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="friends" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-4 grid w-auto grid-cols-2 bg-sidebar-accent">
          <TabsTrigger value="friends" className="gap-2">
            <Users className="h-4 w-4" />
            Friends
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2 relative">
            <UserPlus className="h-4 w-4" />
            Requests
            {pendingRequests.length > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
              >
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="flex-1 flex flex-col min-h-0 mt-0">
          <div className="px-4 py-3">
            <Dialog open={addFriendOpen} onOpenChange={setAddFriendOpen}>
              <DialogTrigger asChild>
                <Button className="w-full gap-2" size="sm">
                  <UserPlus className="h-4 w-4" />
                  Add Friend
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add a Friend</DialogTitle>
                  <DialogDescription>
                    Enter their username to send a friend request.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      placeholder="Enter username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
                    />
                    {error && <p className="text-sm text-destructive">{error}</p>}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleAddFriend}
                    disabled={isLoading || !username.trim()}
                  >
                    {isLoading ? 'Sending...' : 'Send Request'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <ScrollArea className="flex-1 px-2">
            {friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-12 w-12 text-sidebar-foreground/30 mb-2" />
                <p className="text-sm text-sidebar-foreground/60">No friends yet</p>
                <p className="text-xs text-sidebar-foreground/40">Add friends to start chatting</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1 pb-4">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg p-3 cursor-pointer transition-colors',
                      selectedFriend?.id === friend.id
                        ? 'bg-sidebar-accent'
                        : 'hover:bg-sidebar-accent/50'
                    )}
                    onClick={() => onSelectFriend(friend)}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-sidebar-primary/80 text-sidebar-primary-foreground">
                          {friend.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={cn(
                          'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-sidebar',
                          friend.isOnline ? 'bg-online' : 'bg-offline'
                        )}
                      />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-medium text-sidebar-foreground truncate">
                        {friend.display_name || friend.username}
                      </p>
                      <p className="text-xs text-sidebar-foreground/60">
                        {friend.isOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                        onClick={(e) => {
                          e.stopPropagation()
                          onStartCall(friend)
                        }}
                      >
                        <Video className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-sidebar-foreground hover:bg-destructive hover:text-destructive-foreground"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveFriend(friend.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="requests" className="flex-1 flex flex-col min-h-0 mt-0 px-4">
          <ScrollArea className="flex-1">
            {/* Pending Requests (Received) */}
            {pendingRequests.length > 0 && (
              <div className="py-3">
                <h3 className="text-xs font-medium text-sidebar-foreground/60 uppercase mb-2">
                  Received
                </h3>
                <div className="flex flex-col gap-2">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center gap-3 rounded-lg bg-sidebar-accent p-3"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-sidebar-primary/80 text-sidebar-primary-foreground text-sm">
                          {request.from_profile?.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-sidebar-foreground truncate">
                          {request.from_profile?.display_name || request.from_profile?.username}
                        </p>
                        <p className="text-xs text-sidebar-foreground/60 truncate">
                          @{request.from_profile?.username}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-success hover:bg-success hover:text-success-foreground"
                          onClick={() => onAcceptRequest(request.id, request.from_user_id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => onRejectRequest(request.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sent Requests */}
            {sentRequests.length > 0 && (
              <div className="py-3">
                <h3 className="text-xs font-medium text-sidebar-foreground/60 uppercase mb-2">
                  Sent
                </h3>
                <div className="flex flex-col gap-2">
                  {sentRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center gap-3 rounded-lg bg-sidebar-accent p-3"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-sidebar-primary/80 text-sidebar-primary-foreground text-sm">
                          {request.to_profile?.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-sidebar-foreground truncate">
                          {request.to_profile?.display_name || request.to_profile?.username}
                        </p>
                        <p className="text-xs text-sidebar-foreground/60 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Pending
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => onCancelRequest(request.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendingRequests.length === 0 && sentRequests.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <UserPlus className="h-12 w-12 text-sidebar-foreground/30 mb-2" />
                <p className="text-sm text-sidebar-foreground/60">No requests</p>
                <p className="text-xs text-sidebar-foreground/40">
                  Friend requests will appear here
                </p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
