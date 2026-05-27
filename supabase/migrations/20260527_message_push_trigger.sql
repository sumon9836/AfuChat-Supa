-- ── Server-side push-notification triggers ────────────────────────────────────
--
-- Sets up PostgreSQL triggers that fire the `push-notification-trigger`
-- Supabase Edge Function whenever a row is INSERTed into:
--   • messages       → chat push to all non-sender members
--   • calls          → incoming-call push to callee
--   • notifications  → social/system push to target user
--
-- This works even when neither the sender's nor the recipient's app is open,
-- because the trigger runs inside the database, not in any client app.
--
-- ── Prerequisites ────────────────────────────────────────────────────────────
-- 1. Deploy the edge function:
--      supabase functions deploy push-notification-trigger
--
-- 2. Add PUSH_WEBHOOK_TOKEN to edge function secrets (Supabase Dashboard →
--    Edge Functions → push-notification-trigger → Secrets):
--      PUSH_WEBHOOK_TOKEN = <any strong random string, e.g. openssl rand -hex 32>
--
-- 3. Store the SAME token in Postgres so triggers can read it:
--      (run in Supabase SQL Editor, once after generating the token)
--      ALTER DATABASE postgres SET "app.push_webhook_token" = 'your-token-here';
--
-- 4. Apply this migration in Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable pg_net extension (safe to run even if already enabled).
-- Supabase installs it in the 'extensions' schema; DO NOT change the schema.
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Shared trigger function ───────────────────────────────────────────────────
-- Fire-and-forget HTTP call to the push edge function.
-- Runs AFTER INSERT so the row is committed before the push fires.
-- Wrapped in EXCEPTION so a push failure can never cause the INSERT to fail.

CREATE OR REPLACE FUNCTION public.notify_push_on_db_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, net
AS $$
DECLARE
  _token   text;
  _url     text;
  _headers jsonb;
  _body    jsonb;
BEGIN
  -- Read webhook token; gracefully skip if not configured yet
  _token := current_setting('app.push_webhook_token', true);

  IF _token IS NULL OR _token = '' THEN
    -- Token not set: log and skip (don't block INSERT)
    RAISE WARNING '[push-trigger] app.push_webhook_token not configured; push skipped';
    RETURN NEW;
  END IF;

  _url := 'https://rhnsjqqtdzlkvqazfcbg.supabase.co/functions/v1/push-notification-trigger';

  _headers := jsonb_build_object(
    'Content-Type',    'application/json',
    'x-webhook-token', _token
  );

  _body := jsonb_build_object(
    'type',       TG_OP,
    'table',      TG_TABLE_NAME,
    'schema',     TG_TABLE_SCHEMA,
    'record',     to_jsonb(NEW),
    'old_record', null
  );

  -- net.http_post is fire-and-forget (returns a request_id, doesn't block).
  -- Body must be cast to text for pg_net's expected signature.
  PERFORM net.http_post(
    url              := _url,
    headers          := _headers,
    body             := _body::text,
    timeout_milliseconds := 5000
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never let a push failure block a DB write
  RAISE WARNING '[push-trigger] http_post error on table %: %', TG_TABLE_NAME, SQLERRM;
  RETURN NEW;
END;
$$;

-- ── messages trigger ──────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS push_on_message_insert ON public.messages;
CREATE TRIGGER push_on_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_push_on_db_event();

-- ── calls trigger ─────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS push_on_call_insert ON public.calls;
CREATE TRIGGER push_on_call_insert
  AFTER INSERT ON public.calls
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_push_on_db_event();

-- ── notifications trigger ─────────────────────────────────────────────────────
-- Only add this trigger once the notifications table has been recreated
-- (see migration 20260527_recreate_notifications.sql).

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) THEN
    EXECUTE '
      DROP TRIGGER IF EXISTS push_on_notification_insert ON public.notifications;
      CREATE TRIGGER push_on_notification_insert
        AFTER INSERT ON public.notifications
        FOR EACH ROW
        EXECUTE FUNCTION public.notify_push_on_db_event()
    ';
  END IF;
END;
$$;

-- ── Grant execute to postgres role (runs SECURITY DEFINER anyway) ─────────────
GRANT EXECUTE ON FUNCTION public.notify_push_on_db_event() TO postgres;
