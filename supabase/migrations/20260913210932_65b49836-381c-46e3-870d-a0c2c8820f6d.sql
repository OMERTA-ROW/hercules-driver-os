-- ============ COMPANIES ============
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  dot_number text,
  mc_number text,
  home_base text,
  load_board_connected boolean NOT NULL DEFAULT false,
  load_board_provider text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','dispatcher','driver','leased')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','removed')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_id uuid,
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);
GRANT SELECT ON public.company_members TO authenticated;
GRANT ALL ON public.company_members TO service_role;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.company_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('dispatcher','driver','leased')),
  email text,
  expires_at timestamptz NOT NULL,
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses BETWEEN 1 AND 200),
  used_count integer NOT NULL DEFAULT 0,
  requires_approval boolean NOT NULL DEFAULT true,
  revoked boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.company_invites TO authenticated;
GRANT ALL ON public.company_invites TO service_role;
ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER touch_companies BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_company_members BEFORE UPDATE ON public.company_members
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ MEMBERSHIP HELPERS (recursion-safe) ============
CREATE OR REPLACE FUNCTION private.is_company_member(_company uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members m
    WHERE m.company_id = _company AND m.user_id = auth.uid() AND m.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION private.company_role(_company uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT m.role FROM public.company_members m
  WHERE m.company_id = _company AND m.user_id = auth.uid() AND m.status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.my_company_codes()
RETURNS SETOF text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT c.code FROM public.companies c
  JOIN public.company_members m ON m.company_id = c.id
  WHERE m.user_id = auth.uid() AND m.status = 'active';
$$;

-- The old helper trusted a code typed into the caller's own profile row.
CREATE OR REPLACE FUNCTION private.current_company_code()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT c.code FROM public.companies c
  JOIN public.company_members m ON m.company_id = c.id
  WHERE m.user_id = auth.uid() AND m.status = 'active'
  ORDER BY m.created_at LIMIT 1;
$$;

REVOKE ALL ON FUNCTION private.is_company_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.company_role(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.my_company_codes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_company_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.company_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.my_company_codes() TO authenticated, service_role;

-- ============ POLICIES: read-only for members, writes via routines ============
CREATE POLICY "companies read" ON public.companies FOR SELECT TO authenticated
  USING (private.is_company_member(id) OR created_by = auth.uid());

CREATE POLICY "members read" ON public.company_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_company_member(company_id));

CREATE POLICY "invites read" ON public.company_invites FOR SELECT TO authenticated
  USING (private.company_role(company_id) IN ('owner','dispatcher'));

-- ============ COMPANY-SCOPED DATA BY REAL MEMBERSHIP ============
DROP POLICY IF EXISTS "loads read" ON public.loads;
CREATE POLICY "loads read" ON public.loads FOR SELECT TO authenticated
  USING (
    posted_by = auth.uid()
    OR assigned_driver_id = auth.uid()
    OR (company_code IS NULL AND status = 'available')
    OR (company_code IS NOT NULL AND company_code IN (SELECT private.my_company_codes()))
  );

DROP POLICY IF EXISTS "vehicles read" ON public.vehicles;
CREATE POLICY "vehicles read" ON public.vehicles FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR (company_code IS NOT NULL AND company_code IN (SELECT private.my_company_codes()))
  );

-- ============ SERVER-CHECKED MEMBERSHIP ROUTINES ============
CREATE OR REPLACE FUNCTION public.company_code_gen(_len integer DEFAULT 6)
RETURNS text LANGUAGE sql VOLATILE SET search_path = public, pg_temp AS $$
  SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
    1 + floor(random() * 32)::int, 1), '')
  FROM generate_series(1, _len);
$$;
REVOKE ALL ON FUNCTION public.company_code_gen(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.company_code_gen(integer) TO service_role;

-- Create a fleet. The caller becomes its owner; the code is server-generated so
-- nobody can claim an existing company by guessing or supplying a code.
CREATE OR REPLACE FUNCTION public.company_create(_name text, _dot text DEFAULT NULL, _mc text DEFAULT NULL, _home_base text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user uuid := auth.uid();
  v_name text := btrim(coalesce(_name, ''));
  v_code text;
  v_id uuid;
  v_owned integer;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_signed_in'); END IF;
  IF length(v_name) < 2 OR length(v_name) > 80 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_name');
  END IF;
  SELECT count(*) INTO v_owned FROM public.company_members
    WHERE user_id = v_user AND role = 'owner' AND status = 'active';
  IF v_owned >= 3 THEN RETURN jsonb_build_object('ok', false, 'error', 'too_many_companies'); END IF;

  FOR i IN 1..8 LOOP
    v_code := public.company_code_gen(6);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.companies WHERE code = v_code);
    v_code := NULL;
  END LOOP;
  IF v_code IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'code_unavailable'); END IF;

  INSERT INTO public.companies (name, code, dot_number, mc_number, home_base, created_by)
  VALUES (v_name, v_code, nullif(btrim(coalesce(_dot,'')),''), nullif(btrim(coalesce(_mc,'')),''),
          nullif(btrim(coalesce(_home_base,'')),''), v_user)
  RETURNING id INTO v_id;

  INSERT INTO public.company_members (company_id, user_id, role, status, joined_at)
  VALUES (v_id, v_user, 'owner', 'active', now());

  RETURN jsonb_build_object('ok', true, 'company_id', v_id, 'code', v_code, 'name', v_name);
END;
$$;

-- Owners and dispatchers mint expiring invites. Roles are limited and the code
-- is server-generated.
CREATE OR REPLACE FUNCTION public.company_invite_create(_company uuid, _role text, _expires_hours integer DEFAULT 168, _max_uses integer DEFAULT 1, _email text DEFAULT NULL, _requires_approval boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user uuid := auth.uid();
  v_role text;
  v_code text;
  v_hours integer := least(greatest(coalesce(_expires_hours, 168), 1), 720);
  v_uses integer := least(greatest(coalesce(_max_uses, 1), 1), 200);
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_signed_in'); END IF;
  IF _role NOT IN ('dispatcher','driver','leased') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_role');
  END IF;
  v_role := private.company_role(_company);
  IF v_role IS NULL OR v_role NOT IN ('owner','dispatcher') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_permitted');
  END IF;
  IF _role = 'dispatcher' AND v_role <> 'owner' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'owner_only');
  END IF;

  FOR i IN 1..8 LOOP
    v_code := public.company_code_gen(8);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.company_invites WHERE code = v_code);
    v_code := NULL;
  END LOOP;
  IF v_code IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'code_unavailable'); END IF;

  INSERT INTO public.company_invites (company_id, code, role, email, expires_at, max_uses, requires_approval, created_by)
  VALUES (_company, v_code, _role, nullif(btrim(lower(coalesce(_email,''))),''),
          now() + make_interval(hours => v_hours), v_uses, coalesce(_requires_approval, true), v_user)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'invite_id', v_id, 'code', v_code,
                            'expires_at', now() + make_interval(hours => v_hours));
END;
$$;

CREATE OR REPLACE FUNCTION public.company_invite_revoke(_invite uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_company uuid; v_role text;
BEGIN
  SELECT company_id INTO v_company FROM public.company_invites WHERE id = _invite;
  IF v_company IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'unknown_invite'); END IF;
  v_role := private.company_role(v_company);
  IF v_role IS NULL OR v_role NOT IN ('owner','dispatcher') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_permitted');
  END IF;
  UPDATE public.company_invites SET revoked = true WHERE id = _invite;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Join with an invite code. Every check is server-side: unknown, revoked,
-- expired, used up, or addressed to another email is refused.
CREATE OR REPLACE FUNCTION public.company_join(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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
    SELECT lower(email) INTO v_email FROM public.profiles WHERE id = v_user;
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
END;
$$;

CREATE OR REPLACE FUNCTION public.company_member_decide(_member uuid, _approve boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_row public.company_members; v_role text;
BEGIN
  SELECT * INTO v_row FROM public.company_members WHERE id = _member;
  IF v_row.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'unknown_member'); END IF;
  v_role := private.company_role(v_row.company_id);
  IF v_role IS NULL OR v_role NOT IN ('owner','dispatcher') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_permitted');
  END IF;
  IF v_row.role = 'owner' THEN RETURN jsonb_build_object('ok', false, 'error', 'cannot_change_owner'); END IF;
  UPDATE public.company_members
     SET status = CASE WHEN _approve THEN 'active' ELSE 'removed' END,
         joined_at = CASE WHEN _approve THEN now() ELSE joined_at END
   WHERE id = _member;
  RETURN jsonb_build_object('ok', true, 'status', CASE WHEN _approve THEN 'active' ELSE 'removed' END);
END;
$$;

-- Leave a company yourself, or (as owner) remove somebody else.
CREATE OR REPLACE FUNCTION public.company_member_remove(_member uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_row public.company_members; v_role text; v_user uuid := auth.uid();
BEGIN
  SELECT * INTO v_row FROM public.company_members WHERE id = _member;
  IF v_row.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'unknown_member'); END IF;
  v_role := private.company_role(v_row.company_id);
  IF v_row.user_id <> v_user AND v_role <> 'owner' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_permitted');
  END IF;
  IF v_row.role = 'owner' AND (SELECT count(*) FROM public.company_members
        WHERE company_id = v_row.company_id AND role = 'owner' AND status = 'active') <= 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'last_owner');
  END IF;
  UPDATE public.company_members SET status = 'removed' WHERE id = _member;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.company_create(text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.company_invite_create(uuid, text, integer, integer, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.company_invite_revoke(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.company_join(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.company_member_decide(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.company_member_remove(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.company_create(text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.company_invite_create(uuid, text, integer, integer, text, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.company_invite_revoke(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.company_join(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.company_member_decide(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.company_member_remove(uuid) TO authenticated, service_role;

-- ============ REMOVE ONBOARDING TEST DATA ============
DELETE FROM public.vehicles WHERE owner_id IN (SELECT id FROM public.profiles WHERE email LIKE 'driver%@example.com');
DELETE FROM public.ai_credit_wallets WHERE user_id IN (SELECT id FROM public.profiles WHERE email LIKE 'driver%@example.com');
DELETE FROM public.profiles WHERE email LIKE 'driver%@example.com';