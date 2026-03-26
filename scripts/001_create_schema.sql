-- ProMeet Database Schema
-- Tables: profiles, friend_requests, friendships, messages

-- 1. Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Friend requests table
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz default now(),
  unique(from_user_id, to_user_id)
);

-- 3. Friendships table (bidirectional, created when request accepted)
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, friend_id)
);

-- 4. Messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- Create indexes for performance
create index if not exists idx_friend_requests_to_user on public.friend_requests(to_user_id);
create index if not exists idx_friend_requests_from_user on public.friend_requests(from_user_id);
create index if not exists idx_friendships_user on public.friendships(user_id);
create index if not exists idx_friendships_friend on public.friendships(friend_id);
create index if not exists idx_messages_sender on public.messages(sender_id);
create index if not exists idx_messages_receiver on public.messages(receiver_id);
create index if not exists idx_messages_created on public.messages(created_at);
create index if not exists idx_profiles_username on public.profiles(username);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.messages enable row level security;
