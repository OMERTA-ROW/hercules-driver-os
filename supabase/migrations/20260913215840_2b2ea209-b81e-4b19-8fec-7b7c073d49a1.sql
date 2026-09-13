-- ============================================================
-- 1. Recoverable top-ups paid while a subscription is lapsed
-- ============================================================
ALTER TABLE public.ai_credit_wallets
  ADD COLUMN IF NOT EXISTS pending_purchased_balance integer NOT NULL DEFAULT 0;

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
  released integer := 0;
  paid_through timestamptz;
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
    IF w.monthly_expires_at IS NOT NULL AND new_expires <= w.monthly_expires_at THEN
      UPDATE public.ai_credit_ledger
        SET monthly_delta = 0,
            reason = COALESCE(_reason, 'credit grant') || ' (superseded by a newer billing period)'
        WHERE ref = _ref;
      RETURN true;
    END IF;

    -- A paid month releases any top-up that was paid for while lapsed. The money
    -- was taken, so the credits are restored, never discarded.
    released := GREATEST(0, w.pending_purchased_balance);

    UPDATE public.ai_credit_wallets
      SET monthly_balance = _amount,
          monthly_expires_at = new_expires,
          paid_through_at = GREATEST(COALESCE(paid_through_at, '-infinity'), new_expires),
          purchased_balance = purchased_balance + released,
          pending_purchased_balance = 0,
          ai_plan_id = COALESCE(_plan_id, ai_plan_id),
          ai_plan_renews_at = COALESCE(_renews_at, new_expires, ai_plan_renews_at)
      WHERE user_id = _user;

    IF released > 0 THEN
      INSERT INTO public.ai_credit_ledger (user_id, kind, monthly_delta, purchased_delta, reason)
      VALUES (_user, 'adjust', 0, released,
              'Top-up paid while the plan was lapsed — released now the plan is paid');
    END IF;
  ELSE
    paid_through := COALESCE(w.paid_through_at, w.monthly_expires_at, w.ai_plan_renews_at);
    IF w.ai_plan_id IS NULL OR paid_through IS NULL OR paid_through <= now() THEN
      -- Held, but NOT lost: the paid amount is kept as a recoverable balance and
      -- released as soon as a paid monthly plan is in force again.
      UPDATE public.ai_credit_wallets
        SET pending_purchased_balance = pending_purchased_balance + _amount
        WHERE user_id = _user;
      UPDATE public.ai_credit_ledger
        SET purchased_delta = 0,
            reason = COALESCE(_reason, 'credit top-up')
              || ' (held for you: top-ups need a paid monthly plan — released when one is active, refundable meanwhile)'
        WHERE ref = _ref;
      RETURN true;
    END IF;
    UPDATE public.ai_credit_wallets
      SET purchased_balance = purchased_balance + _amount
      WHERE user_id = _user;
  END IF;

  RETURN true;
END; $function$;

REVOKE ALL ON FUNCTION public.ai_credits_grant(uuid, text, integer, text, text, timestamptz, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_credits_grant(uuid, text, integer, text, text, timestamptz, text, timestamptz) TO service_role;

-- ============================================================
-- 2. Allowance status: paid expiry, explicit missing config, pending balance
-- ============================================================
CREATE OR REPLACE FUNCTION public.ai_allowance_status(_user uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $function$
DECLARE
  tz text := 'America/New_York';
  w public.ai_credit_wallets;
  a public.ai_plan_allowances;
  local_now timestamp := (now() AT TIME ZONE tz);
  day_start timestamptz := (date_trunc('day', local_now)) AT TIME ZONE tz;
  day_next timestamptz := (date_trunc('day', local_now) + interval '1 day') AT TIME ZONE tz;
  week_local timestamp := date_trunc('day', local_now)
    - make_interval(days => ((extract(dow from local_now)::int + 1) % 7));
  week_start timestamptz := week_local AT TIME ZONE tz;
  week_next timestamptz := (week_local + interval '7 days') AT TIME ZONE tz;
  paid_through timestamptz;
  subscribed boolean;
  used_day integer;
  used_week integer;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'user_required'; END IF;
  SELECT * INTO w FROM public.ai_credit_wallets WHERE user_id = _user;

  paid_through := COALESCE(w.paid_through_at, w.monthly_expires_at, w.ai_plan_renews_at);
  subscribed := COALESCE(
    w.user_id IS NOT NULL AND w.ai_plan_id IS NOT NULL AND paid_through > now(), false);

  SELECT COALESCE(sum(CASE WHEN status = 'refunded' THEN 0 ELSE amount END), 0)
    INTO used_day FROM public.ai_credit_reservations
   WHERE user_id = _user AND created_at >= day_start;

  SELECT COALESCE(sum(CASE WHEN status = 'refunded' THEN 0 ELSE amount END), 0)
    INTO used_week FROM public.ai_credit_reservations
   WHERE user_id = _user AND created_at >= week_start;

  IF NOT subscribed THEN
    RETURN jsonb_build_object(
      'subscribed', false, 'plan', w.ai_plan_id, 'timezone', tz,
      'paid_through', paid_through, 'config_missing', false,
      'pending_purchased', COALESCE(w.pending_purchased_balance, 0),
      'daily_limit', 0, 'daily_used', used_day, 'weekly_limit', 0, 'weekly_used', used_week,
      'daily_resets_at', day_next, 'weekly_resets_at', week_next);
  END IF;

  SELECT * INTO a FROM public.ai_plan_allowances WHERE plan_id = w.ai_plan_id;

  -- Unknown plan or missing caps DENY. A missing row never means unlimited.
  IF a.plan_id IS NULL OR a.daily_credits IS NULL OR a.weekly_credits IS NULL THEN
    RETURN jsonb_build_object(
      'subscribed', true, 'plan', w.ai_plan_id, 'timezone', tz,
      'paid_through', paid_through, 'config_missing', true,
      'pending_purchased', COALESCE(w.pending_purchased_balance, 0),
      'daily_limit', 0, 'daily_used', used_day, 'weekly_limit', 0, 'weekly_used', used_week,
      'daily_resets_at', day_next, 'weekly_resets_at', week_next);
  END IF;

  RETURN jsonb_build_object(
    'subscribed', true,
    'plan', w.ai_plan_id,
    'timezone', tz,
    'paid_through', paid_through,
    'config_missing', false,
    'pending_purchased', COALESCE(w.pending_purchased_balance, 0),
    'daily_limit', a.daily_credits,
    'daily_used', used_day,
    'weekly_limit', a.weekly_credits,
    'weekly_used', used_week,
    'daily_resets_at', day_next,
    'weekly_resets_at', week_next);
END; $function$;

REVOKE ALL ON FUNCTION public.ai_allowance_status(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_allowance_status(uuid) TO service_role;

-- ============================================================
-- 3. The gate runs on EVERY new hold, and on every reuse
-- ============================================================
CREATE OR REPLACE FUNCTION public.ai_gate_check(_user uuid, _amount integer, _new_hold boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $function$
DECLARE
  st jsonb;
  day_block boolean;
  week_block boolean;
  day_reset timestamptz;
  week_reset timestamptz;
BEGIN
  st := public.ai_allowance_status(_user);

  IF COALESCE((st->>'subscribed')::boolean, false) IS NOT TRUE THEN
    RETURN jsonb_build_object('outcome','no_subscription');
  END IF;

  IF COALESCE((st->>'config_missing')::boolean, true) IS TRUE THEN
    RETURN jsonb_build_object('outcome','no_allowance_config');
  END IF;

  IF NOT _new_hold THEN
    -- Reusing an existing hold: the subscription must still be paid, but the
    -- amount is already counted, so caps are not re-applied to it.
    RETURN jsonb_build_object('outcome','ok');
  END IF;

  day_reset := (st->>'daily_resets_at')::timestamptz;
  week_reset := (st->>'weekly_resets_at')::timestamptz;
  day_block := COALESCE((st->>'daily_used')::int,0) + _amount > COALESCE((st->>'daily_limit')::int,0);
  week_block := COALESCE((st->>'weekly_used')::int,0) + _amount > COALESCE((st->>'weekly_limit')::int,0);

  IF day_block AND week_block THEN
    -- Both are out: report the LATER return time, which is the real one.
    IF week_reset >= day_reset THEN
      RETURN jsonb_build_object('outcome','weekly_limit','limit',(st->>'weekly_limit')::int,
        'used',(st->>'weekly_used')::int,'resets_at',week_reset);
    END IF;
    RETURN jsonb_build_object('outcome','daily_limit','limit',(st->>'daily_limit')::int,
      'used',(st->>'daily_used')::int,'resets_at',day_reset);
  END IF;

  IF week_block THEN
    RETURN jsonb_build_object('outcome','weekly_limit','limit',(st->>'weekly_limit')::int,
      'used',(st->>'weekly_used')::int,'resets_at',week_reset);
  END IF;

  IF day_block THEN
    RETURN jsonb_build_object('outcome','daily_limit','limit',(st->>'daily_limit')::int,
      'used',(st->>'daily_used')::int,'resets_at',day_reset);
  END IF;

  RETURN jsonb_build_object('outcome','ok');
END; $function$;

REVOKE ALL ON FUNCTION public.ai_gate_check(uuid, integer, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_gate_check(uuid, integer, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.ai_exec_claim(
  _user uuid, _idem text, _action text, _amount integer, _lease_seconds integer DEFAULT 60
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $function$
DECLARE
  c public.ai_exec_claims;
  r public.ai_credit_reservations;
  fresh public.ai_credit_reservations;
  gate jsonb;
BEGIN
  IF _user IS NULL OR _idem IS NULL THEN RAISE EXCEPTION 'user_and_idem_required'; END IF;

  -- Locks the wallet row: every claim for this account is serialised here, so
  -- concurrent requests cannot read the same remaining allowance twice.
  PERFORM public.ai_credits_touch(_user);

  SELECT * INTO c FROM public.ai_exec_claims WHERE idem_key = _idem FOR UPDATE;

  -- Already settled: no provider call, no charge, no gate needed.
  IF c.idem_key IS NOT NULL AND c.user_id <> _user THEN
    RETURN jsonb_build_object('outcome','error');
  END IF;
  IF c.idem_key IS NOT NULL AND c.status = 'done' THEN
    RETURN jsonb_build_object('outcome','done','charged',c.charged);
  END IF;

  IF c.idem_key IS NULL THEN
    gate := public.ai_gate_check(_user, _amount, true);
    IF gate->>'outcome' <> 'ok' THEN RETURN gate; END IF;

    INSERT INTO public.ai_exec_claims (idem_key, user_id, action, attempts, lease_expires_at)
    VALUES (_idem, _user, _action, 1, now() + make_interval(secs => GREATEST(5, _lease_seconds)))
    ON CONFLICT (idem_key) DO NOTHING
    RETURNING * INTO c;

    IF c.idem_key IS NOT NULL THEN
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
    IF c.status = 'done' THEN RETURN jsonb_build_object('outcome','done','charged',c.charged); END IF;
  END IF;

  IF c.status = 'running' AND c.lease_expires_at > now() THEN
    RETURN jsonb_build_object('outcome','pending');
  END IF;

  IF c.reservation_id IS NOT NULL THEN
    SELECT * INTO r FROM public.ai_credit_reservations
      WHERE id = c.reservation_id AND user_id = _user;
  END IF;

  IF r.id IS NOT NULL AND r.status = 'committed' THEN
    UPDATE public.ai_exec_claims
      SET status = 'done', charged = r.amount, updated_at = now() WHERE idem_key = _idem;
    RETURN jsonb_build_object('outcome','done','charged',r.amount);
  END IF;

  IF r.id IS NOT NULL AND r.status = 'reserved' THEN
    -- Stale lease on a hold that is still valid: the subscription must still be
    -- paid before another provider call is allowed on it.
    gate := public.ai_gate_check(_user, 0, false);
    IF gate->>'outcome' <> 'ok' THEN RETURN gate; END IF;
    UPDATE public.ai_exec_claims
      SET status = 'running', attempts = c.attempts + 1,
          lease_expires_at = now() + make_interval(secs => GREATEST(5, _lease_seconds)),
          updated_at = now()
      WHERE idem_key = _idem;
    RETURN jsonb_build_object('outcome','owner','reservation',r.id,'amount',r.amount);
  END IF;

  -- Refunded or missing hold: this is a NEW hold, so the full gate applies again.
  gate := public.ai_gate_check(_user, _amount, true);
  IF gate->>'outcome' <> 'ok' THEN RETURN gate; END IF;

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
END; $function$;

REVOKE ALL ON FUNCTION public.ai_exec_claim(uuid, text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_exec_claim(uuid, text, text, integer, integer) TO service_role;

-- ============================================================
-- 4. Truthful, atomic load booking
-- ============================================================
CREATE OR REPLACE FUNCTION public.load_book(_load uuid, _vehicle uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $function$
DECLARE
  v_user uuid := auth.uid();
  l public.loads;
  allowed boolean;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_signed_in'); END IF;

  SELECT * INTO l FROM public.loads WHERE id = _load FOR UPDATE;
  IF l.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'unknown_load'); END IF;

  -- Company freight is bookable only by an ACTIVE member of that company.
  allowed := l.company_code IS NULL
    OR l.company_code = ANY (SELECT unnest(private.my_company_codes()));
  IF NOT allowed THEN RETURN jsonb_build_object('ok', false, 'error', 'not_permitted'); END IF;

  IF _vehicle IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.vehicles WHERE id = _vehicle AND owner_id = v_user) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unknown_vehicle');
  END IF;

  IF l.assigned_driver_id IS NOT NULL AND l.assigned_driver_id <> v_user THEN
    RETURN jsonb_build_object('ok', false, 'error', 'taken');
  END IF;

  IF l.assigned_driver_id = v_user THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'status', l.status);
  END IF;

  IF l.status IS DISTINCT FROM 'available' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'taken');
  END IF;

  UPDATE public.loads
     SET status = 'booked', assigned_driver_id = v_user,
         vehicle_id = COALESCE(_vehicle, vehicle_id), updated_at = now()
   WHERE id = _load AND status = 'available' AND assigned_driver_id IS NULL;

  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'taken'); END IF;

  RETURN jsonb_build_object('ok', true, 'status', 'booked');
END; $function$;

REVOKE ALL ON FUNCTION public.load_book(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.load_book(uuid, uuid) TO authenticated, service_role;