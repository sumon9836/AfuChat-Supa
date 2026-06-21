-- ─────────────────────────────────────────────────────────────────────────────
-- AfuChat OAuth 2.0 Provider — Database Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. ── oauth_apps ─────────────────────────────────────────────────────────────
-- Registered third-party applications that use "Login with AfuChat"
CREATE TABLE IF NOT EXISTS oauth_apps (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       text        UNIQUE NOT NULL,
  client_secret   text        NOT NULL,
  name            text        NOT NULL,
  description     text,
  logo_url        text,
  website_url     text,
  redirect_uris   text[]      NOT NULL DEFAULT '{}',
  scopes          text[]      NOT NULL DEFAULT '{openid,profile,email}',
  owner_id        uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oauth_apps_owner    ON oauth_apps(owner_id);
CREATE INDEX IF NOT EXISTS idx_oauth_apps_active   ON oauth_apps(client_id) WHERE is_active = true;

-- 2. ── oauth_auth_codes ───────────────────────────────────────────────────────
-- Short-lived single-use authorization codes
CREATE TABLE IF NOT EXISTS oauth_auth_codes (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  text        UNIQUE NOT NULL,
  client_id             text        NOT NULL,
  user_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redirect_uri          text        NOT NULL,
  scopes                text[]      NOT NULL DEFAULT '{}',
  code_challenge        text,
  code_challenge_method text,       -- 'S256' or 'plain'
  expires_at            timestamptz NOT NULL,
  used                  boolean     NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oauth_codes_code      ON oauth_auth_codes(code) WHERE used = false;
CREATE INDEX IF NOT EXISTS idx_oauth_codes_expires   ON oauth_auth_codes(expires_at);

-- 3. ── oauth_access_tokens ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS oauth_access_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token       text        UNIQUE NOT NULL,
  client_id   text        NOT NULL,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scopes      text[]      NOT NULL DEFAULT '{}',
  expires_at  timestamptz NOT NULL,
  revoked     boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oauth_at_token  ON oauth_access_tokens(token) WHERE revoked = false;
CREATE INDEX IF NOT EXISTS idx_oauth_at_user   ON oauth_access_tokens(user_id);

-- 4. ── oauth_refresh_tokens ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token             text        UNIQUE NOT NULL,
  access_token_id   uuid        REFERENCES oauth_access_tokens(id) ON DELETE CASCADE,
  client_id         text        NOT NULL,
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scopes            text[]      NOT NULL DEFAULT '{}',
  expires_at        timestamptz NOT NULL,
  revoked           boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oauth_rt_token  ON oauth_refresh_tokens(token) WHERE revoked = false;

-- 5. ── oauth_consents ─────────────────────────────────────────────────────────
-- Tracks which users have consented to which apps (so we don't ask twice)
CREATE TABLE IF NOT EXISTS oauth_consents (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id   text        NOT NULL,
  scopes      text[]      NOT NULL DEFAULT '{}',
  granted_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_consents_user ON oauth_consents(user_id, client_id);

-- 6. ── RLS policies ───────────────────────────────────────────────────────────
ALTER TABLE oauth_apps          ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_auth_codes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_consents      ENABLE ROW LEVEL SECURITY;

-- oauth_apps: owners can manage their own apps
DROP POLICY IF EXISTS "owner can read oauth apps"   ON oauth_apps;
CREATE POLICY "owner can read oauth apps"   ON oauth_apps FOR SELECT USING (owner_id = auth.uid());
DROP POLICY IF EXISTS "owner can insert oauth apps" ON oauth_apps;
CREATE POLICY "owner can insert oauth apps" ON oauth_apps FOR INSERT WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "owner can update oauth apps" ON oauth_apps;
CREATE POLICY "owner can update oauth apps" ON oauth_apps FOR UPDATE USING (owner_id = auth.uid());
DROP POLICY IF EXISTS "owner can delete oauth apps" ON oauth_apps;
CREATE POLICY "owner can delete oauth apps" ON oauth_apps FOR DELETE USING (owner_id = auth.uid());

-- Users can see their own consents, tokens (for settings/revoke page)
DROP POLICY IF EXISTS "user can see own consents"   ON oauth_consents;
CREATE POLICY "user can see own consents"   ON oauth_consents FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "user can delete own consents" ON oauth_consents;
CREATE POLICY "user can delete own consents" ON oauth_consents FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user can see own tokens" ON oauth_access_tokens;
CREATE POLICY "user can see own tokens" ON oauth_access_tokens FOR SELECT USING (user_id = auth.uid());

-- 7. ── Cleanup function ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM oauth_auth_codes    WHERE expires_at < now() OR used = true;
  DELETE FROM oauth_access_tokens WHERE expires_at < now() AND revoked = false;
  DELETE FROM oauth_refresh_tokens WHERE expires_at < now() AND revoked = false;
END;
$$;
