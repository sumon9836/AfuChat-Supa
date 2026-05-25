-- ─────────────────────────────────────────────────────────────────────────────
-- Referral System Migration
-- Tables: referrals, xp_activity_log
-- Functions: handle_referral_reward, reward_activity_xp, award_xp
-- ─────────────────────────────────────────────────────────────────────────────

-- ── xp_activity_log ──────────────────────────────────────────────────────────
-- Tracks every XP event per user; used for cooldown enforcement.

CREATE TABLE IF NOT EXISTS public.xp_activity_log (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type text        NOT NULL,
  xp_amount     int         NOT NULL DEFAULT 0,
  metadata      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS xp_activity_log_user_type_idx
  ON public.xp_activity_log (user_id, activity_type, created_at DESC);

ALTER TABLE public.xp_activity_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'xp_activity_log' AND policyname = 'Users can view own xp log'
  ) THEN
    CREATE POLICY "Users can view own xp log"
      ON public.xp_activity_log FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'xp_activity_log' AND policyname = 'System inserts xp log'
  ) THEN
    CREATE POLICY "System inserts xp log"
      ON public.xp_activity_log FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- ── referrals ─────────────────────────────────────────────────────────────────
-- One row per successful referral. referred_id is UNIQUE — each user can only
-- be referred once.

CREATE TABLE IF NOT EXISTS public.referrals (
  id           uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_given boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referrals_referred_id_key UNIQUE (referred_id)
);

CREATE INDEX IF NOT EXISTS referrals_referrer_id_idx
  ON public.referrals (referrer_id, created_at DESC);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'referrals' AND policyname = 'Referrer can view own referrals'
  ) THEN
    CREATE POLICY "Referrer can view own referrals"
      ON public.referrals FOR SELECT
      USING (auth.uid() = referrer_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'referrals' AND policyname = 'Referred user can view own record'
  ) THEN
    CREATE POLICY "Referred user can view own record"
      ON public.referrals FOR SELECT
      USING (auth.uid() = referred_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'referrals' AND policyname = 'Admins can view all referrals'
  ) THEN
    CREATE POLICY "Admins can view all referrals"
      ON public.referrals FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND is_admin = true
        )
      );
  END IF;
END $$;

-- ── handle_referral_reward ────────────────────────────────────────────────────
-- Called during onboarding by the new user (invitee).
-- Finds the referrer by handle, creates the referral record, and awards
-- 2 000 XP to the referrer — all atomically.
--
-- Returns jsonb:
--   { ok: true,  referrer_id: uuid, xp_awarded: int }
--   { ok: false, reason: text }

CREATE OR REPLACE FUNCTION public.handle_referral_reward(
  p_referrer_handle text,
  p_referred_id     uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id  uuid;
  v_xp_reward    int := 2000;
BEGIN
  -- 1. Find referrer by handle (case-insensitive)
  SELECT id INTO v_referrer_id
  FROM public.profiles
  WHERE lower(handle) = lower(trim(p_referrer_handle))
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'referrer_not_found');
  END IF;

  -- 2. Prevent self-referral
  IF v_referrer_id = p_referred_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'self_referral');
  END IF;

  -- 3. Each user may only be referred once
  IF EXISTS (
    SELECT 1 FROM public.referrals WHERE referred_id = p_referred_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_referred');
  END IF;

  -- 4. Record the referral
  INSERT INTO public.referrals (referrer_id, referred_id, reward_given)
  VALUES (v_referrer_id, p_referred_id, true);

  -- 5. Award XP to the referrer (Nexa is stored in profiles.xp)
  UPDATE public.profiles
  SET xp = COALESCE(xp, 0) + v_xp_reward
  WHERE id = v_referrer_id;

  -- 6. Log the XP event for the referrer
  INSERT INTO public.xp_activity_log (user_id, activity_type, xp_amount, metadata)
  VALUES (
    v_referrer_id,
    'referral',
    v_xp_reward,
    jsonb_build_object('referred_id', p_referred_id)
  );

  RETURN jsonb_build_object(
    'ok',         true,
    'referrer_id', v_referrer_id,
    'xp_awarded',  v_xp_reward
  );
END;
$$;

REVOKE ALL ON FUNCTION public.handle_referral_reward(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_referral_reward(text, uuid) TO authenticated;

-- ── reward_activity_xp ────────────────────────────────────────────────────────
-- General-purpose XP reward with optional cooldown.
-- Called by rewardXp() in lib/rewardXp.ts for actions like daily_login,
-- post_created, story_created, etc.
--
-- Returns jsonb:
--   { success: true,  xp_earned: int, new_balance: int }
--   { success: false, reason: text }

CREATE OR REPLACE FUNCTION public.reward_activity_xp(
  p_activity_type    text,
  p_xp_amount        int,
  p_cooldown_seconds int     DEFAULT 0,
  p_metadata         jsonb   DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_new_balance int;
  v_last_at    timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  -- Cooldown check
  IF p_cooldown_seconds > 0 THEN
    SELECT MAX(created_at) INTO v_last_at
    FROM public.xp_activity_log
    WHERE user_id = v_user_id
      AND activity_type = p_activity_type;

    IF v_last_at IS NOT NULL
       AND EXTRACT(EPOCH FROM (now() - v_last_at)) < p_cooldown_seconds
    THEN
      RETURN jsonb_build_object('success', false, 'reason', 'cooldown_active');
    END IF;
  END IF;

  -- Award XP
  UPDATE public.profiles
  SET xp = COALESCE(xp, 0) + p_xp_amount
  WHERE id = v_user_id
  RETURNING xp INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'profile_not_found');
  END IF;

  -- Log the event
  INSERT INTO public.xp_activity_log (user_id, activity_type, xp_amount, metadata)
  VALUES (v_user_id, p_activity_type, p_xp_amount, p_metadata);

  RETURN jsonb_build_object(
    'success',     true,
    'xp_earned',   p_xp_amount,
    'new_balance', v_new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reward_activity_xp(text, int, int, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reward_activity_xp(text, int, int, jsonb) TO authenticated;

-- ── award_xp ──────────────────────────────────────────────────────────────────
-- Direct XP award to any user by ID — no cooldown.
-- Used for peer-to-peer Nexa transfers and admin adjustments.
-- Callable by authenticated users (the caller must do their own auth checks).

CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id    uuid,
  p_action_type text,
  p_xp_amount  int,
  p_metadata   jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance int;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  UPDATE public.profiles
  SET xp = COALESCE(xp, 0) + p_xp_amount
  WHERE id = p_user_id
  RETURNING xp INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'user_not_found');
  END IF;

  INSERT INTO public.xp_activity_log (user_id, activity_type, xp_amount, metadata)
  VALUES (p_user_id, p_action_type, p_xp_amount, p_metadata);

  RETURN jsonb_build_object(
    'success',     true,
    'new_balance', v_new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.award_xp(uuid, text, int, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_xp(uuid, text, int, jsonb) TO authenticated;
