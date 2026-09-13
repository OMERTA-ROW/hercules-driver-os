CREATE OR REPLACE FUNCTION public.ai_exec_finish(_user uuid, _idem text, _ok boolean, _charge integer DEFAULT NULL::integer, _model text DEFAULT NULL::text, _provider_cost numeric DEFAULT NULL::numeric, _cost_basis text DEFAULT 'estimated'::text, _error text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  c public.ai_exec_claims;
  v_charged integer;
BEGIN
  SELECT * INTO c FROM public.ai_exec_claims WHERE public.ai_exec_claims.idem_key = _idem FOR UPDATE;
  IF c.idem_key IS NULL OR c.user_id <> _user THEN RAISE EXCEPTION 'claim_not_found'; END IF;

  IF NOT _ok THEN
    IF c.reservation_id IS NOT NULL THEN
      PERFORM public.ai_credits_refund(_user, c.reservation_id, COALESCE(_error, 'provider failed'));
    END IF;
    UPDATE public.ai_exec_claims
      SET status = 'failed', last_error = _error, lease_expires_at = now(), updated_at = now()
      WHERE public.ai_exec_claims.idem_key = _idem;
    RETURN jsonb_build_object('status','failed','charged',0);
  END IF;

  v_charged := public.ai_credits_commit(
    _user, c.reservation_id, _charge, _model, _provider_cost, _cost_basis, false, 0);

  IF COALESCE(v_charged, 0) <= 0 THEN
    INSERT INTO public.ai_usage_events
      (user_id, action, model, credits_charged, credits_saved, provider_cost_usd, cost_basis, served_from_cache)
    VALUES (_user, c.action, _model, 0, 0, _provider_cost, 'estimated', false);
    UPDATE public.ai_exec_claims
      SET status = 'done', charged = 0,
          last_error = 'provider call could not be charged - hold already settled',
          updated_at = now()
      WHERE public.ai_exec_claims.idem_key = _idem;
    RETURN jsonb_build_object('status','unsettled','charged',0);
  END IF;

  UPDATE public.ai_exec_claims
    SET status = 'done', charged = v_charged, updated_at = now()
    WHERE public.ai_exec_claims.idem_key = _idem;
  RETURN jsonb_build_object('status','settled','charged',v_charged);
END;
$function$;

REVOKE ALL ON FUNCTION public.ai_exec_finish(uuid, text, boolean, integer, text, numeric, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_exec_finish(uuid, text, boolean, integer, text, numeric, text, text) TO service_role;