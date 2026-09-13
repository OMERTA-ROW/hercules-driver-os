-- ============================================================ A) EXEC CLAIMS
-- One owner per paid operation, across every server instance.
CREATE TABLE IF NOT EXISTS public.ai_exec_claims (
  idem_key text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','done','failed')),
  reservation_id uuid,
  charged integer NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 0,
  lease_expires_at timestamptz NOT NULL DEFAULT now() + interval '60 seconds',
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_exec_claims ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.ai_exec_claims TO service_role;

-- Claim (or observe) the right to make a paid call.
-- Returns jsonb: { outcome: 'owner'|'pending'|'done'|'insufficient'|'error',
--                  reservation: uuid, amount: int, charged: int }
CREATE OR REPLACE FUNCTION public.ai_exec_claim(
  _user uuid, _idem text, _action text, _amount integer, _lease_seconds integer DEFAULT 60
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE
  c public.ai_exec_claims;
  r public.ai_credit_reservations;
  fresh public.ai_credit_reservations;
BEGIN
  IF _user IS NULL OR _idem IS NULL THEN RAISE EXCEPTION 'user_and_idem_required'; END IF;

  -- Serialise every claim for this account on the wallet row.
  PERFORM public.ai_credits_touch(_user);

  INSERT INTO public.ai_exec_claims (idem_key, user_id, action, attempts, lease_expires_at)
  VALUES (_idem, _user, _action, 1, now() + make_interval(secs => GREATEST(5, _lease_seconds)))
  ON CONFLICT (idem_key) DO NOTHING
  RETURNING * INTO c;

  IF c.idem_key IS NOT NULL THEN
    -- Brand new claim: take a hold and run.
    BEGIN
      fresh := public.ai_credits_reserve(_user, _action, _amount, _idem || ':1');
    EXCEPTION WHEN OTHERS THEN
      DELETE FROM public.ai_exec_claims WHERE idem_key = _idem;
      IF SQLERRM LIKE '%insufficient_credits%' THEN
        RETURN jsonb_build_object('outcome','insufficient');
      END IF;
      RAISE;
    END;
    UPDATE public.ai_exec_claims SET reservation_id = fresh.id, updated_at = now()
      WHERE idem_key = _idem;
    RETURN jsonb_build_object('outcome','owner','reservation',fresh.id,'amount',fresh.amount);
  END IF;

  SELECT * INTO c FROM public.ai_exec_claims WHERE idem_key = _idem FOR UPDATE;
  IF c.idem_key IS NULL THEN RETURN jsonb_build_object('outcome','error'); END IF;
  IF c.user_id <> _user THEN RETURN jsonb_build_object('outcome','error'); END IF;

  IF c.status = 'done' THEN
    RETURN jsonb_build_object('outcome','done','charged',c.charged);
  END IF;

  IF c.status = 'running' AND c.lease_expires_at > now() THEN
    -- Another instance owns it right now.
    RETURN jsonb_build_object('outcome','pending');
  END IF;

  -- Abandoned lease or a previous failure: only a VALID hold may be reused.
  IF c.reservation_id IS NOT NULL THEN
    SELECT * INTO r FROM public.ai_credit_reservations
      WHERE id = c.reservation_id AND user_id = _user;
  END IF;

  IF r.id IS NOT NULL AND r.status = 'committed' THEN
    -- Already paid for and settled: no new provider call, no new charge.
    UPDATE public.ai_exec_claims
      SET status = 'done', charged = r.amount, updated_at = now() WHERE idem_key = _idem;
    RETURN jsonb_build_object('outcome','done','charged',r.amount);
  END IF;

  IF r.id IS NOT NULL AND r.status = 'reserved' THEN
    UPDATE public.ai_exec_claims
      SET status = 'running', attempts = c.attempts + 1,
          lease_expires_at = now() + make_interval(secs => GREATEST(5, _lease_seconds)),
          updated_at = now()
      WHERE idem_key = _idem;
    RETURN jsonb_build_object('outcome','owner','reservation',r.id,'amount',r.amount);
  END IF;

  -- Refunded or missing hold: a retry must obtain a NEW valid hold.
  BEGIN
    fresh := public.ai_credits_reserve(
      _user, _action, _amount, _idem || ':' || (c.attempts + 1)::text);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%insufficient_credits%' THEN
      RETURN jsonb_build_object('outcome','insufficient');
    END IF;
    RAISE;
  END;

  UPDATE public.ai_exec_claims
    SET status = 'running', reservation_id = fresh.id, attempts = c.attempts + 1,
        lease_expires_at = now() + make_interval(secs => GREATEST(5, _lease_seconds)),
        updated_at = now()
    WHERE idem_key = _idem;
  RETURN jsonb_build_object('outcome','owner','reservation',fresh.id,'amount',fresh.amount);
END;
$$;

-- Settle the claim. Returns jsonb { status: 'settled'|'unsettled'|'failed', charged }
CREATE OR REPLACE FUNCTION public.ai_exec_finish(
  _user uuid, _idem text, _ok boolean, _charge integer DEFAULT NULL,
  _model text DEFAULT NULL, _provider_cost numeric DEFAULT NULL,
  _cost_basis text DEFAULT 'estimated', _error text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE
  c public.ai_exec_claims;
  charged integer;
BEGIN
  SELECT * INTO c FROM public.ai_exec_claims WHERE idem_key = _idem FOR UPDATE;
  IF c.idem_key IS NULL OR c.user_id <> _user THEN RAISE EXCEPTION 'claim_not_found'; END IF;

  IF NOT _ok THEN
    IF c.reservation_id IS NOT NULL THEN
      PERFORM public.ai_credits_refund(_user, c.reservation_id, COALESCE(_error, 'provider failed'));
    END IF;
    UPDATE public.ai_exec_claims
      SET status = 'failed', last_error = _error, lease_expires_at = now(), updated_at = now()
      WHERE idem_key = _idem;
    RETURN jsonb_build_object('status','failed','charged',0);
  END IF;

  charged := public.ai_credits_commit(
    _user, c.reservation_id, _charge, _model, _provider_cost, _cost_basis, false, 0);

  IF COALESCE(charged, 0) <= 0 THEN
    -- The hold was already settled elsewhere: the provider call was made with no
    -- new debit. Recorded truthfully rather than reported as paid.
    INSERT INTO public.ai_usage_events
      (user_id, action, model, credits_charged, credits_saved, provider_cost_usd, cost_basis, served_from_cache)
    VALUES (_user, c.action, _model, 0, 0, _provider_cost, 'estimated', false);
    UPDATE public.ai_exec_claims
      SET status = 'done', charged = 0,
          last_error = 'provider call could not be charged — hold already settled',
          updated_at = now()
      WHERE idem_key = _idem;
    RETURN jsonb_build_object('status','unsettled','charged',0);
  END IF;

  UPDATE public.ai_exec_claims
    SET status = 'done', charged = charged, updated_at = now() WHERE idem_key = _idem;
  RETURN jsonb_build_object('status','settled','charged',charged);
END;
$$;

REVOKE ALL ON FUNCTION public.ai_exec_claim(uuid,text,text,integer,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_exec_finish(uuid,text,boolean,integer,text,numeric,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_exec_claim(uuid,text,text,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_exec_finish(uuid,text,boolean,integer,text,numeric,text,text) TO service_role;

-- ====================================================== B) CHECKOUT INTENTS
CREATE TABLE IF NOT EXISTS public.ai_checkout_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('plan','pack')),
  item_id text NOT NULL,
  price_id text,
  session_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','abandoned')),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 minutes',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_checkout_intents ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.ai_checkout_intents TO service_role;

-- At most one live monthly-plan checkout per account.
CREATE UNIQUE INDEX IF NOT EXISTS ai_checkout_one_pending_plan
  ON public.ai_checkout_intents (user_id) WHERE (status = 'pending' AND kind = 'plan');

CREATE OR REPLACE FUNCTION public.ai_checkout_begin(
  _user uuid, _kind text, _item_id text, _price_id text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE new_id uuid;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'user_required'; END IF;

  UPDATE public.ai_checkout_intents SET status = 'abandoned'
    WHERE user_id = _user AND status = 'pending' AND expires_at < now();

  BEGIN
    INSERT INTO public.ai_checkout_intents (user_id, kind, item_id, price_id)
    VALUES (_user, _kind, _item_id, _price_id)
    RETURNING id INTO new_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('outcome','pending');
  END;

  RETURN jsonb_build_object('outcome','ok','intent',new_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_checkout_attach(_intent uuid, _session text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
BEGIN
  UPDATE public.ai_checkout_intents SET session_id = _session WHERE id = _intent;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_checkout_settle(_user uuid, _session text, _status text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
BEGIN
  UPDATE public.ai_checkout_intents
    SET status = CASE WHEN _status = 'completed' THEN 'completed' ELSE 'abandoned' END
    WHERE (session_id = _session) OR (_session IS NULL AND user_id = _user AND status = 'pending');
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.ai_checkout_begin(uuid,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_checkout_attach(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_checkout_settle(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_checkout_begin(uuid,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_checkout_attach(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_checkout_settle(uuid,text,text) TO service_role;

-- ============================================ C) INVOICE ↔ PAYMENT MAPPING
ALTER TABLE public.ai_purchases
  ADD COLUMN IF NOT EXISTS payment_intent_id text,
  ADD COLUMN IF NOT EXISTS charge_id text;

CREATE INDEX IF NOT EXISTS ai_purchases_payment_intent_idx
  ON public.ai_purchases (payment_intent_id) WHERE payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ai_purchases_charge_idx
  ON public.ai_purchases (charge_id) WHERE charge_id IS NOT NULL;

-- Reversals that arrive before the purchase they belong to.
CREATE TABLE IF NOT EXISTS public.ai_pending_reversals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'stripe',
  payment_ref text NOT NULL,
  refunded_cents bigint NOT NULL DEFAULT 0,
  reason text,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ai_pending_reversal_uq
  ON public.ai_pending_reversals (provider, payment_ref, refunded_cents);
ALTER TABLE public.ai_pending_reversals ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.ai_pending_reversals TO service_role;

-- Records the invoice's real payment identifiers so a monthly refund (which
-- arrives as a charge or dispute) can be traced back to the purchase.
CREATE OR REPLACE FUNCTION public.ai_billing_map_payment(
  _payment_ref text, _payment_intent text, _charge text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
BEGIN
  UPDATE public.ai_purchases
    SET payment_intent_id = COALESCE(_payment_intent, payment_intent_id),
        charge_id = COALESCE(_charge, charge_id)
    WHERE provider = 'stripe' AND payment_ref = _payment_ref;
  RETURN FOUND;
END;
$$;

-- Reverse by ANY canonical reference, and never touch a newer paid month.
CREATE OR REPLACE FUNCTION public.ai_billing_reverse(
  _payment_ref text, _refunded_cents bigint, _reason text
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE
  p public.ai_purchases;
  w public.ai_credit_wallets;
  share numeric;
  target integer;
  take integer;
  before_total integer;
  after_total integer;
  removed integer;
BEGIN
  SELECT * INTO p FROM public.ai_purchases
    WHERE provider = 'stripe'
      AND (payment_ref = _payment_ref
           OR payment_intent_id = _payment_ref
           OR charge_id = _payment_ref
           OR invoice_id = _payment_ref)
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

  IF p.id IS NULL THEN
    -- Out of order: keep it so it is reconciled before any later grant.
    INSERT INTO public.ai_pending_reversals (payment_ref, refunded_cents, reason)
    VALUES (_payment_ref, COALESCE(_refunded_cents, 0), _reason)
    ON CONFLICT DO NOTHING;
    RETURN 'unknown_payment';
  END IF;

  IF p.amount_paid_cents IS NULL OR p.amount_paid_cents <= 0 OR _refunded_cents IS NULL THEN
    share := 1;
  ELSE
    share := LEAST(1::numeric, _refunded_cents::numeric / p.amount_paid_cents::numeric);
  END IF;

  target := FLOOR(p.credits * share)::integer;
  take := target - p.credits_reversed;
  IF take <= 0 THEN RETURN 'already_reversed'; END IF;

  w := public.ai_credits_touch(p.user_id);

  -- Refunding a CLOSED month must not take credits out of a newer paid month.
  IF p.bucket = 'monthly' AND p.period_end IS NOT NULL
     AND w.monthly_expires_at IS NOT NULL AND p.period_end < w.monthly_expires_at THEN
    UPDATE public.ai_purchases
      SET credits_reversed = target, credits_owed = credits_owed + take
      WHERE id = p.id;
    INSERT INTO public.ai_credit_ledger (user_id, kind, monthly_delta, purchased_delta, reason)
    VALUES (p.user_id, 'adjust', 0, 0,
      'Refund of a closed month recorded as owed — the current month was not touched');
    RETURN 'reversed_closed_period';
  END IF;

  SELECT monthly_balance + purchased_balance INTO before_total
    FROM public.ai_credit_wallets WHERE user_id = p.user_id;

  PERFORM public.ai_credits_revoke(
    p.user_id, p.bucket, take,
    'reverse:' || p.payment_ref || ':' || target::text,
    COALESCE(_reason, 'Payment reversed — credits removed'));

  SELECT monthly_balance + purchased_balance INTO after_total
    FROM public.ai_credit_wallets WHERE user_id = p.user_id;

  removed := GREATEST(0, COALESCE(before_total, 0) - COALESCE(after_total, 0));

  UPDATE public.ai_purchases
    SET credits_reversed = target,
        credits_owed = credits_owed + GREATEST(0, take - removed)
    WHERE id = p.id;

  RETURN 'reversed';
END;
$$;

-- Stopping a monthly allowance only affects the period that actually failed.
CREATE OR REPLACE FUNCTION public.ai_billing_stop_monthly(
  _user uuid, _period_end timestamptz, _ref text, _reason text
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE w public.ai_credit_wallets;
BEGIN
  w := public.ai_credits_touch(_user);

  IF _period_end IS NOT NULL AND w.monthly_expires_at IS NOT NULL
     AND _period_end < w.monthly_expires_at THEN
    -- A delayed failure for an older invoice cannot erase a newer paid month.
    RETURN 'stale';
  END IF;

  PERFORM public.ai_credits_revoke(_user, 'monthly', 1000000, _ref, _reason);
  RETURN 'stopped';
END;
$$;

-- Reconcile any queued reversal for this payment before granting.
CREATE OR REPLACE FUNCTION public.ai_billing_fulfill(
  _user uuid, _kind text, _item_id text, _bucket text, _credits integer,
  _payment_ref text, _invoice text DEFAULT NULL, _subscription text DEFAULT NULL,
  _period_start timestamptz DEFAULT NULL, _period_end timestamptz DEFAULT NULL,
  _amount_cents bigint DEFAULT NULL, _currency text DEFAULT NULL,
  _payment_intent text DEFAULT NULL, _charge text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE
  w public.ai_credit_wallets;
  inserted uuid;
  q public.ai_pending_reversals;
BEGIN
  IF _user IS NULL OR _payment_ref IS NULL THEN RAISE EXCEPTION 'user_and_ref_required'; END IF;
  IF _bucket NOT IN ('monthly','purchased') THEN RAISE EXCEPTION 'invalid bucket'; END IF;

  w := public.ai_credits_touch(_user);

  IF _bucket = 'monthly' AND _period_end IS NOT NULL
     AND w.monthly_expires_at IS NOT NULL AND _period_end <= w.monthly_expires_at THEN
    RETURN 'stale';
  END IF;

  BEGIN
    INSERT INTO public.ai_purchases
      (user_id, provider, kind, item_id, bucket, credits, payment_ref, invoice_id,
       subscription_id, period_start, period_end, amount_paid_cents, currency,
       payment_intent_id, charge_id)
    VALUES
      (_user, 'stripe', _kind, _item_id, _bucket, _credits, _payment_ref, _invoice,
       _subscription, _period_start, _period_end, _amount_cents, _currency,
       _payment_intent, _charge)
    RETURNING id INTO inserted;
  EXCEPTION WHEN unique_violation THEN
    PERFORM public.ai_billing_map_payment(_payment_ref, _payment_intent, _charge);
    RETURN 'duplicate';
  END;

  PERFORM public.ai_credits_grant(
    _user, _bucket, _credits, 'stripe:' || _payment_ref,
    CASE WHEN _bucket = 'monthly' THEN 'Monthly AI allowance (paid invoice)'
         ELSE 'Credit pack purchase (never expires)' END,
    CASE WHEN _bucket = 'monthly' THEN COALESCE(_period_end, now() + interval '31 days') ELSE NULL END,
    CASE WHEN _kind = 'plan' THEN _item_id ELSE NULL END,
    CASE WHEN _bucket = 'monthly' THEN COALESCE(_period_end, now() + interval '31 days') ELSE NULL END
  );

  -- A refund that arrived before this purchase is applied now, not lost.
  FOR q IN
    SELECT * FROM public.ai_pending_reversals
      WHERE resolved = false
        AND payment_ref IN (_payment_ref, COALESCE(_payment_intent,''), COALESCE(_charge,''), COALESCE(_invoice,''))
  LOOP
    PERFORM public.ai_billing_reverse(q.payment_ref, q.refunded_cents,
      COALESCE(q.reason, 'Queued reversal reconciled'));
    UPDATE public.ai_pending_reversals SET resolved = true WHERE id = q.id;
  END LOOP;

  RETURN 'granted';
END;
$$;

REVOKE ALL ON FUNCTION public.ai_billing_map_payment(text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_billing_stop_monthly(uuid,timestamptz,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_billing_reverse(text,bigint,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_billing_fulfill(uuid,text,text,text,integer,text,text,text,timestamptz,timestamptz,bigint,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_billing_map_payment(text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_billing_stop_monthly(uuid,timestamptz,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_billing_reverse(text,bigint,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_billing_fulfill(uuid,text,text,text,integer,text,text,text,timestamptz,timestamptz,bigint,text,text,text) TO service_role;