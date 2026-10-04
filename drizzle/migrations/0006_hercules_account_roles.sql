CREATE TYPE public.hercules_role AS ENUM ('driver','dispatcher','broker','shipper','fleet_manager','finance','company_admin','platform_admin');

CREATE TABLE public.hercules_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.hercules_role NOT NULL,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.hercules_user_roles TO authenticated;
GRANT ALL ON public.hercules_user_roles TO service_role;
ALTER TABLE public.hercules_user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles read" ON public.hercules_user_roles FOR SELECT TO authenticated USING (user_id = (select auth.uid()));

CREATE TABLE public.hercules_active_role (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.hercules_role NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hercules_active_role TO authenticated;
GRANT ALL ON public.hercules_active_role TO service_role;
ALTER TABLE public.hercules_active_role ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own active role read" ON public.hercules_active_role FOR SELECT TO authenticated USING (user_id = (select auth.uid()));

CREATE TABLE public.hercules_access_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid,
  event text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hercules_access_audit TO authenticated;
GRANT ALL ON public.hercules_access_audit TO service_role;
ALTER TABLE public.hercules_access_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own audit read" ON public.hercules_access_audit FOR SELECT TO authenticated USING (user_id = (select auth.uid()));

CREATE OR REPLACE FUNCTION public.hercules_has_role(_user uuid, _role public.hercules_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.hercules_user_roles WHERE user_id = _user AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.hercules_has_any_role(_user uuid, _roles public.hercules_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.hercules_user_roles WHERE user_id = _user AND role = ANY(_roles))
$$;

-- Onboarding: exactly one role from the sign-up door. Platform admin is never granted here.
CREATE OR REPLACE FUNCTION public.hercules_onboarding_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.hercules_role;
BEGIN
  r := CASE NEW.account_kind WHEN 'zeusFleet' THEN 'company_admin'::public.hercules_role ELSE 'driver'::public.hercules_role END;
  INSERT INTO public.hercules_user_roles (user_id, role) VALUES (NEW.id, r) ON CONFLICT DO NOTHING;
  INSERT INTO public.hercules_active_role (user_id, role) VALUES (NEW.id, r) ON CONFLICT DO NOTHING;
  INSERT INTO public.hercules_access_audit (user_id, event, detail) VALUES (NEW.id, 'role_assigned', jsonb_build_object('role', r, 'source', 'onboarding'));
  RETURN NEW;
END $$;
CREATE TRIGGER hercules_onboarding_role AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.hercules_onboarding_role();

-- Backfill existing accounts with their single onboarding role.
INSERT INTO public.hercules_user_roles (user_id, role)
SELECT id, CASE account_kind WHEN 'zeusFleet' THEN 'company_admin'::public.hercules_role ELSE 'driver'::public.hercules_role END FROM public.profiles
ON CONFLICT DO NOTHING;
INSERT INTO public.hercules_active_role (user_id, role)
SELECT id, CASE account_kind WHEN 'zeusFleet' THEN 'company_admin'::public.hercules_role ELSE 'driver'::public.hercules_role END FROM public.profiles
ON CONFLICT DO NOTHING;

-- Role switch: only among roles the caller actually holds.
CREATE OR REPLACE FUNCTION public.hercules_switch_role(_role public.hercules_role)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid := auth.uid();
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF NOT public.hercules_has_role(u, _role) THEN
    INSERT INTO public.hercules_access_audit (user_id, event, detail) VALUES (u, 'authorization_denied', jsonb_build_object('action','switch_role','role',_role));
    RETURN jsonb_build_object('ok', false, 'error', 'You do not hold that role');
  END IF;
  INSERT INTO public.hercules_active_role (user_id, role) VALUES (u, _role)
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, updated_at = now();
  INSERT INTO public.hercules_access_audit (user_id, event, detail) VALUES (u, 'role_switched', jsonb_build_object('role', _role));
  RETURN jsonb_build_object('ok', true, 'role', _role);
END $$;

-- Company admins grant/revoke non-platform roles only to active members of a company they own.
CREATE OR REPLACE FUNCTION public.hercules_role_set(_target uuid, _role public.hercules_role, _grant boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid := auth.uid();
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF _role = 'platform_admin' OR NOT public.hercules_has_role(u, 'company_admin') OR NOT EXISTS (
    SELECT 1 FROM public.companies c JOIN public.company_members m ON m.company_id = c.id
    WHERE m.user_id = _target AND m.status = 'active'
      AND (c.created_by = u OR EXISTS (SELECT 1 FROM public.company_members a WHERE a.company_id = c.id AND a.user_id = u AND a.status = 'active' AND a.role = 'owner'))
  ) THEN
    INSERT INTO public.hercules_access_audit (user_id, event, detail) VALUES (u, 'authorization_denied', jsonb_build_object('action','role_set','target',_target,'role',_role));
    RETURN jsonb_build_object('ok', false, 'error', 'Not allowed');
  END IF;
  IF _grant THEN
    INSERT INTO public.hercules_user_roles (user_id, role, granted_by) VALUES (_target, _role, u) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.hercules_user_roles WHERE user_id = _target AND role = _role;
    DELETE FROM public.hercules_active_role WHERE user_id = _target AND role = _role;
  END IF;
  INSERT INTO public.hercules_access_audit (user_id, event, detail) VALUES (u, CASE WHEN _grant THEN 'role_assigned' ELSE 'role_removed' END, jsonb_build_object('target',_target,'role',_role));
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.hercules_audit(_event text, _detail jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR _event NOT IN ('login','logout','authorization_denied') THEN RETURN; END IF;
  INSERT INTO public.hercules_access_audit (user_id, event, detail) VALUES (auth.uid(), _event, COALESCE(_detail, '{}'::jsonb));
END $$;

REVOKE ALL ON FUNCTION public.hercules_switch_role(public.hercules_role), public.hercules_role_set(uuid, public.hercules_role, boolean), public.hercules_audit(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hercules_switch_role(public.hercules_role), public.hercules_role_set(uuid, public.hercules_role, boolean), public.hercules_audit(text, jsonb), public.hercules_has_role(uuid, public.hercules_role), public.hercules_has_any_role(uuid, public.hercules_role[]) TO authenticated;

-- Server-side: posting loads needs a booking/dispatch role. Drivers cannot.
CREATE POLICY "loads insert requires role" ON public.loads AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.hercules_has_any_role((select auth.uid()), ARRAY['dispatcher','broker','fleet_manager','company_admin']::public.hercules_role[]));