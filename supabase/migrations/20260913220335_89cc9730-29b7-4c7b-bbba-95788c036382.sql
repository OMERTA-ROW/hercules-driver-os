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

  UPDATE public.loads
     SET status = 'booked', assigned_driver_id = v_user,
         vehicle_id = COALESCE(_vehicle, vehicle_id), updated_at = now()
   WHERE id = _load AND status = 'available' AND assigned_driver_id IS NULL;

  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'taken'); END IF;

  RETURN jsonb_build_object('ok', true, 'status', 'booked');
END; $function$;

REVOKE ALL ON FUNCTION public.load_book(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.load_book(uuid, uuid) TO authenticated, service_role;