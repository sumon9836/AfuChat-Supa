-- ─────────────────────────────────────────────────────────────────────────────
-- AfuChat Referral Enforcement Migration
-- Run this in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. ── Ensure required columns exist ─────────────────────────────────────────
-- profiles: platinum_until tracks when a user's Platinum tier expires
ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS platinum_until timestamptz;

-- referrals: reward tracking columns
ALTER TABLE IF EXISTS referrals
  ADD COLUMN IF NOT EXISTS reward_given     boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS acoin_reward     integer      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platinum_days    integer      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_at     timestamptz;

-- Index for fast referrer lookups
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);

-- 2. ── referral_stats view (used by leaderboard) ──────────────────────────────
CREATE OR REPLACE VIEW referral_stats AS
  SELECT
    r.referrer_id,
    p.handle,
    p.display_name,
    p.avatar_url,
    COUNT(r.id)                                          AS total_referrals,
    COALESCE(SUM(r.platinum_days), 0)                    AS total_platinum_days_given,
    MAX(r.created_at)                                    AS last_referral_at
  FROM referrals r
  JOIN profiles p ON p.id = r.referrer_id
  WHERE r.reward_given = true
  GROUP BY r.referrer_id, p.handle, p.display_name, p.avatar_url;

-- RLS: public read-only
GRANT SELECT ON referral_stats TO anon, authenticated;

-- 3. ── referral_milestone_claims table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_milestone_claims (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_step  integer      NOT NULL,
  bonus_nexa      integer      NOT NULL DEFAULT 0,
  claimed_at      timestamptz  NOT NULL DEFAULT now(),
  UNIQUE(user_id, milestone_step)
);

ALTER TABLE referral_milestone_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own milestone claims" ON referral_milestone_claims;
CREATE POLICY "Users can read own milestone claims"
  ON referral_milestone_claims FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own milestone claims" ON referral_milestone_claims;
CREATE POLICY "Users can insert own milestone claims"
  ON referral_milestone_claims FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. ── handle_referral_reward RPC ─────────────────────────────────────────────
-- Called during onboarding when a new user completes signup via referral link.
-- Awards: referrer → 2 000 Nexa (XP) + 50 ACoins; referred → 7-day Platinum.
CREATE OR REPLACE FUNCTION handle_referral_reward(
  p_referrer_handle  text,
  p_referred_id      uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id       uuid;
  v_referrer_handle   text := lower(trim(p_referrer_handle));
  v_referred_handle   text;
  v_existing_referral uuid;
  v_referral_id       uuid;
  v_platinum_until    timestamptz;
BEGIN
  -- Sanity: referred user must exist
  IF p_referred_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'referred_id_null');
  END IF;

  -- Get referred user's handle for self-referral check
  SELECT handle INTO v_referred_handle FROM profiles WHERE id = p_referred_id;

  -- Self-referral guard
  IF lower(trim(v_referred_handle)) = v_referrer_handle THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'self_referral');
  END IF;

  -- Check already referred
  SELECT id INTO v_existing_referral FROM referrals WHERE referred_id = p_referred_id LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_referred');
  END IF;

  -- Resolve referrer
  SELECT id INTO v_referrer_id FROM profiles WHERE handle = v_referrer_handle;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'referrer_not_found');
  END IF;

  -- Create referral record
  INSERT INTO referrals (referrer_id, referred_id, reward_given, acoin_reward, platinum_days, completed_at)
  VALUES (v_referrer_id, p_referred_id, true, 50, 7, now())
  RETURNING id INTO v_referral_id;

  -- ── Reward the referrer ──────────────────────────────────────────────────
  -- 2 000 Nexa (XP)
  UPDATE profiles
     SET xp = COALESCE(xp, 0) + 2000
   WHERE id = v_referrer_id;

  -- 50 ACoins (atomic, uses deduct/credit pattern on acoin column)
  UPDATE profiles
     SET acoin = COALESCE(acoin, 0) + 50
   WHERE id = v_referrer_id;

  -- ── Reward the referred user ─────────────────────────────────────────────
  -- 7 days of Platinum
  v_platinum_until := now() + interval '7 days';
  UPDATE profiles
     SET platinum_until = GREATEST(COALESCE(platinum_until, now()), v_platinum_until)
   WHERE id = p_referred_id;

  RETURN jsonb_build_object(
    'ok',          true,
    'referrer_id', v_referrer_id,
    'referral_id', v_referral_id
  );
END;
$$;

-- Backward-compat alias
CREATE OR REPLACE FUNCTION complete_referral(
  p_referrer_handle  text,
  p_referred_id      uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT handle_referral_reward(p_referrer_handle, p_referred_id);
$$;

-- 5. ── claim_referral_code RPC ────────────────────────────────────────────────
-- Called from the AfuReferralApp dashboard when a user manually enters a code
-- AFTER completing onboarding (they missed the referral prompt during signup).
CREATE OR REPLACE FUNCTION claim_referral_code(
  p_referrer_handle  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referred_id uuid := auth.uid();
BEGIN
  IF v_referred_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  -- Delegate to handle_referral_reward which has all the guards
  RETURN handle_referral_reward(p_referrer_handle, v_referred_id);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION handle_referral_reward(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_referral(text, uuid)       TO authenticated;
GRANT EXECUTE ON FUNCTION claim_referral_code(text)           TO authenticated;

-- 6. ── RLS on referrals table ─────────────────────────────────────────────────
ALTER TABLE IF EXISTS referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Referrer can read their sent referrals" ON referrals;
CREATE POLICY "Referrer can read their sent referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "Referred user can read their referral" ON referrals;
CREATE POLICY "Referred user can read their referral"
  ON referrals FOR SELECT
  USING (auth.uid() = referred_id);
