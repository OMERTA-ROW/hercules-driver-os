-- ============================================================
-- 1. Reconcile the direct company access hotfixes into history
-- ============================================================
CREATE OR REPLACE FUNCTION public.company_member_remove(_member uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_row public.company_members; v_role text; v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok',false,'error','not_signed_in'); END IF;
  SELECT * INTO v_row FROM public.company_members WHERE id = _member FOR UPDATE;
  IF v_row.id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','unknown_member'); END IF;
  v_role := private.company_role(v_row.company_id);
  IF v_row.user_id IS DISTINCT FROM v_user AND v_role IS DISTINCT FROM 'owner' THEN
    RETURN jsonb_build_object('ok',false,'error','not_permitted');
  END IF;
  IF v_row.role = 'owner' AND (SELECT count(*) FROM public.company_members WHERE company_id=v_row.company_id AND role='owner' AND status='active') <= 1 THEN
    RETURN jsonb_build_object('ok',false,'error','last_owner');
  END IF;
  UPDATE public.company_members SET status='removed' WHERE id=_member;
  RETURN jsonb_build_object('ok',true);
END; $function$;

CREATE OR REPLACE FUNCTION public.company_member_decide(_member uuid, _approve boolean)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_row public.company_members; v_role text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_signed_in'); END IF;
  SELECT * INTO v_row FROM public.company_members WHERE id = _member;
  IF v_row.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'unknown_member'); END IF;
  v_role := private.company_role(v_row.company_id);
  IF v_role IS NULL OR v_role NOT IN ('owner','dispatcher') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_permitted');
  END IF;
  IF v_row.role = 'dispatcher' AND v_role IS DISTINCT FROM 'owner' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'owner_only');
  END IF;
  IF v_row.role = 'owner' THEN RETURN jsonb_build_object('ok', false, 'error', 'cannot_change_owner'); END IF;
  UPDATE public.company_members
     SET status = CASE WHEN _approve THEN 'active' ELSE 'removed' END,
         joined_at = CASE WHEN _approve THEN now() ELSE joined_at END
   WHERE id = _member;
  RETURN jsonb_build_object('ok', true, 'status', CASE WHEN _approve THEN 'active' ELSE 'removed' END);
END; $function$;

-- company_join: a targeted invite matches only the CONFIRMED email on the account
CREATE OR REPLACE FUNCTION public.company_join(_code text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_email text;
  v_inv public.company_invites;
  v_status text;
  v_existing public.company_members;
  v_name text;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_signed_in'); END IF;
  SELECT * INTO v_inv FROM public.company_invites
   WHERE code = upper(btrim(coalesce(_code, ''))) FOR UPDATE;
  IF v_inv.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'unknown_code'); END IF;
  IF v_inv.revoked THEN RETURN jsonb_build_object('ok', false, 'error', 'revoked'); END IF;
  IF v_inv.expires_at <= now() THEN RETURN jsonb_build_object('ok', false, 'error', 'expired'); END IF;
  IF v_inv.used_count >= v_inv.max_uses THEN RETURN jsonb_build_object('ok', false, 'error', 'used_up'); END IF;

  IF v_inv.email IS NOT NULL THEN
    SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_user AND email_confirmed_at IS NOT NULL;
    IF v_email IS DISTINCT FROM v_inv.email THEN
      RETURN jsonb_build_object('ok', false, 'error', 'wrong_email');
    END IF;
  END IF;

  SELECT * INTO v_existing FROM public.company_members
   WHERE company_id = v_inv.company_id AND user_id = v_user;
  SELECT name INTO v_name FROM public.companies WHERE id = v_inv.company_id;

  IF v_existing.id IS NOT NULL AND v_existing.status <> 'removed' THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'status', v_existing.status,
                              'role', v_existing.role, 'company_id', v_inv.company_id, 'company', v_name);
  END IF;

  v_status := CASE WHEN v_inv.requires_approval THEN 'pending' ELSE 'active' END;

  INSERT INTO public.company_members (company_id, user_id, role, status, invited_by, invite_id, joined_at)
  VALUES (v_inv.company_id, v_user, v_inv.role, v_status, v_inv.created_by, v_inv.id,
          CASE WHEN v_status = 'active' THEN now() END)
  ON CONFLICT (company_id, user_id) DO UPDATE
    SET role = v_inv.role, status = v_status, invite_id = v_inv.id,
        joined_at = CASE WHEN v_status = 'active' THEN now() ELSE NULL END;

  UPDATE public.company_invites SET used_count = used_count + 1 WHERE id = v_inv.id;

  RETURN jsonb_build_object('ok', true, 'status', v_status, 'role', v_inv.role,
                            'company_id', v_inv.company_id, 'company', v_name);
END; $function$;

-- ============================================================
-- 2. Per-plan daily / weekly spending allowance (owner editable)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_plan_allowances (
  plan_id text PRIMARY KEY,
  daily_credits integer NOT NULL CHECK (daily_credits > 0),
  weekly_credits integer NOT NULL CHECK (weekly_credits > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_plan_allowances ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.ai_plan_allowances TO service_role;
-- Read-only to signed-in drivers: they may see their own plan's limits.
GRANT SELECT ON public.ai_plan_allowances TO authenticated;
DROP POLICY IF EXISTS "allowances readable" ON public.ai_plan_allowances;
CREATE POLICY "allowances readable" ON public.ai_plan_allowances
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.ai_plan_allowances (plan_id, daily_credits, weekly_credits) VALUES
  ('assist', 20, 100),
  ('pro', 60, 320),
  ('max', 200, 1100)
ON CONFLICT (plan_id) DO UPDATE
  SET daily_credits = EXCLUDED.daily_credits,
      weekly_credits = EXCLUDED.weekly_credits,
      updated_at = now();

-- Allowance status. Weeks run Saturday 00:00 UTC to Saturday 00:00 UTC.
CREATE OR REPLACE FUNCTION public.ai_allowance_status(_user uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $function$
DECLARE
  w public.ai_credit_wallets;
  a public.ai_plan_allowances;
  day_start timestamptz := date_trunc('day', now());
  week_start timestamptz := date_trunc('day', now())
    - make_interval(days => ((extract(dow from now())::int + 1) % 7));
  used_day integer;
  used_week integer;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'user_required'; END IF;
  SELECT * INTO w FROM public.ai_credit_wallets WHERE user_id = _user;

  IF w.user_id IS NULL OR w.ai_plan_id IS NULL THEN
    RETURN jsonb_build_object(
      'subscribed', false, 'plan', NULL,
      'daily_limit', NULL, 'daily_used', 0, 'weekly_limit', NULL, 'weekly_used', 0,
      'daily_resets_at', day_start + interval '1 day',
      'weekly_resets_at', week_start + interval '7 days');
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
    'daily_limit', a.daily_credits,
    'daily_used', used_day,
    'weekly_limit', a.weekly_credits,
    'weekly_used', used_week,
    'daily_resets_at', day_start + interval '1 day',
    'weekly_resets_at', week_start + interval '7 days');
END; $function$;

REVOKE ALL ON FUNCTION public.ai_allowance_status(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_allowance_status(uuid) TO service_role;

-- ============================================================
-- 3. Paid calls: subscription required, allowance enforced
-- ============================================================
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

  -- Serialise every claim for this account on the wallet row.
  PERFORM public.ai_credits_touch(_user);

  -- Already-owned claim? Let it settle without re-checking the allowance.
  SELECT * INTO c FROM public.ai_exec_claims WHERE idem_key = _idem;

  IF c.idem_key IS NULL THEN
    st := public.ai_allowance_status(_user);

    IF NOT (st->>'subscribed')::boolean THEN
      RETURN jsonb_build_object('outcome','no_subscription');
    END IF;

    IF (st->>'daily_limit') IS NOT NULL
       AND (st->>'daily_used')::int + _amount > (st->>'daily_limit')::int THEN
      RETURN jsonb_build_object('outcome','daily_limit',
        'limit',(st->>'daily_limit')::int,'used',(st->>'daily_used')::int,
        'resets_at', st->>'daily_resets_at');
    END IF;

    IF (st->>'weekly_limit') IS NOT NULL
       AND (st->>'weekly_used')::int + _amount > (st->>'weekly_limit')::int THEN
      RETURN jsonb_build_object('outcome','weekly_limit',
        'limit',(st->>'weekly_limit')::int,'used',(st->>'weekly_used')::int,
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

-- ============================================================
-- 4. One-time top-ups are for subscribers only
-- ============================================================
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
          ai_plan_id = COALESCE(_plan_id, ai_plan_id),
          ai_plan_renews_at = COALESCE(_renews_at, new_expires, ai_plan_renews_at)
      WHERE user_id = _user;
  ELSE
    -- Top-ups are a subscriber benefit: without a monthly plan on the wallet the
    -- payment is recorded and held, never turned into spendable credits.
    IF w.ai_plan_id IS NULL THEN
      UPDATE public.ai_credit_ledger
        SET purchased_delta = 0,
            reason = COALESCE(_reason, 'credit top-up')
              || ' (held: top-ups need an active monthly AI plan)'
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