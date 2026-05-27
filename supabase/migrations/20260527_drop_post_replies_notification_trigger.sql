-- ============================================================
-- FIX: column "post_id" of relation "notifications" does not exist (42703)
-- ============================================================
-- Root cause: a Postgres trigger on public.post_replies fires on every INSERT
-- and tries to write `post_id` into the notifications table, but that column
-- was never added.  The whole INSERT into post_replies is rolled back, making
-- every comment submission fail.
--
-- Run this entire script in:
--   Supabase Dashboard → SQL Editor → New Query → Run (F5)
--
-- QUICK ONE-LINER (if you only want the minimum fix):
--   ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS post_id uuid;
-- ============================================================

-- Step 1 ─ Add the missing column so the trigger stops failing immediately.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'notifications'
        AND column_name  = 'post_id'
    ) THEN
      ALTER TABLE public.notifications
        ADD COLUMN post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE;
      RAISE NOTICE 'Added post_id to notifications — trigger will now succeed.';
    ELSE
      RAISE NOTICE 'post_id already exists in notifications — no action needed.';
    END IF;
  ELSE
    RAISE NOTICE 'notifications table does not exist — skipping column add.';
  END IF;
END;
$$;

-- Step 2 ─ Drop every trigger on post_replies whose backing function references
--          the notifications table (covers any name the trigger was given).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT t.trigger_name
    FROM information_schema.triggers t
    JOIN pg_trigger  pt ON pt.tgname = t.trigger_name
    JOIN pg_proc     pp ON pp.oid    = pt.tgfoid
    WHERE t.event_object_schema = 'public'
      AND t.event_object_table  = 'post_replies'
      AND (
        lower(pp.prosrc)       LIKE '%notifications%'
        OR lower(t.trigger_name) LIKE '%notif%'
      )
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON public.post_replies',
      r.trigger_name
    );
    RAISE NOTICE 'Dropped trigger % on post_replies', r.trigger_name;
  END LOOP;
END;
$$;

-- Step 3 ─ Drop the trigger functions by the most common legacy names.
DROP FUNCTION IF EXISTS public.notify_post_reply()              CASCADE;
DROP FUNCTION IF EXISTS public.create_post_reply_notification() CASCADE;
DROP FUNCTION IF EXISTS public.on_post_reply_insert()           CASCADE;
DROP FUNCTION IF EXISTS public.trg_post_reply_notification()    CASCADE;
DROP FUNCTION IF EXISTS public.post_reply_notify()              CASCADE;

-- Step 4 ─ (Optional) Once the trigger is gone the notifications table is
--          no longer needed.  Migration 20260520 already drops it; this is
--          a safety net in case that migration was never applied.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) THEN
    DROP TABLE public.notifications CASCADE;
    RAISE NOTICE 'Dropped notifications table.';
  END IF;
END;
$$;
