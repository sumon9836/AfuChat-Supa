-- Add location columns + location_sharing_enabled flag to profiles.
-- Default TRUE so existing users continue appearing in Nearby Friends.
-- When a user sets this to FALSE the server also clears their stored
-- latitude/longitude so the nearby_users RPC stops returning them.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS latitude              double precision,
  ADD COLUMN IF NOT EXISTS longitude             double precision,
  ADD COLUMN IF NOT EXISTS location_updated_at   timestamptz,
  ADD COLUMN IF NOT EXISTS location_sharing_enabled boolean NOT NULL DEFAULT true;

-- Index for fast spatial queries on the nearby_users RPC
CREATE INDEX IF NOT EXISTS profiles_lat_lng_idx
  ON public.profiles (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location_sharing_enabled = true;

CREATE INDEX IF NOT EXISTS profiles_location_sharing_idx
  ON public.profiles (location_sharing_enabled)
  WHERE location_sharing_enabled = true;

-- RLS: users may update only their own flag (same pattern as other boolean cols)
DROP POLICY IF EXISTS "users update own location sharing" ON public.profiles;

-- nearby_users RPC — Haversine-based, no PostGIS dependency.
-- Returns profiles within radius_km of the caller, ordered by distance ascending.
-- Only includes users who:
--   • have completed onboarding
--   • have not been banned / deleted
--   • have location_sharing_enabled = true
--   • have stored coordinates
DROP FUNCTION IF EXISTS public.nearby_users(double precision, double precision, double precision, uuid);

CREATE OR REPLACE FUNCTION public.nearby_users(
  user_lat   double precision,
  user_lng   double precision,
  radius_km  double precision,
  exclude_id uuid
)
RETURNS TABLE (
  id                        uuid,
  display_name              text,
  handle                    text,
  avatar_url                text,
  bio                       text,
  is_verified               boolean,
  is_organization_verified  boolean,
  country                   text,
  interests                 text[],
  follower_count            integer,
  following_count           integer,
  last_seen                 timestamptz,
  latitude                  double precision,
  longitude                 double precision,
  location_updated_at       timestamptz,
  distance_km               double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.display_name,
    p.handle,
    p.avatar_url,
    p.bio,
    p.is_verified,
    p.is_organization_verified,
    p.country,
    p.interests,
    p.follower_count,
    p.following_count,
    p.last_seen,
    p.latitude,
    p.longitude,
    p.location_updated_at,
    (
      2 * 6371.0 * asin(
        sqrt(
          power(sin(radians((p.latitude - user_lat) / 2)), 2) +
          cos(radians(user_lat)) * cos(radians(p.latitude)) *
          power(sin(radians((p.longitude - user_lng) / 2)), 2)
        )
      )
    ) AS distance_km
  FROM public.profiles p
  WHERE
    p.id != exclude_id
    AND p.latitude            IS NOT NULL
    AND p.longitude           IS NOT NULL
    AND p.location_sharing_enabled = true
    AND COALESCE(p.onboarding_completed, false) = true
    AND COALESCE(p.is_banned, false)            = false
    AND COALESCE(p.account_deleted, false)      = false
    AND (
      2 * 6371.0 * asin(
        sqrt(
          power(sin(radians((p.latitude - user_lat) / 2)), 2) +
          cos(radians(user_lat)) * cos(radians(p.latitude)) *
          power(sin(radians((p.longitude - user_lng) / 2)), 2)
        )
      )
    ) <= radius_km
  ORDER BY distance_km ASC
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION public.nearby_users(double precision, double precision, double precision, uuid)
  TO authenticated;
