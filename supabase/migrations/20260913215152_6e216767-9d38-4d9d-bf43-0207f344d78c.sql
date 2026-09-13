INSERT INTO public.ai_plan_allowances (plan_id, daily_credits, weekly_credits) VALUES
  ('assist', 10, 40),
  ('pro', 25, 150),
  ('max', 110, 750)
ON CONFLICT (plan_id) DO UPDATE
  SET daily_credits = EXCLUDED.daily_credits,
      weekly_credits = EXCLUDED.weekly_credits,
      updated_at = now();

-- Day and week windows in the driver-facing timezone, DST-correct.
-- A reset moves the window forward; it never adds credits to a wallet.
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
  subscribed boolean;
  used_day integer;
  used_week integer;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'user_required'; END IF;
  SELECT * INTO w FROM public.ai_credit_wallets WHERE user_id = _user;

  -- Subscribed = a paid monthly period that has not ended yet. A plan cancelled
  -- at period end still counts until that paid period expires. No trial, and no
  -- profile row can grant this: only a verified paid invoice writes it.
  subscribed := w.user_id IS NOT NULL
    AND w.ai_plan_id IS NOT NULL
    AND COALESCE(w.monthly_expires_at, w.ai_plan_renews_at) > now();

  IF NOT subscribed THEN
    RETURN jsonb_build_object(
      'subscribed', false, 'plan', NULL, 'timezone', tz,
      'daily_limit', NULL, 'daily_used', 0, 'weekly_limit', NULL, 'weekly_used', 0,
      'daily_resets_at', day_next, 'weekly_resets_at', week_next);
  END IF;

  SELECT * INTO a FROM public.ai_plan_allowances WHERE plan_id = w.ai_plan_id;

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