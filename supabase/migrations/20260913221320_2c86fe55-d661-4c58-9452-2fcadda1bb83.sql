-- Helper: does the caller manage the company with this code?
CREATE OR REPLACE FUNCTION private.manages_code(_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies c
    JOIN public.company_members m ON m.company_id = c.id
    WHERE c.code = _code AND m.user_id = auth.uid()
      AND m.status = 'active' AND m.role IN ('owner','dispatcher')
  );
$$;

-- 1) Own membership summary, pending included, minimal company fields only.
CREATE OR REPLACE FUNCTION public.company_my_memberships()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_user uuid := auth.uid(); v_rows jsonb;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_signed_in'); END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', m.id, 'company_id', m.company_id, 'role', m.role, 'status', m.status,
           'company', jsonb_build_object(
             'id', c.id, 'name', c.name, 'code', c.code,
             'dot_number', c.dot_number, 'mc_number', c.mc_number,
             'load_board_connected', c.load_board_connected,
             'load_board_provider', c.load_board_provider)) ORDER BY m.created_at), '[]'::jsonb)
    INTO v_rows
    FROM public.company_members m
    JOIN public.companies c ON c.id = m.company_id
   WHERE m.user_id = v_user AND m.status <> 'removed';
  RETURN jsonb_build_object('ok', true, 'memberships', v_rows);
END; $$;

-- 2) Manager-only roster with the least identity that runs a fleet.
CREATE OR REPLACE FUNCTION public.company_roster(_company uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_user uuid := auth.uid(); v_role text; v_rows jsonb;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_signed_in'); END IF;
  IF _company IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'unknown_company'); END IF;
  v_role := private.company_role(_company);
  IF v_role IS NULL OR v_role NOT IN ('owner','dispatcher') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_permitted');
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', m.id, 'user_id', m.user_id, 'role', m.role, 'status', m.status,
           'joined_at', m.joined_at,
           'name', NULLIF(btrim(COALESCE(p.full_name, '')), ''),
           'email', COALESCE(NULLIF(btrim(COALESCE(p.email, '')), ''), lower(u.email))
         ) ORDER BY m.created_at), '[]'::jsonb)
    INTO v_rows
    FROM public.company_members m
    LEFT JOIN public.profiles p ON p.id = m.user_id
    LEFT JOIN auth.users u ON u.id = m.user_id AND u.email_confirmed_at IS NOT NULL
   WHERE m.company_id = _company AND m.status <> 'removed';
  RETURN jsonb_build_object('ok', true, 'members', v_rows);
END; $$;

GRANT EXECUTE ON FUNCTION public.company_my_memberships() TO authenticated;
GRANT EXECUTE ON FUNCTION public.company_roster(uuid) TO authenticated;

-- Pending applicants may read the carrier they applied to.
DROP POLICY IF EXISTS "companies read" ON public.companies;
CREATE POLICY "companies read" ON public.companies FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.company_members m
              WHERE m.company_id = companies.id AND m.user_id = auth.uid()
                AND m.status <> 'removed')
);

-- 3) Load writes: membership and manager permissions enforced server-side.
DROP POLICY IF EXISTS "loads insert" ON public.loads;
CREATE POLICY "loads insert" ON public.loads FOR INSERT TO authenticated
WITH CHECK (
  posted_by = auth.uid()
  AND (company_code IS NULL OR private.manages_code(company_code))
);

DROP POLICY IF EXISTS "loads update" ON public.loads;
CREATE POLICY "loads update" ON public.loads FOR UPDATE TO authenticated
USING (
  posted_by = auth.uid() OR assigned_driver_id = auth.uid()
  OR (company_code IS NOT NULL AND private.manages_code(company_code))
)
WITH CHECK (
  posted_by = auth.uid() OR assigned_driver_id = auth.uid()
  OR (company_code IS NOT NULL AND private.manages_code(company_code))
);

CREATE OR REPLACE FUNCTION public.loads_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE uid uuid := auth.uid(); cid uuid;
BEGIN
  IF uid IS NULL THEN RETURN NEW; END IF;

  IF NEW.company_code IS NOT NULL THEN
    SELECT id INTO cid FROM public.companies WHERE code = NEW.company_code;
    IF cid IS NULL THEN RAISE EXCEPTION 'unknown_company_code'; END IF;
  END IF;

  -- Attaching or moving a load between company scopes is a manager action.
  IF TG_OP = 'INSERT' THEN
    IF NEW.company_code IS NOT NULL AND NOT private.manages_code(NEW.company_code) THEN
      RAISE EXCEPTION 'not_company_manager';
    END IF;
  ELSIF NEW.company_code IS DISTINCT FROM OLD.company_code THEN
    IF NEW.company_code IS NOT NULL AND NOT private.manages_code(NEW.company_code) THEN
      RAISE EXCEPTION 'not_company_manager';
    END IF;
    IF OLD.company_code IS NOT NULL AND NOT private.manages_code(OLD.company_code) THEN
      RAISE EXCEPTION 'not_company_manager';
    END IF;
  END IF;

  IF NEW.assigned_driver_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.assigned_driver_id IS DISTINCT FROM OLD.assigned_driver_id) THEN
    IF NEW.company_code IS NULL THEN
      IF NEW.assigned_driver_id <> uid THEN RAISE EXCEPTION 'cannot_assign_other_driver'; END IF;
    ELSE
      IF NEW.assigned_driver_id <> uid AND NOT private.manages_code(NEW.company_code) THEN
        RAISE EXCEPTION 'cannot_assign_other_driver';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.company_members m
                      WHERE m.company_id = cid AND m.user_id = NEW.assigned_driver_id
                        AND m.status = 'active') THEN
        RAISE EXCEPTION 'driver_not_in_company';
      END IF;
    END IF;
  END IF;

  IF NEW.vehicle_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id) THEN
    IF NOT EXISTS (SELECT 1 FROM public.vehicles v
                    WHERE v.id = NEW.vehicle_id
                      AND v.owner_id = COALESCE(NEW.assigned_driver_id, uid)) THEN
      RAISE EXCEPTION 'vehicle_not_owned_by_driver';
    END IF;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS loads_guard_biu ON public.loads;
CREATE TRIGGER loads_guard_biu BEFORE INSERT OR UPDATE ON public.loads
FOR EACH ROW EXECUTE FUNCTION public.loads_guard();

-- Vehicles: a company tag must be a company the caller actually belongs to.
CREATE OR REPLACE FUNCTION public.vehicles_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN NEW; END IF;
  IF NEW.company_code IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.company_code IS DISTINCT FROM OLD.company_code) THEN
    IF NOT EXISTS (SELECT 1 FROM private.my_company_codes() AS c WHERE c = NEW.company_code) THEN
      RAISE EXCEPTION 'not_company_member';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS vehicles_guard_biu ON public.vehicles;
CREATE TRIGGER vehicles_guard_biu BEFORE INSERT OR UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.vehicles_guard();

-- 4) Refund of a held top-up debits the held value before anything is released.
CREATE OR REPLACE FUNCTION public.ai_credits_revoke(_user uuid, _bucket text, _amount integer, _ref text, _reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  w public.ai_credit_wallets;
  take_monthly integer := 0;
  take_purchased integer := 0;
  take_pending integer := 0;
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
    -- Held (unreleased) value is taken back FIRST: it belongs to this payment
    -- and must never be released after the money was returned.
    take_pending := LEAST(GREATEST(w.pending_purchased_balance, 0), _amount);
    take_purchased := LEAST(w.purchased_balance, _amount - take_pending);
  END IF;

  UPDATE public.ai_credit_wallets
    SET monthly_balance = monthly_balance - take_monthly,
        purchased_balance = purchased_balance - take_purchased,
        pending_purchased_balance = pending_purchased_balance - take_pending,
        ai_plan_id = CASE WHEN _bucket = 'monthly' THEN NULL ELSE ai_plan_id END
    WHERE user_id = _user;

  UPDATE public.ai_credit_ledger
    SET monthly_delta = -take_monthly, purchased_delta = -take_purchased,
        reason = COALESCE(_reason, 'payment reversed')
          || CASE WHEN take_pending > 0
                  THEN ' (' || take_pending::text || ' held credits removed before release)'
                  ELSE '' END
    WHERE ref = _ref;

  RETURN true;
END; $$;
