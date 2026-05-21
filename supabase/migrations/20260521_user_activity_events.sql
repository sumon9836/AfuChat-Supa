-- User activity events — drives cross-device personalization
-- Tracks searches, views, interactions, profile visits, and feature usage.
-- All non-content metadata only (no message text, no private data).

CREATE TABLE IF NOT EXISTS public.user_activity_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  text        NOT NULL,
  event_data  jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Fast queries by user + time
CREATE INDEX IF NOT EXISTS idx_uae_user_time
  ON public.user_activity_events(user_id, created_at DESC);

-- Aggregation queries by event type per user
CREATE INDEX IF NOT EXISTS idx_uae_user_type
  ON public.user_activity_events(user_id, event_type);

-- Auto-expire events older than 90 days (keeps table small)
-- Run via cron or pg_cron: DELETE FROM user_activity_events WHERE created_at < now() - interval '90 days';

ALTER TABLE public.user_activity_events ENABLE ROW LEVEL SECURITY;

-- Users can only insert and read their own events
CREATE POLICY "Users insert own activity"
  ON public.user_activity_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own activity"
  ON public.user_activity_events FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can read all (for admin analytics)
CREATE POLICY "Service role reads all activity"
  ON public.user_activity_events FOR SELECT
  USING (auth.role() = 'service_role');
