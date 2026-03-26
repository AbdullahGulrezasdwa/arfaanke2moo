-- Enable Realtime for messages and friend_requests tables
-- This allows instant message delivery and friend request notifications

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.friend_requests;
