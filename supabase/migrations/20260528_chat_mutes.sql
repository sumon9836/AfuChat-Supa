-- Per-conversation mute table.
-- Users can mute a specific chat for a set duration or forever.
-- muted_until = NULL means muted forever; a timestamptz value means muted until that moment.
-- Enforced server-side in the push-notification-trigger edge function:
--   if a recipient has an active row in chat_mutes for the chat_id, their push is suppressed.
-- Calls bypass quiet hours already — they are NOT affected by chat_mutes (separate trigger).

CREATE TABLE IF NOT EXISTS public.chat_mutes (
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id     uuid        NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  muted_until timestamptz,          -- NULL = muted forever
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, chat_id)
);

ALTER TABLE public.chat_mutes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chat_mutes' AND policyname = 'users_own_mutes'
  ) THEN
    CREATE POLICY "users_own_mutes" ON public.chat_mutes
      FOR ALL TO authenticated
      USING  (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
