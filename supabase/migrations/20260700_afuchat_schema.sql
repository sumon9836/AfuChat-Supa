-- ─────────────────────────────────────────────────────────────────────────────
-- AfuChat — Full Database Schema
-- Supabase SQL Editor → paste this entire file and click Run
--
-- Tables: profiles, conversations, conversation_members, messages,
--         message_reactions, starred_messages, notifications,
--         subscription_plans, user_subscriptions, blocked_users
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── 1. PROFILES ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                        uuid primary key references auth.users(id) on delete cascade,
  handle                    text unique not null default '',
  display_name              text not null default '',
  avatar_url                text,
  banner_url                text,
  bio                       text,
  phone_number              text unique,
  website_url               text,
  country                   text,
  region                    text,
  language                  text default 'en',
  gender                    text,
  date_of_birth             date,
  interests                 text[] default '{}',
  xp                        integer default 0,
  acoin                     integer default 0,
  current_grade             text default 'bronze',
  is_admin                  boolean default false,
  is_support_staff          boolean default false,
  is_verified               boolean default false,
  is_organization_verified  boolean default false,
  is_private                boolean default false,
  is_business_mode          boolean default false,
  show_online_status        boolean default true,
  tipping_enabled           boolean default false,
  onboarding_completed      boolean default false,
  platinum_until            timestamptz,
  scheduled_deletion_at     timestamptz,
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;

create policy "profiles_select_all" on public.profiles
  for select using (true);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- Admin can update any profile
create policy "profiles_admin_update" on public.profiles
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url, handle)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'User'),
    new.raw_user_meta_data->>'avatar_url',
    lower(regexp_replace(
      coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'user'),
      '[^a-z0-9_]', '', 'g'
    )) || '_' || substring(new.id::text from 1 for 6)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── 2. SUBSCRIPTION PLANS (minimal — needed by AuthContext) ─────────────────
create table if not exists public.subscription_plans (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  tier       text not null default 'free',
  features   jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.subscription_plans enable row level security;
create policy "subscription_plans_select" on public.subscription_plans for select using (true);

-- ─── 3. USER SUBSCRIPTIONS ───────────────────────────────────────────────────
create table if not exists public.user_subscriptions (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references public.profiles(id) on delete cascade,
  plan_id         uuid references public.subscription_plans(id),
  started_at      timestamptz default now(),
  expires_at      timestamptz,
  is_active       boolean default true,
  acoin_paid      integer default 0,
  created_at      timestamptz default now()
);

alter table public.user_subscriptions enable row level security;
create policy "user_subscriptions_select_own" on public.user_subscriptions
  for select using (auth.uid() = user_id);

-- ─── 4. CONVERSATIONS ────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id          uuid primary key default uuid_generate_v4(),
  name        text,
  avatar_url  text,
  description text,
  is_group    boolean default false,
  is_channel  boolean default false,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.conversations enable row level security;

-- Users can see conversations they are a member of
create policy "conversations_select_member" on public.conversations
  for select using (
    exists (
      select 1 from public.conversation_members
      where conversation_id = conversations.id
        and user_id = auth.uid()
    )
  );

-- Admins can see all conversations
create policy "conversations_select_admin" on public.conversations
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Only admins can create group/channel conversations
create policy "conversations_insert_admin" on public.conversations
  for insert with check (
    -- DM (not group, not channel): any user can create
    (is_group = false and is_channel = false)
    or
    -- Group/channel: admin only
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Only admins can update conversations
create policy "conversations_update_admin" on public.conversations
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Only admins can delete conversations
create policy "conversations_delete_admin" on public.conversations
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ─── 5. CONVERSATION MEMBERS ─────────────────────────────────────────────────
create table if not exists public.conversation_members (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete cascade,
  is_admin        boolean default false,
  joined_at       timestamptz default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_members enable row level security;

-- Members can see membership of conversations they belong to
create policy "conv_members_select" on public.conversation_members
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.conversation_members cm2
      where cm2.conversation_id = conversation_members.conversation_id
        and cm2.user_id = auth.uid()
    )
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Users can insert themselves (join DMs); admins can insert anyone
create policy "conv_members_insert" on public.conversation_members
  for insert with check (
    auth.uid() = user_id
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "conv_members_delete" on public.conversation_members
  for delete using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ─── 6. MESSAGES ─────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id                   uuid primary key default uuid_generate_v4(),
  chat_id              uuid references public.conversations(id) on delete cascade,
  sender_id            uuid references public.profiles(id) on delete set null,
  encrypted_content    text,
  attachment_url       text,
  attachment_type      text,
  reply_to_message_id  uuid references public.messages(id) on delete set null,
  status               text default 'sent',
  edited_at            timestamptz,
  sent_at              timestamptz default now(),
  created_at           timestamptz default now()
);

alter table public.messages enable row level security;

-- Members of a conversation can read its messages
create policy "messages_select" on public.messages
  for select using (
    exists (
      select 1 from public.conversation_members
      where conversation_id = messages.chat_id
        and user_id = auth.uid()
    )
  );

-- Members can insert messages into conversations they belong to
create policy "messages_insert" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversation_members
      where conversation_id = messages.chat_id
        and user_id = auth.uid()
    )
  );

-- Users can update/delete their own messages
create policy "messages_update_own" on public.messages
  for update using (auth.uid() = sender_id);

create policy "messages_delete_own" on public.messages
  for delete using (
    auth.uid() = sender_id
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ─── 7. MESSAGE REACTIONS ────────────────────────────────────────────────────
create table if not exists public.message_reactions (
  id         uuid primary key default uuid_generate_v4(),
  message_id uuid references public.messages(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz default now(),
  unique(message_id, user_id, emoji)
);

alter table public.message_reactions enable row level security;

create policy "reactions_select" on public.message_reactions for select using (true);
create policy "reactions_insert" on public.message_reactions
  for insert with check (auth.uid() = user_id);
create policy "reactions_delete" on public.message_reactions
  for delete using (auth.uid() = user_id);

-- ─── 8. STARRED MESSAGES ─────────────────────────────────────────────────────
create table if not exists public.starred_messages (
  user_id    uuid references public.profiles(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, message_id)
);

alter table public.starred_messages enable row level security;
create policy "starred_select_own" on public.starred_messages for select using (auth.uid() = user_id);
create policy "starred_insert_own" on public.starred_messages for insert with check (auth.uid() = user_id);
create policy "starred_delete_own" on public.starred_messages for delete using (auth.uid() = user_id);

-- ─── 9. BLOCKED USERS ────────────────────────────────────────────────────────
create table if not exists public.blocked_users (
  blocker_id uuid references public.profiles(id) on delete cascade,
  blocked_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

alter table public.blocked_users enable row level security;
create policy "blocked_select_own" on public.blocked_users for select using (auth.uid() = blocker_id);
create policy "blocked_insert_own" on public.blocked_users for insert with check (auth.uid() = blocker_id);
create policy "blocked_delete_own" on public.blocked_users for delete using (auth.uid() = blocker_id);

-- ─── 10. NOTIFICATIONS ───────────────────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade,
  type        text not null,
  title       text,
  body        text,
  data        jsonb default '{}',
  is_read     boolean default false,
  created_at  timestamptz default now()
);

alter table public.notifications enable row level security;
create policy "notifications_select_own" on public.notifications for select using (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications for update using (auth.uid() = user_id);
create policy "notifications_delete_own" on public.notifications for delete using (auth.uid() = user_id);

-- ─── 11. REALTIME ────────────────────────────────────────────────────────────
-- Enable Realtime on tables needed for live chat
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.conversation_members;
alter publication supabase_realtime add table public.message_reactions;
alter publication supabase_realtime add table public.notifications;

-- ─── 12. INDEXES ─────────────────────────────────────────────────────────────
create index if not exists idx_messages_chat_id       on public.messages(chat_id, sent_at desc);
create index if not exists idx_messages_sender_id     on public.messages(sender_id);
create index if not exists idx_conv_members_user_id   on public.conversation_members(user_id);
create index if not exists idx_conv_members_conv_id   on public.conversation_members(conversation_id);
create index if not exists idx_notifications_user_id  on public.notifications(user_id, created_at desc);
create index if not exists idx_profiles_handle        on public.profiles(handle);

-- ─── DONE ─────────────────────────────────────────────────────────────────────
-- Run this SQL in: Supabase Dashboard → SQL Editor → New query → Run
-- After running, go to: Authentication → Providers → Google → enable Google OAuth
-- Add your Google Client ID and Secret from console.cloud.google.com
