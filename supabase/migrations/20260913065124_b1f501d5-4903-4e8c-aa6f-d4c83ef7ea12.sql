-- 1. Period snapshot + idempotency on reservations
ALTER TABLE public.ai_credit_reservations
  ADD COLUMN IF NOT EXISTS period_expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS idem_key text;

CREATE UNIQUE INDEX IF NOT EXISTS ai_credit_reservations_idem_key_uq
  ON public.ai_credit_reservations (idem_key) WHERE idem_key IS NOT NULL;

-- 2. Drop the client-callable signatures
DROP FUNCTION IF EXISTS public.ai_credits_reserve(text, integer);
DROP FUNCTION IF EXISTS public.ai_credits_commit(uuid, integer, text, numeric, text, boolean, integer);
DROP FUNCTION IF EXISTS public.ai_credits_refund(uuid, text);

-- 3. Server-owned metering: explicit _user, never auth.uid()
CREATE OR REPLACE FUNCTION public.ai_credits_reserve(
  _user uuid,
  _action text,
  _amount integer,
  _idem text DEFAULT NULL
) RETURNS public.ai_credit_reservations
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  w public.ai_credit_wallets;
  from_monthly integer;
  from_purchased integer;
  r public.ai_credit_reservations;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'user_required'; END IF;
  IF _amount IS NULL OR _amount < 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;

  -- locks the wallet row: serialises every hold for this account
  w := public.ai_credits_touch(_user);

  IF _idem IS NOT NULL THEN
    SELECT * INTO r FROM public.ai_credit_reservations
      WHERE idem_key = _idem AND user_id = _user;
    IF r.id IS NOT NULL THEN RETURN r; END IF;
  END IF;

  IF w.monthly_balance + w.purchased_balance < _amount THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  from_monthly := LEAST(w.monthly_balance, _amount);
  from_purchased := _amount - from_monthly;

  UPDATE public.ai_credit_wallets
    SET monthly_balance = monthly_balance - from_monthly,
        purchased_balance = purchased_balance - from_purchased
    WHERE user_id = _user;

  INSERT INTO public.ai_credit_reservations
    (user_id, action, amount, monthly_amount, purchased_amount, period_expires_at, idem_key)
  VALUES (_user, _action, _amount, from_monthly, from_purchased, w.monthly_expires_at, _idem)
  RETURNING * INTO r;

  RETURN r;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ai_credits_commit(
  _user uuid,
  _reservation uuid,
  _charge integer,
  _model text DEFAULT NULL,
  _provider_cost numeric DEFAULT NULL,
  _cost_basis text DEFAULT 'estimated',
  _cached boolean DEFAULT false,
  _saved integer DEFAULT 0
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  r public.ai_credit_reservations;
  w public.ai_credit_wallets;
  refund_monthly integer;
  refund_purchased integer;
  charge_monthly integer;
  charge_purchased integer;
  lapsed integer := 0;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'user_required'; END IF;

  SELECT * INTO w FROM public.ai_credit_wallets WHERE user_id = _user FOR UPDATE;

  SELECT * INTO r FROM public.ai_credit_reservations
    WHERE id = _reservation AND user_id = _user FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'reservation_not_found'; END IF;
  IF r.status <> 'reserved' THEN RETURN 0; END IF;

  _charge := GREATEST(0, LEAST(COALESCE(_charge, r.amount), r.amount));
  charge_monthly := LEAST(r.monthly_amount, _charge);
  charge_purchased := _charge - charge_monthly;
  refund_monthly := r.monthly_amount - charge_monthly;
  refund_purchased := r.purchased_amount - charge_purchased;

  -- Monthly credits only return to the SAME paid period they were held in.
  IF refund_monthly > 0 AND w.monthly_expires_at IS DISTINCT FROM r.period_expires_at THEN
    lapsed := refund_monthly;
    refund_monthly := 0;
  END IF;

  IF refund_monthly > 0 OR refund_purchased > 0 THEN
    UPDATE public.ai_credit_wallets
      SET monthly_balance = monthly_balance + refund_monthly,
          purchased_balance = purchased_balance + refund_purchased
      WHERE user_id = _user;
  END IF;

  IF lapsed > 0 THEN
    INSERT INTO public.ai_credit_ledger (user_id, kind, monthly_delta, purchased_delta, reason)
    VALUES (_user, 'expire', 0, 0,
            'Unused hold belonged to a closed billing period — not restored');
  END IF;

  UPDATE public.ai_credit_reservations
    SET status = 'committed', settled_at = now() WHERE id = r.id;

  INSERT INTO public.ai_credit_ledger (user_id, kind, monthly_delta, purchased_delta, reason)
  VALUES (_user, 'debit', -charge_monthly, -charge_purchased, r.action);

  INSERT INTO public.ai_usage_events
    (user_id, action, model, credits_charged, credits_saved, provider_cost_usd, cost_basis, served_from_cache)
  VALUES (_user, r.action, _model, _charge, GREATEST(0, COALESCE(_saved, 0)),
          _provider_cost, COALESCE(_cost_basis, 'estimated'), COALESCE(_cached, false));

  RETURN _charge;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ai_credits_refund(
  _user uuid,
  _reservation uuid,
  _reason text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  r public.ai_credit_reservations;
  w public.ai_credit_wallets;
  back_monthly integer;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'user_required'; END IF;

  SELECT * INTO w FROM public.ai_credit_wallets WHERE user_id = _user FOR UPDATE;

  SELECT * INTO r FROM public.ai_credit_reservations
    WHERE id = _reservation AND user_id = _user FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'reservation_not_found'; END IF;
  IF r.status <> 'reserved' THEN RETURN false; END IF;

  back_monthly := r.monthly_amount;
  IF back_monthly > 0 AND w.monthly_expires_at IS DISTINCT FROM r.period_expires_at THEN
    back_monthly := 0;
  END IF;

  UPDATE public.ai_credit_wallets
    SET monthly_balance = monthly_balance + back_monthly,
        purchased_balance = purchased_balance + r.purchased_amount
    WHERE user_id = _user;

  UPDATE public.ai_credit_reservations
    SET status = 'refunded', settled_at = now() WHERE id = r.id;

  INSERT INTO public.ai_credit_ledger (user_id, kind, monthly_delta, purchased_delta, reason)
  VALUES (_user, 'refund', back_monthly, r.purchased_amount, COALESCE(_reason, 'refund'));

  RETURN true;
END;
$function$;

-- 4. A late older invoice must never reset a newer period
CREATE OR REPLACE FUNCTION public.ai_credits_grant(
  _user uuid, _bucket text, _amount integer, _ref text, _reason text,
  _expires timestamp with time zone DEFAULT NULL,
  _plan_id text DEFAULT NULL,
  _renews_at timestamp with time zone DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  w public.ai_credit_wallets;
  new_expires timestamptz;
BEGIN
  IF _amount IS NULL OR _amount < 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  IF _bucket NOT IN ('monthly','purchased') THEN RAISE EXCEPTION 'invalid bucket'; END IF;

  w := public.ai_credits_touch(_user);

  INSERT INTO public.ai_credit_ledger (user_id, kind, monthly_delta, purchased_delta, reason, ref)
  VALUES (_user,
          CASE WHEN _bucket = 'monthly' THEN 'grant_monthly' ELSE 'grant_pack' END,
          CASE WHEN _bucket = 'monthly' THEN _amount ELSE 0 END,
          CASE WHEN _bucket = 'purchased' THEN _amount ELSE 0 END,
          COALESCE(_reason, 'credit grant'), _ref)
  ON CONFLICT (ref) DO NOTHING;

  IF NOT FOUND THEN RETURN false; END IF;

  IF _bucket = 'monthly' THEN
    new_expires := COALESCE(_expires, now() + interval '31 days');
    -- Out-of-order/delayed invoice for an older period: record it, change nothing.
    IF w.monthly_expires_at IS NOT NULL AND new_expires <= w.monthly_expires_at THEN
      UPDATE public.ai_credit_ledger
        SET monthly_delta = 0,
            reason = COALESCE(_reason, 'credit grant') || ' (superseded by a newer billing period)'
        WHERE ref = _ref;
      RETURN true;
    END IF;
    UPDATE public.ai_credit_wallets
      SET monthly_balance = _amount,
          monthly_expires_at = new_expires,
          ai_plan_id = COALESCE(_plan_id, ai_plan_id),
          ai_plan_renews_at = COALESCE(_renews_at, new_expires, ai_plan_renews_at)
      WHERE user_id = _user;
  ELSE
    UPDATE public.ai_credit_wallets
      SET purchased_balance = purchased_balance + _amount
      WHERE user_id = _user;
  END IF;

  RETURN true;
END;
$function$;

-- 5. Metering is service-role only. No anon/authenticated execution.
REVOKE ALL ON FUNCTION public.ai_credits_reserve(uuid, text, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_credits_commit(uuid, uuid, integer, text, numeric, text, boolean, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_credits_refund(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_credits_grant(uuid, text, integer, text, text, timestamptz, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_credits_touch(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_credits_revoke(uuid, text, integer, text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.ai_credits_reserve(uuid, text, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_credits_commit(uuid, uuid, integer, text, numeric, text, boolean, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_credits_refund(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_credits_grant(uuid, text, integer, text, text, timestamptz, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_credits_touch(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_credits_revoke(uuid, text, integer, text, text) TO service_role;

-- Safe: the account's own voice-quality preference (derives the user internally)
REVOKE ALL ON FUNCTION public.ai_set_quality_pref(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_set_quality_pref(text) TO authenticated, service_role;