-- Money Requests table
-- Lets users request ACoin or Nexa XP from other users via AfuId QR scan
-- Already applied to production via Supabase Management API on 2026-06-10

CREATE TABLE IF NOT EXISTS public.money_requests (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency      text        NOT NULL DEFAULT 'acoin' CHECK (currency IN ('acoin', 'nexa')),
  amount        integer     NOT NULL CHECK (amount > 0),
  note          text,
  status        text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'denied', 'expired', 'cancelled')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  responded_at  timestamptz,
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '48 hours')
);

CREATE INDEX IF NOT EXISTS money_requests_target_idx   ON public.money_requests (target_id,   status, created_at DESC);
CREATE INDEX IF NOT EXISTS money_requests_requester_idx ON public.money_requests (requester_id, created_at DESC);

ALTER TABLE public.money_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "requester sees own"   ON public.money_requests FOR SELECT USING (requester_id = auth.uid());
CREATE POLICY "target sees own"      ON public.money_requests FOR SELECT USING (target_id    = auth.uid());
CREATE POLICY "requester inserts"    ON public.money_requests FOR INSERT WITH CHECK (requester_id = auth.uid());
CREATE POLICY "target updates status" ON public.money_requests FOR UPDATE USING (target_id   = auth.uid());
CREATE POLICY "requester cancels"    ON public.money_requests FOR UPDATE USING (requester_id = auth.uid() AND status = 'pending');
