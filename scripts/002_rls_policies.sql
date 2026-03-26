-- Row Level Security Policies for ProMeet

-- PROFILES POLICIES
-- Anyone can view profiles (needed for search)
create policy "profiles_select_all" on public.profiles 
  for select using (true);

-- Users can update their own profile
create policy "profiles_update_own" on public.profiles 
  for update using (auth.uid() = id);

-- Users can insert their own profile (handled by trigger but just in case)
create policy "profiles_insert_own" on public.profiles 
  for insert with check (auth.uid() = id);


-- FRIEND REQUESTS POLICIES
-- Users can see requests they sent or received
create policy "friend_requests_select" on public.friend_requests 
  for select using (auth.uid() = from_user_id or auth.uid() = to_user_id);

-- Users can create requests where they are the sender
create policy "friend_requests_insert" on public.friend_requests 
  for insert with check (auth.uid() = from_user_id);

-- Users can update requests where they are the recipient (to accept/reject)
create policy "friend_requests_update" on public.friend_requests 
  for update using (auth.uid() = to_user_id);

-- Users can delete requests they sent
create policy "friend_requests_delete" on public.friend_requests 
  for delete using (auth.uid() = from_user_id);


-- FRIENDSHIPS POLICIES
-- Users can see their own friendships
create policy "friendships_select" on public.friendships 
  for select using (auth.uid() = user_id or auth.uid() = friend_id);

-- Users can insert friendships where they are a participant
create policy "friendships_insert" on public.friendships 
  for insert with check (auth.uid() = user_id or auth.uid() = friend_id);

-- Users can delete their own friendships
create policy "friendships_delete" on public.friendships 
  for delete using (auth.uid() = user_id);


-- MESSAGES POLICIES
-- Users can see messages they sent or received
create policy "messages_select" on public.messages 
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Users can send messages (insert where they are sender)
create policy "messages_insert" on public.messages 
  for insert with check (auth.uid() = sender_id);

-- Users can update messages they received (to mark as read)
create policy "messages_update" on public.messages 
  for update using (auth.uid() = receiver_id);

-- Users can delete messages they sent
create policy "messages_delete" on public.messages 
  for delete using (auth.uid() = sender_id);
