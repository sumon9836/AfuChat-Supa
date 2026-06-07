-- ─── crash_logs ─────────────────────────────────────────────────────────────
-- Receives in-app JS crash reports from the mobile client.
-- Inserts are allowed without auth (anon key) so the reporter works even when
-- the user session is expired or the crash happens before auth resolves.
-- Reads are restricted to the service role (use Supabase Dashboard to triage).

CREATE TABLE IF NOT EXISTS crash_logs (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Error classification
  error_type       TEXT        NOT NULL DEFAULT 'js_error',  -- js_error | unhandled_rejection | react_render | native_bridge
  error_message    TEXT,
  stack_trace      TEXT,
  component_stack  TEXT,       -- React component stack (ErrorBoundary only)

  -- Build context
  platform         TEXT,       -- 'android' | 'ios'
  app_version      TEXT,       -- e.g. '2.0.1'
  build_number     TEXT,       -- e.g. '42'
  is_dev           BOOLEAN     DEFAULT FALSE,

  -- User (nullable — crash may happen before login)
  user_id          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Device metadata
  device_info      JSONB,      -- { model_name, os_version, screen_width, screen_height, brand, … }

  -- Catch-all
  extra            JSONB       -- { is_fatal, queued_at, … }
);

-- Index for common dashboard queries
CREATE INDEX IF NOT EXISTS crash_logs_created_at_idx  ON crash_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS crash_logs_user_id_idx     ON crash_logs (user_id);
CREATE INDEX IF NOT EXISTS crash_logs_error_type_idx  ON crash_logs (error_type);
CREATE INDEX IF NOT EXISTS crash_logs_app_version_idx ON crash_logs (app_version);

-- ── Row-level security ────────────────────────────────────────────────────────
ALTER TABLE crash_logs ENABLE ROW LEVEL SECURITY;

-- Mobile app may insert using the anon key (no auth required — crash may happen
-- before the user session resolves).
CREATE POLICY "crash_logs_insert_anon"
  ON crash_logs FOR INSERT
  WITH CHECK (true);

-- Only service role (Supabase Dashboard / server admin) can read crash logs.
-- Regular authenticated users cannot read each other's (or their own) crash data.
CREATE POLICY "crash_logs_select_service"
  ON crash_logs FOR SELECT
  USING (auth.role() = 'service_role');
