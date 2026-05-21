-- Add location_sharing_enabled flag to profiles.
-- Default TRUE so existing users continue appearing in Nearby Friends.
-- When a user sets this to FALSE the server also clears their stored
-- latitude/longitude so the nearby_users RPC stops returning them.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_sharing_enabled boolean NOT NULL DEFAULT true;

-- Index for fast server-side filtering (nearby_users RPC can use this)
CREATE INDEX IF NOT EXISTS profiles_location_sharing_idx
  ON public.profiles (location_sharing_enabled)
  WHERE location_sharing_enabled = true;

-- RLS: users may update only their own flag (same pattern as other boolean cols)
DROP POLICY IF EXISTS "users update own location sharing" ON public.profiles;
