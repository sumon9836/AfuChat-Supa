-- ─────────────────────────────────────────────────────────────────────────────
-- Referral Milestone Claims
-- Tracks which users have explicitly claimed their milestone bonus Nexa.
-- Bonus Nexa is NOT awarded passively — users must tap "Claim" in AfuReferral.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.referral_milestone_claims (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_step INTEGER     NOT NULL,   -- matches REWARD_STEPS[].step (1–7)
  bonus_nexa     INTEGER     NOT NULL DEFAULT 0,
  claimed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One claim per milestone per user — prevents double-claiming
  CONSTRAINT referral_milestone_claims_unique UNIQUE (user_id, milestone_step)
);

-- Indexes
CREATE INDEX IF NOT EXISTS referral_milestone_claims_user_idx
  ON public.referral_milestone_claims(user_id);

-- RLS
ALTER TABLE public.referral_milestone_claims ENABLE ROW LEVEL SECURITY;

-- Users can only see their own claims
DROP POLICY IF EXISTS "milestone_claims_select_own" ON public.referral_milestone_claims;
CREATE POLICY "milestone_claims_select_own"
  ON public.referral_milestone_claims FOR SELECT
  USING (user_id = auth.uid());

-- Users can only insert their own claims
DROP POLICY IF EXISTS "milestone_claims_insert_own" ON public.referral_milestone_claims;
CREATE POLICY "milestone_claims_insert_own"
  ON public.referral_milestone_claims FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- No updates or deletes — claims are permanent
