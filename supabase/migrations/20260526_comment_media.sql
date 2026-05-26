-- Add voice note and image attachment support to post_replies.
-- voice_duration stores the length in whole seconds (≤ 60 for comment voice notes).
-- All three columns are optional so existing rows are unaffected.

ALTER TABLE public.post_replies
  ADD COLUMN IF NOT EXISTS voice_url      TEXT,
  ADD COLUMN IF NOT EXISTS voice_duration SMALLINT,
  ADD COLUMN IF NOT EXISTS image_url      TEXT;

-- Fast look-up so feeds can filter / display media-rich comments easily
CREATE INDEX IF NOT EXISTS post_replies_voice_idx ON public.post_replies (voice_url)
  WHERE voice_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS post_replies_image_idx ON public.post_replies (image_url)
  WHERE image_url IS NOT NULL;
