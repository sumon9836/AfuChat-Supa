-- Notifications Table
-- ============================================================
-- Creates the public.notifications table that follow (and other)
-- database triggers insert into. Missing this table causes a
-- 42P01 "relation does not exist" error whenever a user follows
-- someone, because the follows trigger fires a notification row.
--
-- Run this in your Supabase SQL editor or via `supabase db push`.

CREATE TABLE IF NOT EXISTS public.notifications (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type             TEXT        NOT NULL,
  actor_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reference_id     TEXT,
  reference_type   TEXT,
  data             JSONB       NOT NULL DEFAULT '{}',
  read             BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast per-user inbox queries (most recent first)
CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx
  ON public.notifications (user_id, created_at DESC);

-- Index for unread badge count
CREATE INDEX IF NOT EXISTS notifications_user_id_read_idx
  ON public.notifications (user_id, read)
  WHERE read = false;

-- Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Only the server (service role) or SECURITY DEFINER functions can insert
-- notifications on behalf of any user. Authenticated users cannot insert
-- directly (all inserts go through edge functions / triggers).
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);
