-- ─────────────────────────────────────────────────────────────────────────────
-- Video Watch History — server-side, cross-device persistent watch log
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run (F5)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.video_watch_history (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id      uuid        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  watched_at   timestamptz NOT NULL DEFAULT now(),
  progress     float       NOT NULL DEFAULT 0,   -- 0.0–1.0 completion fraction
  watch_count  integer     NOT NULL DEFAULT 1,   -- increments on each re-watch
  title        text,
  thumbnail    text,
  video_url    text,
  CONSTRAINT video_watch_history_unique UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS video_watch_history_user_idx
  ON public.video_watch_history (user_id, watched_at DESC);

ALTER TABLE public.video_watch_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='video_watch_history' AND policyname='users_view_own_history') THEN
    CREATE POLICY "users_view_own_history"
      ON public.video_watch_history FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='video_watch_history' AND policyname='users_insert_own_history') THEN
    CREATE POLICY "users_insert_own_history"
      ON public.video_watch_history FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='video_watch_history' AND policyname='users_update_own_history') THEN
    CREATE POLICY "users_update_own_history"
      ON public.video_watch_history FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='video_watch_history' AND policyname='users_delete_own_history') THEN
    CREATE POLICY "users_delete_own_history"
      ON public.video_watch_history FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
  -- Service role bypasses RLS for API-server-side writes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='video_watch_history' AND policyname='service_role_all') THEN
    CREATE POLICY "service_role_all"
      ON public.video_watch_history FOR ALL
      TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;
