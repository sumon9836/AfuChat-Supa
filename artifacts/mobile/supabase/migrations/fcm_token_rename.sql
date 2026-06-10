-- Migration: rename expo_push_token → fcm_token
-- Also adds push_token_platform to track 'android' | 'ios'
--
-- Run this once in your Supabase SQL editor (Dashboard → SQL Editor → New query).

ALTER TABLE profiles
  RENAME COLUMN expo_push_token TO fcm_token;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_token_platform TEXT;

-- Optional: index for admin broadcast queries
CREATE INDEX IF NOT EXISTS idx_profiles_fcm_token
  ON profiles (fcm_token)
  WHERE fcm_token IS NOT NULL;
