create or replace function private.is_active_member(_code text)
returns boolean language sql stable security definer set search_path to 'public','pg_temp'
as $$
  select exists (
    select 1 from public.companies c
    join public.company_members m on m.company_id = c.id
    where c.code = _code and m.user_id = auth.uid() and m.status = 'active'
  );
$$;
revoke all on function private.is_active_member(text) from anon;

drop policy if exists "loads update" on public.loads;
create policy "loads update" on public.loads for update to authenticated
using (
  (company_code is null and (posted_by = auth.uid() or assigned_driver_id = auth.uid()))
  or (company_code is not null and (
        private.manages_code(company_code)
        or (assigned_driver_id = auth.uid() and private.is_active_member(company_code))
  ))
)
with check (
  (company_code is null and (posted_by = auth.uid() or assigned_driver_id = auth.uid()))
  or (company_code is not null and (
        private.manages_code(company_code)
        or (assigned_driver_id = auth.uid() and private.is_active_member(company_code))
  ))
);

create or replace function public.loads_guard()
returns trigger language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
DECLARE
  uid uuid := auth.uid();
  cid uuid;
  booking boolean := coalesce(current_setting('app.load_book', true), '') = '1';
  is_mgr boolean;
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

  -- Company loads: commercial / routing / assignment edits are manager-only.
  IF TG_OP = 'UPDATE' AND NOT booking
     AND (OLD.company_code IS NOT NULL OR NEW.company_code IS NOT NULL) THEN
    is_mgr := (NEW.company_code IS NOT NULL AND private.manages_code(NEW.company_code))
           OR (OLD.company_code IS NOT NULL AND private.manages_code(OLD.company_code));
    IF NOT is_mgr THEN
      -- Removed members cannot touch the load at all.
      IF OLD.company_code IS NULL OR NOT private.is_active_member(OLD.company_code) THEN
        RAISE EXCEPTION 'not_company_member';
      END IF;
      IF OLD.assigned_driver_id IS DISTINCT FROM uid THEN
        RAISE EXCEPTION 'not_company_manager';
      END IF;
      IF (to_jsonb(NEW) - 'status' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'updated_at') THEN
        RAISE EXCEPTION 'driver_may_only_update_status';
      END IF;
      IF NOT (
        (OLD.status = 'booked' AND NEW.status = 'in_transit')
        OR (OLD.status = 'in_transit' AND NEW.status = 'delivered')
        OR NEW.status = OLD.status
      ) THEN
        RAISE EXCEPTION 'status_transition_not_allowed';
      END IF;
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

  -- Vehicle must belong to the assigned driver whenever either side changes.
  IF NEW.vehicle_id IS NOT NULL
     AND (TG_OP = 'INSERT'
          OR NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id
          OR NEW.assigned_driver_id IS DISTINCT FROM OLD.assigned_driver_id) THEN
    IF NOT EXISTS (SELECT 1 FROM public.vehicles v
                    WHERE v.id = NEW.vehicle_id
                      AND v.owner_id = COALESCE(NEW.assigned_driver_id, uid)) THEN
      RAISE EXCEPTION 'vehicle_not_owned_by_driver';
    END IF;
  END IF;

  RETURN NEW;
END; $function$;

create or replace function public.vehicles_guard()
returns trigger language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN NEW; END IF;
  IF NEW.company_code IS NOT NULL THEN
    IF NOT private.is_active_member(NEW.company_code) THEN
      RAISE EXCEPTION 'not_company_member';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.company_code IS NOT NULL
     AND NEW.company_code IS DISTINCT FROM OLD.company_code
     AND NOT private.is_active_member(OLD.company_code) THEN
    RAISE EXCEPTION 'not_company_member';
  END IF;
  RETURN NEW;
END; $function$;

create or replace function public.load_book(_load uuid, _vehicle uuid default null)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
DECLARE
  v_user uuid := auth.uid();
  l public.loads;
  allowed boolean;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_signed_in'); END IF;

  SELECT * INTO l FROM public.loads WHERE id = _load FOR UPDATE;
  IF l.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'unknown_load'); END IF;

  allowed := l.company_code IS NULL
    OR EXISTS (SELECT 1 FROM private.my_company_codes() AS c WHERE c = l.company_code);
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

  PERFORM set_config('app.load_book', '1', true);

  UPDATE public.loads
     SET status = 'booked', assigned_driver_id = v_user,
         vehicle_id = COALESCE(_vehicle, vehicle_id), updated_at = now()
   WHERE id = _load AND status = 'available' AND assigned_driver_id IS NULL;

  PERFORM set_config('app.load_book', '0', true);

  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'taken'); END IF;

  RETURN jsonb_build_object('ok', true, 'status', 'booked');
END; $function$;