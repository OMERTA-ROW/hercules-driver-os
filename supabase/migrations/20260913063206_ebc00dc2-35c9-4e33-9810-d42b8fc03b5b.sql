CREATE TABLE public.ai_credit_wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_balance integer NOT NULL DEFAULT 0 CHECK (monthly_balance >= 0),
  monthly_expires_at timestamptz,
  purchased_balance integer NOT NULL DEFAULT 0 CHECK (purchased_balance >= 0),
  ai_plan_id text,
  ai_plan_renews_at timestamptz,
  quality_pref text NOT NULL DEFAULT 'balanced' CHECK (quality_pref IN ('eco','balanced')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('grant_monthly','grant_pack','debit','refund','expire','adjust')),
  monthly_delta integer NOT NULL DEFAULT 0,
  purchased_delta integer NOT NULL DEFAULT 0,
  reason text NOT NULL,
  ref text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_credit_ledger_user_idx ON public.ai_credit_ledger (user_id, created_at DESC);

CREATE TABLE public.ai_credit_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  amount integer NOT NULL CHECK (amount >= 0),
  monthly_amount integer NOT NULL DEFAULT 0,
  purchased_amount integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','committed','refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);
CREATE INDEX ai_credit_reservations_user_idx ON public.ai_credit_reservations (user_id, created_at DESC);

CREATE TABLE public.ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  model text,
  credits_charged integer NOT NULL DEFAULT 0,
  credits_saved integer NOT NULL DEFAULT 0,
  provider_cost_usd numeric(10,5),
  cost_basis text NOT NULL DEFAULT 'estimated' CHECK (cost_basis IN ('actual','estimated','none')),
  served_from_cache boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_events_user_idx ON public.ai_usage_events (user_id, created_at DESC);

CREATE TABLE public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  user_id uuid,
  payload jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (provider, event_id)
);

GRANT SELECT ON public.ai_credit_wallets TO authenticated;
GRANT SELECT ON public.ai_credit_ledger TO authenticated;
GRANT SELECT ON public.ai_credit_reservations TO authenticated;
GRANT SELECT ON public.ai_usage_events TO authenticated;
GRANT ALL ON public.ai_credit_wallets TO service_role;
GRANT ALL ON public.ai_credit_ledger TO service_role;
GRANT ALL ON public.ai_credit_reservations TO service_role;
GRANT ALL ON public.ai_usage_events TO service_role;
GRANT ALL ON public.billing_events TO service_role;

ALTER TABLE public.ai_credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own wallet readable" ON public.ai_credit_wallets FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own ledger readable" ON public.ai_credit_ledger FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own reservations readable" ON public.ai_credit_reservations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own usage readable" ON public.ai_usage_events FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER ai_credit_wallets_updated_at BEFORE UPDATE ON public.ai_credit_wallets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Expire a stale monthly allowance and return the locked wallet row.
CREATE OR REPLACE FUNCTION public.ai_credits_touch(_user uuid)
RETURNS public.ai_credit_wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE w public.ai_credit_wallets;
BEGIN
  INSERT INTO public.ai_credit_wallets (user_id) VALUES (_user)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO w FROM public.ai_credit_wallets WHERE user_id = _user FOR UPDATE;

  IF w.monthly_balance > 0 AND w.monthly_expires_at IS NOT NULL AND w.monthly_expires_at <= now() THEN
    INSERT INTO public.ai_credit_ledger (user_id, kind, monthly_delta, reason)
    VALUES (_user, 'expire', -w.monthly_balance, 'Monthly allowance expired at end of billing period');
    UPDATE public.ai_credit_wallets
      SET monthly_balance = 0, monthly_expires_at = NULL
      WHERE user_id = _user
      RETURNING * INTO w;
  END IF;

  RETURN w;
END;
$$;

-- Place an atomic hold. Expiring monthly credits are consumed first.
CREATE OR REPLACE FUNCTION public.ai_credits_reserve(_action text, _amount integer)
RETURNS public.ai_credit_reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  w public.ai_credit_wallets;
  from_monthly integer;
  from_purchased integer;
  r public.ai_credit_reservations;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount IS NULL OR _amount < 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;

  w := public.ai_credits_touch(uid);

  IF w.monthly_balance + w.purchased_balance < _amount THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  from_monthly := LEAST(w.monthly_balance, _amount);
  from_purchased := _amount - from_monthly;

  UPDATE public.ai_credit_wallets
    SET monthly_balance = monthly_balance - from_monthly,
        purchased_balance = purchased_balance - from_purchased
    WHERE user_id = uid;

  INSERT INTO public.ai_credit_reservations (user_id, action, amount, monthly_amount, purchased_amount)
  VALUES (uid, _action, _amount, from_monthly, from_purchased)
  RETURNING * INTO r;

  RETURN r;
END;
$$;

-- Settle a hold: charge what was used, return the rest, record the usage row.
CREATE OR REPLACE FUNCTION public.ai_credits_commit(
  _reservation uuid,
  _charge integer,
  _model text DEFAULT NULL,
  _provider_cost numeric DEFAULT NULL,
  _cost_basis text DEFAULT 'estimated',
  _cached boolean DEFAULT false,
  _saved integer DEFAULT 0
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  r public.ai_credit_reservations;
  refund integer;
  charge_monthly integer;
  charge_purchased integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO r FROM public.ai_credit_reservations
    WHERE id = _reservation AND user_id = uid FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'reservation_not_found'; END IF;
  IF r.status <> 'reserved' THEN RETURN 0; END IF;

  _charge := GREATEST(0, LEAST(COALESCE(_charge, r.amount), r.amount));
  refund := r.amount - _charge;
  charge_monthly := LEAST(r.monthly_amount, _charge);
  charge_purchased := _charge - charge_monthly;

  IF refund > 0 THEN
    UPDATE public.ai_credit_wallets
      SET monthly_balance = monthly_balance + (r.monthly_amount - charge_monthly),
          purchased_balance = purchased_balance + (r.purchased_amount - charge_purchased)
      WHERE user_id = uid;
  END IF;

  UPDATE public.ai_credit_reservations
    SET status = 'committed', settled_at = now() WHERE id = r.id;

  INSERT INTO public.ai_credit_ledger (user_id, kind, monthly_delta, purchased_delta, reason)
  VALUES (uid, 'debit', -charge_monthly, -charge_purchased, r.action);

  INSERT INTO public.ai_usage_events
    (user_id, action, model, credits_charged, credits_saved, provider_cost_usd, cost_basis, served_from_cache)
  VALUES (uid, r.action, _model, _charge, GREATEST(0, COALESCE(_saved, 0)),
          _provider_cost, COALESCE(_cost_basis, 'estimated'), COALESCE(_cached, false));

  RETURN _charge;
END;
$$;

-- Give a hold back in full (provider failed, request cancelled, refund).
CREATE OR REPLACE FUNCTION public.ai_credits_refund(_reservation uuid, _reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  r public.ai_credit_reservations;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO r FROM public.ai_credit_reservations
    WHERE id = _reservation AND user_id = uid FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'reservation_not_found'; END IF;
  IF r.status <> 'reserved' THEN RETURN false; END IF;

  UPDATE public.ai_credit_wallets
    SET monthly_balance = monthly_balance + r.monthly_amount,
        purchased_balance = purchased_balance + r.purchased_amount
    WHERE user_id = uid;

  UPDATE public.ai_credit_reservations
    SET status = 'refunded', settled_at = now() WHERE id = r.id;

  INSERT INTO public.ai_credit_ledger (user_id, kind, monthly_delta, purchased_delta, reason)
  VALUES (uid, 'refund', r.monthly_amount, r.purchased_amount, COALESCE(_reason, 'refund'));

  RETURN true;
END;
$$;

-- Server-only grant, keyed on a unique payment reference so replayed or
-- out-of-order payment messages can only ever grant once.
CREATE OR REPLACE FUNCTION public.ai_credits_grant(
  _user uuid,
  _bucket text,
  _amount integer,
  _ref text,
  _reason text,
  _expires timestamptz DEFAULT NULL,
  _plan_id text DEFAULT NULL,
  _renews_at timestamptz DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE ok boolean;
BEGIN
  IF _amount IS NULL OR _amount < 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  IF _bucket NOT IN ('monthly','purchased') THEN RAISE EXCEPTION 'invalid bucket'; END IF;

  PERFORM public.ai_credits_touch(_user);

  INSERT INTO public.ai_credit_ledger (user_id, kind, monthly_delta, purchased_delta, reason, ref)
  VALUES (_user,
          CASE WHEN _bucket = 'monthly' THEN 'grant_monthly' ELSE 'grant_pack' END,
          CASE WHEN _bucket = 'monthly' THEN _amount ELSE 0 END,
          CASE WHEN _bucket = 'purchased' THEN _amount ELSE 0 END,
          COALESCE(_reason, 'credit grant'), _ref)
  ON CONFLICT (ref) DO NOTHING;

  ok := FOUND;
  IF NOT ok THEN RETURN false; END IF;

  IF _bucket = 'monthly' THEN
    UPDATE public.ai_credit_wallets
      SET monthly_balance = _amount,
          monthly_expires_at = COALESCE(_expires, now() + interval '31 days'),
          ai_plan_id = COALESCE(_plan_id, ai_plan_id),
          ai_plan_renews_at = COALESCE(_renews_at, _expires, ai_plan_renews_at)
      WHERE user_id = _user;
  ELSE
    UPDATE public.ai_credit_wallets
      SET purchased_balance = purchased_balance + _amount
      WHERE user_id = _user;
  END IF;

  RETURN true;
END;
$$;

-- Server-only clawback for a refunded or disputed payment.
CREATE OR REPLACE FUNCTION public.ai_credits_revoke(
  _user uuid,
  _bucket text,
  _amount integer,
  _ref text,
  _reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.ai_credit_wallets;
  take_monthly integer := 0;
  take_purchased integer := 0;
BEGIN
  IF _amount IS NULL OR _amount < 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;

  w := public.ai_credits_touch(_user);

  INSERT INTO public.ai_credit_ledger (user_id, kind, monthly_delta, purchased_delta, reason, ref)
  VALUES (_user, 'adjust', 0, 0, COALESCE(_reason, 'payment reversed'), _ref)
  ON CONFLICT (ref) DO NOTHING;
  IF NOT FOUND THEN RETURN false; END IF;

  IF _bucket = 'monthly' THEN
    take_monthly := LEAST(w.monthly_balance, _amount);
  ELSE
    take_purchased := LEAST(w.purchased_balance, _amount);
  END IF;

  UPDATE public.ai_credit_wallets
    SET monthly_balance = monthly_balance - take_monthly,
        purchased_balance = purchased_balance - take_purchased,
        ai_plan_id = CASE WHEN _bucket = 'monthly' THEN NULL ELSE ai_plan_id END
    WHERE user_id = _user;

  UPDATE public.ai_credit_ledger
    SET monthly_delta = -take_monthly, purchased_delta = -take_purchased
    WHERE ref = _ref;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_set_quality_pref(_pref text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _pref NOT IN ('eco','balanced') THEN RAISE EXCEPTION 'invalid preference'; END IF;
  PERFORM public.ai_credits_touch(uid);
  UPDATE public.ai_credit_wallets SET quality_pref = _pref WHERE user_id = uid;
  RETURN _pref;
END;
$$;

REVOKE ALL ON FUNCTION public.ai_credits_touch(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_credits_grant(uuid, text, integer, text, text, timestamptz, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_credits_revoke(uuid, text, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_credits_touch(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_credits_grant(uuid, text, integer, text, text, timestamptz, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_credits_revoke(uuid, text, integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_credits_reserve(text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_credits_commit(uuid, integer, text, numeric, text, boolean, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_credits_refund(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_set_quality_pref(text) TO authenticated, service_role;