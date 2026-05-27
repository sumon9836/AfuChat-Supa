-- Recreate notifications and notification_preferences tables.
-- These were dropped in 20260520_drop_notifications_table.sql but the mobile app
-- and several edge functions still query them, causing runtime errors.

-- ── notifications ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         text        NOT NULL,
  actor_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_id    text,
  entity_type  text,
  data         jsonb       NOT NULL DEFAULT '{}',
  read         boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- Denormalized actor columns for fast rendering without a join
  actor_name   text,
  actor_handle text,
  actor_avatar text,
  -- Rich-push display fields
  title        text,
  body         text
);

CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_id_read_idx
  ON public.notifications (user_id, read)
  WHERE read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "users view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (and edge functions) insert notifications for any user
CREATE POLICY "service role insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Users can mark their own notifications as read
CREATE POLICY "users update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "users delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);


-- ── notification_preferences ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id              uuid    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled         boolean NOT NULL DEFAULT true,
  push_messages        boolean NOT NULL DEFAULT true,
  push_likes           boolean NOT NULL DEFAULT true,
  push_follows         boolean NOT NULL DEFAULT true,
  push_gifts           boolean NOT NULL DEFAULT true,
  push_mentions        boolean NOT NULL DEFAULT true,
  push_replies         boolean NOT NULL DEFAULT true,
  quiet_hours_enabled  boolean NOT NULL DEFAULT false,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own notification_preferences"
  ON public.notification_preferences
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-create a preferences row when a profile is inserted
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_notification_preferences_on_signup ON public.profiles;
CREATE TRIGGER create_notification_preferences_on_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_default_notification_preferences();
