-- ─────────────────────────────────────────────────────────────────────────────
-- Referral System v2 — full atomic rewards
-- Adds: acoin_reward + platinum_days columns, platinum_until on profiles,
--       complete_referral() RPC (idempotent, atomically rewards both parties),
--       referral_stats view for leaderboard.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Extend profiles with platinum_until ───────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'platinum_until'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN platinum_until TIMESTAMPTZ;
  END IF;
END $$;

-- ── 2. Extend referrals table ────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'referrals' AND column_name = 'acoin_reward'
  ) THEN
    ALTER TABLE public.referrals ADD COLUMN acoin_reward INTEGER NOT NULL DEFAULT 50;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'referrals' AND column_name = 'platinum_days'
  ) THEN
    ALTER TABLE public.referrals ADD COLUMN platinum_days INTEGER NOT NULL DEFAULT 7;
  END IF;
END $$;

-- Ensure UNIQUE constraint exists on referred_id (each user referred once only)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.referrals'::regclass AND contype = 'u'
      AND conname = 'referrals_referred_id_unique'
  ) THEN
    ALTER TABLE public.referrals
      ADD CONSTRAINT referrals_referred_id_unique UNIQUE (referred_id);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. complete_referral RPC ─────────────────────────────────────────────────
-- Called at the end of onboarding when a user signs up with a referral code.
-- Idempotent: second call for the same referred_id is a no-op.
-- Returns JSON: { success: bool, reason: text }
CREATE OR REPLACE FUNCTION public.complete_referral(
  p_referrer_handle TEXT,
  p_referred_id     UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id   UUID;
  v_acoin_reward  INT  := 50;
  v_nexa_reward   INT  := 2000;
  v_platinum_days INT  := 7;
  v_inserted      BOOL := FALSE;
BEGIN
  -- 1. Resolve referrer handle → id (case-insensitive)
  SELECT id INTO v_referrer_id
    FROM public.profiles
   WHERE LOWER(handle) = LOWER(TRIM(p_referrer_handle))
   LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'success', false, 'reason', 'referrer_not_found');
  END IF;

  -- 2. Cannot refer yourself
  IF v_referrer_id = p_referred_id THEN
    RETURN jsonb_build_object('ok', false, 'success', false, 'reason', 'self_referral');
  END IF;

  -- 3. Insert referral row (idempotent — skip if referred_id already exists)
  INSERT INTO public.referrals (referrer_id, referred_id, reward_given, acoin_reward, platinum_days)
  VALUES (v_referrer_id, p_referred_id, TRUE, v_acoin_reward, v_platinum_days)
  ON CONFLICT (referred_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF NOT v_inserted THEN
    RETURN jsonb_build_object('ok', false, 'success', false, 'reason', 'already_referred');
  END IF;

  -- 4. Credit referrer 50 ACoin (atomic UPDATE)
  UPDATE public.profiles
     SET acoin = COALESCE(acoin, 0) + v_acoin_reward
   WHERE id = v_referrer_id;

  -- 5. Award referrer 2000 Nexa XP (via xp column on profiles if it exists, else skip)
  --    Also log to xp_activity_log if that table exists
  UPDATE public.profiles
     SET xp = COALESCE(xp, 0) + v_nexa_reward
   WHERE id = v_referrer_id;

  BEGIN
    INSERT INTO public.xp_activity_log (user_id, activity_type, xp_amount, metadata)
    VALUES (v_referrer_id, 'referral_reward', v_nexa_reward,
            jsonb_build_object('referred_id', p_referred_id));
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- 6. Give referred user 7 days of Platinum (extend if already premium)
  UPDATE public.profiles
     SET platinum_until = GREATEST(
           COALESCE(platinum_until, NOW()),
           NOW()
         ) + (v_platinum_days || ' days')::INTERVAL
   WHERE id = p_referred_id;

  -- Return ok+success for backward compat with onboarding.tsx
  RETURN jsonb_build_object(
    'ok',           true,
    'success',      true,
    'reason',       'rewarded',
    'referrer_id',  v_referrer_id,
    'acoin_reward', v_acoin_reward,
    'nexa_reward',  v_nexa_reward,
    'platinum_days', v_platinum_days
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_referral(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_referral(TEXT, UUID) TO service_role;

-- ── 4. Keep handle_referral_reward as alias for backward compat ──────────────
CREATE OR REPLACE FUNCTION public.handle_referral_reward(
  p_referrer_handle TEXT,
  p_referred_id     UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.complete_referral(p_referrer_handle, p_referred_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_referral_reward(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_referral_reward(TEXT, UUID) TO service_role;

-- ── 5. Referral stats view (for leaderboard) ─────────────────────────────────
CREATE OR REPLACE VIEW public.referral_stats AS
SELECT
  r.referrer_id,
  p.handle,
  p.display_name,
  p.avatar_url,
  COUNT(*)                             AS total_referrals,
  SUM(r.acoin_reward)                  AS total_acoin_earned,
  SUM(r.platinum_days)                 AS total_platinum_days_given,
  MAX(r.created_at)                    AS last_referral_at
FROM public.referrals r
JOIN public.profiles p ON p.id = r.referrer_id
GROUP BY r.referrer_id, p.handle, p.display_name, p.avatar_url;

-- RLS on view: anyone can see leaderboard (read-only aggregated data)
GRANT SELECT ON public.referral_stats TO authenticated;

-- ── 6. RLS policies (ensure referred user can see own record) ─────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'referrals' AND policyname = 'referred_select_own'
  ) THEN
    CREATE POLICY "referred_select_own"
      ON public.referrals FOR SELECT
      USING (referred_id = auth.uid());
  END IF;
END $$;
