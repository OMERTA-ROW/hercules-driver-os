ALTER TABLE public.ai_credit_wallets
  ADD COLUMN IF NOT EXISTS paid_through_at timestamptz;

UPDATE public.ai_credit_wallets
   SET paid_through_at = GREATEST(COALESCE(monthly_expires_at, '-infinity'), COALESCE(ai_plan_renews_at, '-infinity'))
 WHERE paid_through_at IS NULL
   AND (monthly_expires_at IS NOT NULL OR ai_plan_renews_at IS NOT NULL);

-- Grants record the paid-through date; nothing else writes it.
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
          paid_through_at = GREATEST(COALESCE(paid_through_at, '-infinity'), new_expires),
          ai_plan_id = COALESCE(_plan_id, ai_plan_id),
          ai_plan_renews_at = COALESCE(_renews_at, new_expires, ai_plan_renews_at)
      WHERE user_id = _user;
  ELSE
    IF w.ai_plan_id IS NULL
       OR COALESCE(w.paid_through_at, w.monthly_expires_at, w.ai_plan_renews_at) IS NULL
       OR COALESCE(w.paid_through_at, w.monthly_expires_at, w.ai_plan_renews_at) <= now() THEN
      UPDATE public.ai_credit_ledger
        SET purchased_delta = 0,
            reason = COALESCE(_reason, 'credit top-up')
              || ' (held: top-ups need a paid monthly AI plan that is still running)'
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

-- Subscription check: NULL-safe, and based on the paid-through date.
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

  IF NOT subscribed THEN
    RETURN jsonb_build_object(
      'subscribed', false, 'plan', NULL, 'timezone', tz,
      'daily_limit', NULL, 'daily_used', 0, 'weekly_limit', NULL, 'weekly_used', 0,
      'daily_resets_at', day_next, 'weekly_resets_at', week_next);
  END IF;

  SELECT * INTO a FROM public.ai_plan_allowances WHERE plan_id = w.ai_plan_id;
  IF a.plan_id IS NULL THEN
    -- No cap row for this plan: refuse rather than allow unlimited paid spend.
    RETURN jsonb_build_object(
      'subscribed', true, 'plan', w.ai_plan_id, 'timezone', tz,
      'daily_limit', 0, 'daily_used', 0, 'weekly_limit', 0, 'weekly_used', 0,
      'daily_resets_at', day_next, 'weekly_resets_at', week_next);
  END IF;

  SELECT COALESCE(sum(CASE WHEN status = 'refunded' THEN 0 ELSE amount END), 0)
    INTO used_day FROM public.ai_credit_reservations
   WHERE user_id = _user AND created_at >= day_start;

  SELECT COALESCE(sum(CASE WHEN status = 'refunded' THEN 0 ELSE amount END), 0)
    INTO used_week FROM public.ai_credit_reservations
   WHERE user_id = _user AND created_at >= week_start;

  RETURN jsonb_build_object(
    'subscribed', true,
    'plan', w.ai_plan_id,
    'timezone', tz,
    'daily_limit', a.daily_credits,
    'daily_used', used_day,
    'weekly_limit', a.weekly_credits,
    'weekly_used', used_week,
    'daily_resets_at', day_next,
    'weekly_resets_at', week_next);
END; $function$;

REVOKE ALL ON FUNCTION public.ai_allowance_status(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_allowance_status(uuid) TO service_role;

-- The claim gate must never treat a NULL/unknown allowance as permission.
CREATE OR REPLACE FUNCTION public.ai_exec_claim(
  _user uuid, _idem text, _action text, _amount integer, _lease_seconds integer DEFAULT 60
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $function$
DECLARE
  c public.ai_exec_claims;
  r public.ai_credit_reservations;
  fresh public.ai_credit_reservations;
  st jsonb;
BEGIN
  IF _user IS NULL OR _idem IS NULL THEN RAISE EXCEPTION 'user_and_idem_required'; END IF;

  PERFORM public.ai_credits_touch(_user);

  SELECT * INTO c FROM public.ai_exec_claims WHERE idem_key = _idem;

  IF c.idem_key IS NULL THEN
    st := public.ai_allowance_status(_user);

    IF COALESCE((st->>'subscribed')::boolean, false) IS NOT TRUE THEN
      RETURN jsonb_build_object('outcome','no_subscription');
    END IF;

    IF COALESCE((st->>'daily_used')::int, 0) + _amount > COALESCE((st->>'daily_limit')::int, 0) THEN
      RETURN jsonb_build_object('outcome','daily_limit',
        'limit',COALESCE((st->>'daily_limit')::int,0),'used',COALESCE((st->>'daily_used')::int,0),
        'resets_at', st->>'daily_resets_at');
    END IF;

    IF COALESCE((st->>'weekly_used')::int, 0) + _amount > COALESCE((st->>'weekly_limit')::int, 0) THEN
      RETURN jsonb_build_object('outcome','weekly_limit',
        'limit',COALESCE((st->>'weekly_limit')::int,0),'used',COALESCE((st->>'weekly_used')::int,0),
        'resets_at', st->>'weekly_resets_at');
    END IF;
  END IF;

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

  IF c.status = 'done' THEN
    RETURN jsonb_build_object('outcome','done','charged',c.charged);
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
    UPDATE public.ai_exec_claims
      SET status = 'running', attempts = c.attempts + 1,
          lease_expires_at = now() + make_interval(secs => GREATEST(5, _lease_seconds)),
          updated_at = now()
      WHERE idem_key = _idem;
    RETURN jsonb_build_object('outcome','owner','reservation',r.id,'amount',r.amount);
  END IF;

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