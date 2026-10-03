
CREATE OR REPLACE FUNCTION private.f_err(_code text) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$ SELECT jsonb_build_object('ok', false, 'error', _code) $$;

CREATE OR REPLACE FUNCTION private.f_event(_l public.freight_loads, _kind text, _from text, _to text, _reason text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.freight_load_events(company_id, load_id, actor, kind, from_value, to_value, reason, version, snapshot)
  VALUES (_l.company_id, _l.id, auth.uid(), _kind, _from, _to, _reason, _l.version, to_jsonb(_l));
  INSERT INTO public.freight_audit_log(company_id, actor, entity, entity_id, action, detail)
  VALUES (_l.company_id, auth.uid(), 'load', _l.id, _kind, jsonb_build_object('from', _from, 'to', _to, 'reason', _reason, 'version', _l.version));
$$;

-- Context: the caller's companies and granted roles
CREATE OR REPLACE FUNCTION public.freight_my_context() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('ok', true, 'companies', coalesce(jsonb_agg(x ORDER BY x->>'name'), '[]'::jsonb)) FROM (
    SELECT jsonb_build_object('id', c.id, 'name', c.name, 'business_type', c.business_type, 'status', m.status,
      'roles', coalesce((SELECT jsonb_agg(r.role ORDER BY r.role) FROM public.freight_member_roles r WHERE r.company_id = c.id AND r.user_id = auth.uid()), '[]'::jsonb)) x
    FROM public.company_members m JOIN public.companies c ON c.id = m.company_id
    WHERE m.user_id = auth.uid() AND m.status <> 'removed'
  ) s
$$;

CREATE OR REPLACE FUNCTION public.freight_company_create(_name text, _business_type text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_user uuid := auth.uid(); v_name text := btrim(coalesce(_name,'')); v_id uuid; v_code text; v_role text;
BEGIN
  IF v_user IS NULL THEN RETURN private.f_err('not_signed_in'); END IF;
  IF length(v_name) NOT BETWEEN 2 AND 80 THEN RETURN private.f_err('bad_name'); END IF;
  IF _business_type NOT IN ('carrier','broker','shipper','fleet','owner_operator') THEN RETURN private.f_err('bad_type'); END IF;
  IF (SELECT count(*) FROM public.freight_member_roles WHERE user_id = v_user AND role = 'admin') >= 5 THEN RETURN private.f_err('too_many_companies'); END IF;
  FOR i IN 1..8 LOOP
    v_code := public.company_code_gen(6);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.companies WHERE code = v_code);
  END LOOP;
  INSERT INTO public.companies(name, code, created_by, business_type) VALUES (v_name, v_code, v_user, _business_type) RETURNING id INTO v_id;
  INSERT INTO public.company_members(company_id, user_id, role, status, joined_at) VALUES (v_id, v_user, 'owner', 'active', now());
  INSERT INTO public.freight_member_roles(company_id, user_id, role, granted_by) VALUES (v_id, v_user, 'admin', v_user);
  v_role := CASE _business_type WHEN 'broker' THEN 'broker' WHEN 'shipper' THEN 'shipper' WHEN 'fleet' THEN 'fleet_owner' WHEN 'owner_operator' THEN 'driver' ELSE 'dispatcher' END;
  INSERT INTO public.freight_member_roles(company_id, user_id, role, granted_by) VALUES (v_id, v_user, v_role, v_user);
  IF v_role = 'driver' THEN INSERT INTO public.freight_driver_profiles(company_id, user_id) VALUES (v_id, v_user); END IF;
  PERFORM private.f_audit(v_id, 'company', v_id, 'created', jsonb_build_object('type', _business_type));
  RETURN jsonb_build_object('ok', true, 'company_id', v_id);
END $$;

CREATE OR REPLACE FUNCTION public.freight_invite_create(_company uuid, _email text, _role text, _hours integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE v_token text; v_email text := lower(btrim(coalesce(_email,'')));
BEGIN
  IF NOT private.f_has(_company, ARRAY['admin']) THEN RETURN private.f_err('not_permitted'); END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RETURN private.f_err('bad_email'); END IF;
  IF _role NOT IN ('admin','dispatcher','driver','fleet_owner','broker','shipper','finance') THEN RETURN private.f_err('bad_role'); END IF;
  IF _hours NOT BETWEEN 1 AND 336 THEN RETURN private.f_err('bad_expiry'); END IF;
  v_token := encode(gen_random_bytes(24), 'hex');
  INSERT INTO public.freight_invites(company_id, email, role, token_hash, expires_at, created_by)
  VALUES (_company, v_email, _role, encode(digest(v_token, 'sha256'), 'hex'), now() + make_interval(hours => _hours), auth.uid());
  PERFORM private.f_audit(_company, 'invite', NULL, 'created', jsonb_build_object('email', v_email, 'role', _role));
  RETURN jsonb_build_object('ok', true, 'token', v_token);
END $$;

CREATE OR REPLACE FUNCTION public.freight_invite_revoke(_invite uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v public.freight_invites;
BEGIN
  SELECT * INTO v FROM public.freight_invites WHERE id = _invite;
  IF v.id IS NULL OR NOT private.f_has(v.company_id, ARRAY['admin']) THEN RETURN private.f_err('not_permitted'); END IF;
  UPDATE public.freight_invites SET revoked = true WHERE id = _invite;
  PERFORM private.f_audit(v.company_id, 'invite', _invite, 'revoked', '{}');
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.freight_invite_accept(_token text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE v public.freight_invites; v_user uuid := auth.uid(); v_email text;
BEGIN
  IF v_user IS NULL THEN RETURN private.f_err('not_signed_in'); END IF;
  SELECT * INTO v FROM public.freight_invites WHERE token_hash = encode(digest(btrim(coalesce(_token,'')), 'sha256'), 'hex') FOR UPDATE;
  IF v.id IS NULL THEN RETURN private.f_err('unknown_code'); END IF;
  IF v.revoked THEN RETURN private.f_err('revoked'); END IF;
  IF v.used_at IS NOT NULL THEN RETURN private.f_err('used_up'); END IF;
  IF v.expires_at <= now() THEN RETURN private.f_err('expired'); END IF;
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_user AND email_confirmed_at IS NOT NULL;
  IF v_email IS DISTINCT FROM v.email THEN RETURN private.f_err('wrong_email'); END IF;
  INSERT INTO public.company_members(company_id, user_id, role, status, invited_by, joined_at)
  VALUES (v.company_id, v_user, CASE WHEN v.role = 'admin' THEN 'owner' WHEN v.role = 'dispatcher' THEN 'dispatcher' ELSE 'driver' END, 'active', v.created_by, now())
  ON CONFLICT (company_id, user_id) DO UPDATE SET status = 'active', joined_at = now();
  INSERT INTO public.freight_member_roles(company_id, user_id, role, granted_by) VALUES (v.company_id, v_user, v.role, v.created_by) ON CONFLICT DO NOTHING;
  IF v.role = 'driver' THEN INSERT INTO public.freight_driver_profiles(company_id, user_id) VALUES (v.company_id, v_user) ON CONFLICT DO NOTHING; END IF;
  UPDATE public.freight_invites SET used_at = now(), used_by = v_user WHERE id = v.id;
  PERFORM private.f_audit(v.company_id, 'invite', v.id, 'accepted', jsonb_build_object('role', v.role));
  RETURN jsonb_build_object('ok', true, 'company_id', v.company_id, 'role', v.role);
END $$;

CREATE OR REPLACE FUNCTION public.freight_role_revoke(_company uuid, _user uuid, _role text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT private.f_has(_company, ARRAY['admin']) THEN RETURN private.f_err('not_permitted'); END IF;
  IF _role = 'admin' AND (SELECT count(*) FROM public.freight_member_roles WHERE company_id = _company AND role = 'admin') <= 1 THEN RETURN private.f_err('last_admin'); END IF;
  DELETE FROM public.freight_member_roles WHERE company_id = _company AND user_id = _user AND role = _role;
  PERFORM private.f_audit(_company, 'role', _user, 'revoked', jsonb_build_object('role', _role));
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.freight_team(_company uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN NOT private.f_has(_company, ARRAY['admin','dispatcher','fleet_owner']) THEN private.f_err('not_permitted') ELSE
  jsonb_build_object('ok', true, 'members', coalesce((SELECT jsonb_agg(jsonb_build_object(
    'user_id', m.user_id, 'name', coalesce(d.display_name, p.full_name), 'email', p.email,
    'roles', (SELECT jsonb_agg(r.role) FROM public.freight_member_roles r WHERE r.company_id = _company AND r.user_id = m.user_id),
    'available', d.available, 'cdl_expires', d.cdl_expires, 'medical_expires', d.medical_expires, 'is_driver', d.user_id IS NOT NULL))
   FROM public.company_members m LEFT JOIN public.profiles p ON p.id = m.user_id
   LEFT JOIN public.freight_driver_profiles d ON d.company_id = _company AND d.user_id = m.user_id
   WHERE m.company_id = _company AND m.status = 'active'), '[]'::jsonb)) END
$$;

-- LOADS
CREATE OR REPLACE FUNCTION public.freight_load_save(_company uuid, _load uuid, _f jsonb, _expected_version integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE l public.freight_loads; v_ref text;
BEGIN
  IF NOT private.f_has(_company, ARRAY['admin','dispatcher','broker']) THEN RETURN private.f_err('not_permitted'); END IF;
  IF _f ? 'customer_id' AND nullif(_f->>'customer_id','') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.freight_customers WHERE id = (_f->>'customer_id')::uuid AND company_id = _company) THEN RETURN private.f_err('bad_customer'); END IF;
  IF _load IS NULL THEN
    v_ref := coalesce(nullif(btrim(_f->>'reference'),''), 'HFO-' || upper(substr(md5(random()::text), 1, 6)));
    INSERT INTO public.freight_loads(company_id, reference, created_by) VALUES (_company, v_ref, auth.uid()) RETURNING * INTO l;
  ELSE
    SELECT * INTO l FROM public.freight_loads WHERE id = _load AND company_id = _company FOR UPDATE;
    IF l.id IS NULL THEN RETURN private.f_err('not_found'); END IF;
    IF l.version <> _expected_version THEN RETURN private.f_err('stale_version'); END IF;
    IF l.status IN ('delivered','cancelled') THEN RETURN private.f_err('load_closed'); END IF;
    IF l.status NOT IN ('draft','tendered','countered') AND _f ? 'customer_id' AND (_f->>'customer_id')::uuid IS DISTINCT FROM l.customer_id THEN RETURN private.f_err('approval_required'); END IF;
  END IF;
  UPDATE public.freight_loads SET
    customer_id = CASE WHEN _f ? 'customer_id' THEN nullif(_f->>'customer_id','')::uuid ELSE customer_id END,
    origin = CASE WHEN _f ? 'origin' THEN nullif(btrim(_f->>'origin'),'') ELSE origin END,
    destination = CASE WHEN _f ? 'destination' THEN nullif(btrim(_f->>'destination'),'') ELSE destination END,
    pickup_at = CASE WHEN _f ? 'pickup_at' THEN nullif(_f->>'pickup_at','')::timestamptz ELSE pickup_at END,
    delivery_at = CASE WHEN _f ? 'delivery_at' THEN nullif(_f->>'delivery_at','')::timestamptz ELSE delivery_at END,
    equipment_type = CASE WHEN _f ? 'equipment_type' THEN nullif(btrim(_f->>'equipment_type'),'') ELSE equipment_type END,
    commodity = CASE WHEN _f ? 'commodity' THEN nullif(btrim(_f->>'commodity'),'') ELSE commodity END,
    weight_lb = CASE WHEN _f ? 'weight_lb' THEN nullif(_f->>'weight_lb','')::integer ELSE weight_lb END,
    contact_name = CASE WHEN _f ? 'contact_name' THEN nullif(btrim(_f->>'contact_name'),'') ELSE contact_name END,
    contact_phone = CASE WHEN _f ? 'contact_phone' THEN nullif(btrim(_f->>'contact_phone'),'') ELSE contact_phone END,
    notes = CASE WHEN _f ? 'notes' THEN nullif(btrim(_f->>'notes'),'') ELSE notes END,
    version = CASE WHEN _load IS NULL THEN 1 ELSE version + 1 END, updated_at = now()
  WHERE id = l.id RETURNING * INTO l;
  IF l.pickup_at IS NOT NULL AND l.delivery_at IS NOT NULL AND l.delivery_at <= l.pickup_at THEN RAISE EXCEPTION 'delivery_before_pickup'; END IF;
  IF _f ? 'customer_rate_cents' AND l.status IN ('draft','tendered','countered') AND private.f_has(_company, ARRAY['admin','broker','finance']) THEN
    INSERT INTO public.freight_load_financials(load_id, company_id, customer_rate_cents, carrier_pay_cents)
    VALUES (l.id, _company, nullif(_f->>'customer_rate_cents','')::bigint, nullif(_f->>'carrier_pay_cents','')::bigint)
    ON CONFLICT (load_id) DO UPDATE SET customer_rate_cents = excluded.customer_rate_cents, carrier_pay_cents = excluded.carrier_pay_cents, updated_at = now();
  END IF;
  PERFORM private.f_event(l, CASE WHEN _load IS NULL THEN 'created' ELSE 'edited' END, NULL, NULL, NULL);
  RETURN jsonb_build_object('ok', true, 'id', l.id, 'version', l.version);
EXCEPTION WHEN raise_exception THEN RETURN private.f_err(SQLERRM);
  WHEN invalid_text_representation OR invalid_datetime_format OR numeric_value_out_of_range OR check_violation THEN RETURN private.f_err('bad_input');
  WHEN unique_violation THEN RETURN private.f_err('duplicate_reference');
END $$;

CREATE OR REPLACE FUNCTION private.f_missing(l public.freight_loads) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT array_remove(ARRAY[
    CASE WHEN l.customer_id IS NULL THEN 'customer' END, CASE WHEN l.origin IS NULL THEN 'origin' END,
    CASE WHEN l.destination IS NULL THEN 'destination' END, CASE WHEN l.pickup_at IS NULL THEN 'pickup appointment' END,
    CASE WHEN l.delivery_at IS NULL THEN 'delivery appointment' END, CASE WHEN l.equipment_type IS NULL THEN 'equipment type' END,
    CASE WHEN l.commodity IS NULL THEN 'commodity' END, CASE WHEN l.weight_lb IS NULL THEN 'weight' END,
    CASE WHEN l.contact_name IS NULL THEN 'contact' END], NULL)
$$;

CREATE OR REPLACE FUNCTION private.f_do_assign(l public.freight_loads, _driver uuid, _truck uuid, _trailer uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_missing text[] := private.f_missing(l); d public.freight_driver_profiles; e public.freight_equipment;
BEGIN
  IF cardinality(v_missing) > 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'missing_fields', 'missing', to_jsonb(v_missing)); END IF;
  SELECT * INTO d FROM public.freight_driver_profiles WHERE company_id = l.company_id AND user_id = _driver FOR UPDATE;
  IF d.user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.freight_member_roles r JOIN public.company_members m ON m.company_id = r.company_id AND m.user_id = r.user_id AND m.status = 'active' WHERE r.company_id = l.company_id AND r.user_id = _driver AND r.role = 'driver') THEN RETURN private.f_err('driver_not_in_company'); END IF;
  IF NOT d.available THEN RETURN private.f_err('driver_unavailable'); END IF;
  IF d.cdl_expires IS NOT NULL AND d.cdl_expires < l.delivery_at::date THEN RETURN private.f_err('driver_cdl_expired'); END IF;
  IF d.medical_expires IS NOT NULL AND d.medical_expires < l.delivery_at::date THEN RETURN private.f_err('driver_medical_expired'); END IF;
  IF _truck IS NOT NULL THEN
    SELECT * INTO e FROM public.freight_equipment WHERE id = _truck AND company_id = l.company_id FOR UPDATE;
    IF e.id IS NULL OR e.kind <> 'truck' THEN RETURN private.f_err('bad_truck'); END IF;
    IF e.status IN ('maintenance','out_of_service') THEN RETURN private.f_err('truck_unavailable'); END IF;
    IF (e.insurance_expires IS NOT NULL AND e.insurance_expires < l.delivery_at::date) OR (e.registration_expires IS NOT NULL AND e.registration_expires < l.delivery_at::date) THEN RETURN private.f_err('truck_docs_expired'); END IF;
  END IF;
  IF _trailer IS NOT NULL THEN
    SELECT * INTO e FROM public.freight_equipment WHERE id = _trailer AND company_id = l.company_id FOR UPDATE;
    IF e.id IS NULL OR e.kind <> 'trailer' THEN RETURN private.f_err('bad_trailer'); END IF;
    IF e.status IN ('maintenance','out_of_service') THEN RETURN private.f_err('trailer_unavailable'); END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.freight_loads o WHERE o.company_id = l.company_id AND o.id <> l.id
      AND o.status IN ('assigned','in_transit') AND coalesce(o.op_status,'') <> 'delivered'
      AND (o.driver_id = _driver OR (_truck IS NOT NULL AND o.truck_id = _truck) OR (_trailer IS NOT NULL AND o.trailer_id = _trailer))
      AND tstzrange(o.pickup_at, o.delivery_at, '[]') && tstzrange(l.pickup_at, l.delivery_at, '[]')) THEN
    RETURN private.f_err('schedule_conflict');
  END IF;
  UPDATE public.freight_loads SET driver_id = _driver, truck_id = _truck, trailer_id = _trailer, status = 'assigned',
    op_status = 'assigned', driver_response = 'pending', driver_response_reason = NULL, version = version + 1, updated_at = now()
  WHERE id = l.id RETURNING * INTO l;
  PERFORM private.f_event(l, 'assigned', NULL, _driver::text, NULL);
  INSERT INTO public.freight_notifications(company_id, user_id, title, body, link) VALUES (l.company_id, _driver, 'New load assigned', l.reference || ': ' || l.origin || ' to ' || l.destination, '/driver');
  RETURN jsonb_build_object('ok', true, 'version', l.version);
END $$;

CREATE OR REPLACE FUNCTION public.freight_load_assign(_load uuid, _driver uuid, _truck uuid, _trailer uuid, _expected_version integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE l public.freight_loads;
BEGIN
  SELECT * INTO l FROM public.freight_loads WHERE id = _load FOR UPDATE;
  IF l.id IS NULL OR NOT private.f_has(l.company_id, ARRAY['admin','dispatcher']) THEN RETURN private.f_err('not_permitted'); END IF;
  IF l.version <> _expected_version THEN RETURN private.f_err('stale_version'); END IF;
  IF l.status IN ('delivered','cancelled','in_transit') THEN RETURN private.f_err('load_closed'); END IF;
  -- material change: an existing accepted driver can only be replaced through approval
  IF l.driver_id IS NOT NULL AND l.driver_id <> _driver AND coalesce(l.driver_response,'') <> 'declined' THEN RETURN private.f_err('approval_required'); END IF;
  RETURN private.f_do_assign(l, _driver, _truck, _trailer);
END $$;

CREATE OR REPLACE FUNCTION public.freight_driver_respond(_load uuid, _accept boolean, _reason text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE l public.freight_loads;
BEGIN
  SELECT * INTO l FROM public.freight_loads WHERE id = _load FOR UPDATE;
  IF l.id IS NULL OR l.driver_id IS DISTINCT FROM auth.uid() OR NOT private.f_has(l.company_id, ARRAY['driver']) THEN RETURN private.f_err('not_permitted'); END IF;
  IF l.driver_response <> 'pending' THEN RETURN private.f_err('already_answered'); END IF;
  IF NOT _accept AND length(btrim(coalesce(_reason,''))) < 3 THEN RETURN private.f_err('reason_required'); END IF;
  IF _accept THEN
    UPDATE public.freight_loads SET driver_response = 'accepted', version = version + 1, updated_at = now() WHERE id = _load RETURNING * INTO l;
  ELSE
    UPDATE public.freight_loads SET driver_response = 'declined', driver_response_reason = btrim(_reason), driver_id = NULL, truck_id = NULL, trailer_id = NULL,
      status = 'accepted', op_status = NULL, version = version + 1, updated_at = now() WHERE id = _load RETURNING * INTO l;
  END IF;
  PERFORM private.f_event(l, CASE WHEN _accept THEN 'driver_accepted' ELSE 'driver_declined' END, NULL, NULL, _reason);
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.freight_load_status(_load uuid, _to text, _reason text, _expected_version integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE l public.freight_loads; v_order text[] := ARRAY['assigned','en_route_pickup','arrived_pickup','loaded','en_route_delivery','arrived_delivery','delivered'];
  v_mgr boolean; v_from text; v_override boolean := false;
BEGIN
  SELECT * INTO l FROM public.freight_loads WHERE id = _load FOR UPDATE;
  IF l.id IS NULL THEN RETURN private.f_err('not_permitted'); END IF;
  v_mgr := private.f_has(l.company_id, ARRAY['admin','dispatcher']);
  IF NOT v_mgr AND NOT (l.driver_id = auth.uid() AND private.f_has(l.company_id, ARRAY['driver'])) THEN RETURN private.f_err('not_permitted'); END IF;
  IF l.version <> _expected_version THEN RETURN private.f_err('stale_version'); END IF;
  IF l.op_status IS NULL OR l.status NOT IN ('assigned','in_transit') THEN RETURN private.f_err('not_active'); END IF;
  IF NOT v_mgr AND l.driver_response <> 'accepted' THEN RETURN private.f_err('accept_first'); END IF;
  v_from := l.op_status;
  IF _to = 'exception' THEN
    IF length(btrim(coalesce(_reason,''))) < 3 THEN RETURN private.f_err('reason_required'); END IF;
    INSERT INTO public.freight_exceptions(company_id, load_id, raised_by, description) VALUES (l.company_id, l.id, auth.uid(), btrim(_reason));
  ELSIF v_from = 'exception' THEN
    IF NOT v_mgr THEN RETURN private.f_err('dispatcher_clears_exception'); END IF;
    IF array_position(v_order, _to) IS NULL THEN RETURN private.f_err('bad_status'); END IF;
  ELSE
    IF array_position(v_order, _to) IS DISTINCT FROM array_position(v_order, v_from) + 1 THEN RETURN private.f_err('out_of_order'); END IF;
  END IF;
  IF _to = 'delivered' THEN
    IF l.pod_document_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.freight_documents WHERE id = l.pod_document_id AND status IN ('stored','reviewed')) THEN
      IF NOT private.f_has(l.company_id, ARRAY['admin']) OR length(btrim(coalesce(_reason,''))) < 10 THEN RETURN private.f_err('pod_required'); END IF;
      v_override := true;
    END IF;
  END IF;
  UPDATE public.freight_loads SET op_status = _to,
    status = CASE WHEN _to = 'delivered' THEN 'delivered' WHEN _to IN ('loaded','en_route_delivery','arrived_delivery') THEN 'in_transit' ELSE status END,
    delivered_override_reason = CASE WHEN v_override THEN btrim(_reason) ELSE delivered_override_reason END,
    version = version + 1, updated_at = now()
  WHERE id = _load RETURNING * INTO l;
  PERFORM private.f_event(l, CASE WHEN v_override THEN 'delivered_pod_override' ELSE 'status' END, v_from, _to, _reason);
  RETURN jsonb_build_object('ok', true, 'version', l.version);
END $$;

CREATE OR REPLACE FUNCTION public.freight_commercial_status(_load uuid, _to text, _reason text, _expected_version integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE l public.freight_loads; v_from text;
BEGIN
  SELECT * INTO l FROM public.freight_loads WHERE id = _load FOR UPDATE;
  IF l.id IS NULL OR NOT private.f_has(l.company_id, ARRAY['admin','dispatcher','broker']) THEN RETURN private.f_err('not_permitted'); END IF;
  IF l.version <> _expected_version THEN RETURN private.f_err('stale_version'); END IF;
  v_from := l.status;
  IF _to = 'cancelled' THEN RETURN private.f_err('approval_required'); END IF;
  IF NOT ((v_from = 'draft' AND _to = 'tendered') OR (v_from = 'tendered' AND _to IN ('accepted','countered')) OR (v_from = 'countered' AND _to IN ('tendered','accepted')) OR (v_from = 'tendered' AND _to = 'draft')) THEN RETURN private.f_err('out_of_order'); END IF;
  IF _to IN ('tendered','accepted') AND cardinality(private.f_missing(l)) > 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'missing_fields', 'missing', to_jsonb(private.f_missing(l))); END IF;
  UPDATE public.freight_loads SET status = _to, version = version + 1, updated_at = now() WHERE id = _load RETURNING * INTO l;
  PERFORM private.f_event(l, 'commercial', v_from, _to, _reason);
  RETURN jsonb_build_object('ok', true, 'version', l.version);
END $$;

CREATE OR REPLACE FUNCTION public.freight_exception_resolve(_exception uuid, _resolution text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE x public.freight_exceptions;
BEGIN
  SELECT * INTO x FROM public.freight_exceptions WHERE id = _exception FOR UPDATE;
  IF x.id IS NULL OR NOT private.f_has(x.company_id, ARRAY['admin','dispatcher']) THEN RETURN private.f_err('not_permitted'); END IF;
  IF x.resolved_at IS NOT NULL THEN RETURN private.f_err('already_resolved'); END IF;
  IF length(btrim(coalesce(_resolution,''))) < 3 THEN RETURN private.f_err('reason_required'); END IF;
  UPDATE public.freight_exceptions SET resolved_at = now(), resolved_by = auth.uid(), resolution = btrim(_resolution) WHERE id = _exception;
  PERFORM private.f_audit(x.company_id, 'exception', x.id, 'resolved', jsonb_build_object('resolution', _resolution));
  RETURN jsonb_build_object('ok', true);
END $$;

-- DOCUMENTS: register -> upload -> finalize (or abort)
CREATE OR REPLACE FUNCTION public.freight_doc_register(_company uuid, _load uuid, _equipment uuid, _driver uuid, _kind text, _file_name text, _mime text, _size integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid := gen_random_uuid(); v_path text; v_ver integer; v_mgr boolean := private.f_has(_company, ARRAY['admin','dispatcher','broker','fleet_owner']);
  v_ext text;
BEGIN
  IF NOT private.f_member(_company) THEN RETURN private.f_err('not_permitted'); END IF;
  IF NOT v_mgr THEN
    -- drivers: only own assigned loads, own driver docs
    IF _equipment IS NOT NULL THEN RETURN private.f_err('not_permitted'); END IF;
    IF _load IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.freight_loads WHERE id = _load AND company_id = _company AND driver_id = auth.uid()) THEN RETURN private.f_err('not_permitted'); END IF;
    IF _load IS NULL AND _driver IS DISTINCT FROM auth.uid() THEN RETURN private.f_err('not_permitted'); END IF;
  END IF;
  IF _mime NOT IN ('application/pdf','image/jpeg','image/png','image/webp','image/heic') THEN RETURN private.f_err('bad_type'); END IF;
  IF _size NOT BETWEEN 1 AND 15728640 THEN RETURN private.f_err('too_large'); END IF;
  v_ext := CASE _mime WHEN 'application/pdf' THEN 'pdf' WHEN 'image/jpeg' THEN 'jpg' WHEN 'image/png' THEN 'png' WHEN 'image/webp' THEN 'webp' ELSE 'heic' END;
  SELECT coalesce(max(version),0) + 1 INTO v_ver FROM public.freight_documents WHERE company_id = _company AND kind = _kind
    AND load_id IS NOT DISTINCT FROM _load AND equipment_id IS NOT DISTINCT FROM _equipment AND driver_user_id IS NOT DISTINCT FROM _driver;
  v_path := _company::text || '/' || coalesce(_load::text, 'general') || '/' || v_id::text || '.' || v_ext;
  INSERT INTO public.freight_documents(id, company_id, load_id, equipment_id, driver_user_id, kind, storage_path, file_name, mime_type, size_bytes, version, uploaded_by)
  VALUES (v_id, _company, _load, _equipment, _driver, _kind, v_path, left(coalesce(_file_name,'file'), 160), _mime, _size, v_ver, auth.uid());
  RETURN jsonb_build_object('ok', true, 'id', v_id, 'path', v_path, 'version', v_ver);
EXCEPTION WHEN check_violation OR foreign_key_violation THEN RETURN private.f_err('bad_input');
END $$;

CREATE OR REPLACE FUNCTION public.freight_doc_finalize(_doc uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage, pg_temp AS $$
DECLARE d public.freight_documents; l public.freight_loads;
BEGIN
  SELECT * INTO d FROM public.freight_documents WHERE id = _doc FOR UPDATE;
  IF d.id IS NULL OR d.uploaded_by <> auth.uid() THEN RETURN private.f_err('not_permitted'); END IF;
  IF d.status <> 'pending' THEN RETURN private.f_err('already_final'); END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'freight-docs' AND o.name = d.storage_path) THEN RETURN private.f_err('file_missing'); END IF;
  UPDATE public.freight_documents SET status = 'stored' WHERE id = _doc;
  IF d.kind = 'pod' AND d.load_id IS NOT NULL THEN
    UPDATE public.freight_loads SET pod_document_id = d.id, version = version + 1, updated_at = now() WHERE id = d.load_id RETURNING * INTO l;
    PERFORM private.f_event(l, 'pod_stored', NULL, d.id::text, NULL);
  ELSIF d.load_id IS NOT NULL THEN
    SELECT * INTO l FROM public.freight_loads WHERE id = d.load_id;
    PERFORM private.f_audit(d.company_id, 'document', d.id, 'stored', jsonb_build_object('kind', d.kind, 'load', d.load_id));
  ELSE
    PERFORM private.f_audit(d.company_id, 'document', d.id, 'stored', jsonb_build_object('kind', d.kind));
  END IF;
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.freight_doc_abort(_doc uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  DELETE FROM public.freight_documents WHERE id = _doc AND uploaded_by = auth.uid() AND status = 'pending';
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.freight_doc_review(_doc uuid, _approve boolean, _note text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE d public.freight_documents;
BEGIN
  SELECT * INTO d FROM public.freight_documents WHERE id = _doc FOR UPDATE;
  IF d.id IS NULL OR NOT private.f_has(d.company_id, ARRAY['admin','dispatcher','broker','fleet_owner']) THEN RETURN private.f_err('not_permitted'); END IF;
  IF d.status <> 'stored' THEN RETURN private.f_err('not_reviewable'); END IF;
  UPDATE public.freight_documents SET status = CASE WHEN _approve THEN 'reviewed' ELSE 'rejected' END WHERE id = _doc;
  INSERT INTO public.freight_document_reviews(company_id, document_id, reviewer, decision, note) VALUES (d.company_id, d.id, auth.uid(), CASE WHEN _approve THEN 'approved' ELSE 'rejected' END, _note);
  IF NOT _approve AND d.kind = 'pod' THEN UPDATE public.freight_loads SET pod_document_id = NULL WHERE id = d.load_id AND pod_document_id = d.id AND status <> 'delivered'; END IF;
  PERFORM private.f_audit(d.company_id, 'document', d.id, CASE WHEN _approve THEN 'approved' ELSE 'rejected' END, jsonb_build_object('note', _note));
  RETURN jsonb_build_object('ok', true);
END $$;

-- FINANCE drafts
CREATE OR REPLACE FUNCTION public.freight_invoice_draft(_load uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE l public.freight_loads; f public.freight_load_financials; v_id uuid;
BEGIN
  SELECT * INTO l FROM public.freight_loads WHERE id = _load;
  IF l.id IS NULL OR NOT private.f_has(l.company_id, ARRAY['admin','finance','broker']) THEN RETURN private.f_err('not_permitted'); END IF;
  IF l.status <> 'delivered' THEN RETURN private.f_err('not_delivered'); END IF;
  SELECT * INTO f FROM public.freight_load_financials WHERE load_id = _load;
  IF f.customer_rate_cents IS NULL THEN RETURN private.f_err('no_rate'); END IF;
  IF EXISTS (SELECT 1 FROM public.freight_invoices WHERE load_id = _load AND status <> 'void') THEN RETURN private.f_err('already_invoiced'); END IF;
  INSERT INTO public.freight_invoices(company_id, load_id, customer_id, number, amount_cents, due_on, created_by)
  VALUES (l.company_id, l.id, l.customer_id, 'INV-' || l.reference, f.customer_rate_cents, current_date + 30, auth.uid()) RETURNING id INTO v_id;
  PERFORM private.f_audit(l.company_id, 'invoice', v_id, 'drafted', jsonb_build_object('load', l.id));
  RETURN jsonb_build_object('ok', true, 'id', v_id);
END $$;

CREATE OR REPLACE FUNCTION public.freight_settlement_draft(_company uuid, _driver uuid, _start date, _end date, _amount_cents bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT private.f_has(_company, ARRAY['admin','finance']) THEN RETURN private.f_err('not_permitted'); END IF;
  IF _amount_cents IS NULL OR _amount_cents < 0 OR _end < _start THEN RETURN private.f_err('bad_input'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.freight_driver_profiles WHERE company_id = _company AND user_id = _driver) THEN RETURN private.f_err('driver_not_in_company'); END IF;
  INSERT INTO public.freight_settlements(company_id, driver_user_id, period_start, period_end, amount_cents, created_by)
  VALUES (_company, _driver, _start, _end, _amount_cents, auth.uid()) RETURNING id INTO v_id;
  PERFORM private.f_audit(_company, 'settlement', v_id, 'drafted', '{}');
  RETURN jsonb_build_object('ok', true, 'id', v_id);
END $$;

-- APPROVALS: immutable payload + version, separate approver, single execution
CREATE OR REPLACE FUNCTION public.freight_approval_request(_company uuid, _action text, _load uuid, _payload jsonb, _reason text, _why text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE v_ver integer; v_hash text; v_id uuid;
BEGIN
  IF NOT private.f_has(_company, ARRAY['admin','dispatcher','broker','finance','fleet_owner']) THEN RETURN private.f_err('not_permitted'); END IF;
  IF _load IS NOT NULL THEN
    SELECT version INTO v_ver FROM public.freight_loads WHERE id = _load AND company_id = _company;
    IF v_ver IS NULL THEN RETURN private.f_err('not_found'); END IF;
  END IF;
  v_hash := encode(digest(_action || '|' || coalesce(_load::text,'') || '|' || coalesce(v_ver::text,'') || '|' || _payload::text, 'sha256'), 'hex');
  INSERT INTO public.freight_approvals(company_id, action, load_id, target_version, payload, payload_hash, reason, why, requested_by)
  VALUES (_company, _action, _load, v_ver, _payload, v_hash, _reason, _why, auth.uid()) RETURNING id INTO v_id;
  PERFORM private.f_audit(_company, 'approval', v_id, 'requested', jsonb_build_object('action', _action));
  RETURN jsonb_build_object('ok', true, 'id', v_id);
EXCEPTION WHEN unique_violation THEN RETURN private.f_err('duplicate_request');
  WHEN check_violation THEN RETURN private.f_err('bad_action');
END $$;

CREATE OR REPLACE FUNCTION public.freight_approval_decide(_approval uuid, _approve boolean, _note text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE a public.freight_approvals; l public.freight_loads; r jsonb; p jsonb; v_need text[];
BEGIN
  SELECT * INTO a FROM public.freight_approvals WHERE id = _approval FOR UPDATE;
  IF a.id IS NULL THEN RETURN private.f_err('not_found'); END IF;
  v_need := CASE WHEN a.action IN ('invoice','settlement','payment') THEN ARRAY['admin','finance'] ELSE ARRAY['admin'] END;
  IF NOT private.f_has(a.company_id, v_need) THEN RETURN private.f_err('not_permitted'); END IF;
  IF a.requested_by = auth.uid() THEN RETURN private.f_err('self_approval'); END IF;
  IF a.status <> 'pending' THEN RETURN private.f_err('already_decided'); END IF;
  IF NOT _approve THEN
    UPDATE public.freight_approvals SET status = 'rejected', decided_by = auth.uid(), decided_at = now(), error = _note WHERE id = a.id;
    PERFORM private.f_audit(a.company_id, 'approval', a.id, 'rejected', jsonb_build_object('note', _note));
    RETURN jsonb_build_object('ok', true, 'status', 'rejected');
  END IF;
  IF a.load_id IS NOT NULL THEN
    SELECT * INTO l FROM public.freight_loads WHERE id = a.load_id FOR UPDATE;
    IF l.version <> a.target_version THEN
      UPDATE public.freight_approvals SET status = 'stale', decided_by = auth.uid(), decided_at = now() WHERE id = a.id;
      RETURN private.f_err('stale');
    END IF;
  END IF;
  p := a.payload;
  IF a.action = 'reassign' THEN
    r := private.f_do_assign(l, (p->>'driver_id')::uuid, nullif(p->>'truck_id','')::uuid, nullif(p->>'trailer_id','')::uuid);
  ELSIF a.action = 'rate_change' THEN
    INSERT INTO public.freight_load_financials(load_id, company_id, customer_rate_cents, carrier_pay_cents, rate_confirmed)
    VALUES (l.id, l.company_id, (p->>'customer_rate_cents')::bigint, nullif(p->>'carrier_pay_cents','')::bigint, true)
    ON CONFLICT (load_id) DO UPDATE SET customer_rate_cents = excluded.customer_rate_cents, carrier_pay_cents = excluded.carrier_pay_cents, rate_confirmed = true, updated_at = now();
    UPDATE public.freight_loads SET version = version + 1 WHERE id = l.id RETURNING * INTO l;
    PERFORM private.f_event(l, 'rate_change', NULL, p->>'customer_rate_cents', a.reason);
    r := jsonb_build_object('ok', true);
  ELSIF a.action = 'cancel_load' THEN
    UPDATE public.freight_loads SET status = 'cancelled', op_status = NULL, version = version + 1 WHERE id = l.id RETURNING * INTO l;
    PERFORM private.f_event(l, 'cancelled', NULL, 'cancelled', a.reason);
    r := jsonb_build_object('ok', true);
  ELSIF a.action = 'carrier_booking' THEN
    IF NOT EXISTS (SELECT 1 FROM public.freight_carriers WHERE id = (p->>'carrier_id')::uuid AND company_id = a.company_id AND verification_status = 'verified') THEN r := private.f_err('carrier_not_verified');
    ELSE
      INSERT INTO public.freight_load_financials(load_id, company_id, carrier_pay_cents, rate_confirmed) VALUES (l.id, l.company_id, (p->>'carrier_pay_cents')::bigint, true)
      ON CONFLICT (load_id) DO UPDATE SET carrier_pay_cents = excluded.carrier_pay_cents, rate_confirmed = true, updated_at = now();
      UPDATE public.freight_loads SET status = 'accepted', version = version + 1 WHERE id = l.id RETURNING * INTO l;
      PERFORM private.f_event(l, 'carrier_booked', NULL, p->>'carrier_id', a.reason);
      r := jsonb_build_object('ok', true);
    END IF;
  ELSIF a.action = 'customer_message' THEN
    INSERT INTO public.freight_messages(company_id, conversation_id, author, body) VALUES (a.company_id, (p->>'conversation_id')::uuid, a.requested_by, p->>'body');
    r := jsonb_build_object('ok', true);
  ELSIF a.action = 'invoice' THEN
    UPDATE public.freight_invoices SET status = 'approved' WHERE id = (p->>'invoice_id')::uuid AND company_id = a.company_id AND status = 'draft';
    r := CASE WHEN FOUND THEN jsonb_build_object('ok', true) ELSE private.f_err('invoice_not_draft') END;
  ELSIF a.action = 'settlement' THEN
    UPDATE public.freight_settlements SET status = 'approved' WHERE id = (p->>'settlement_id')::uuid AND company_id = a.company_id AND status = 'draft';
    r := CASE WHEN FOUND THEN jsonb_build_object('ok', true) ELSE private.f_err('settlement_not_draft') END;
  ELSIF a.action = 'payment' THEN
    INSERT INTO public.freight_payment_records(company_id, invoice_id, settlement_id, amount_cents, method, reference, recorded_by)
    VALUES (a.company_id, nullif(p->>'invoice_id','')::uuid, nullif(p->>'settlement_id','')::uuid, (p->>'amount_cents')::bigint, coalesce(p->>'method','manual_other'), p->>'reference', auth.uid());
    UPDATE public.freight_invoices SET status = 'paid' WHERE id = nullif(p->>'invoice_id','')::uuid AND company_id = a.company_id;
    UPDATE public.freight_settlements SET status = 'paid' WHERE id = nullif(p->>'settlement_id','')::uuid AND company_id = a.company_id;
    r := jsonb_build_object('ok', true);
  ELSIF a.action = 'compliance' THEN
    r := public.freight_doc_review((p->>'document_id')::uuid, coalesce((p->>'approve')::boolean, true), a.reason);
  END IF;
  IF coalesce((r->>'ok')::boolean, false) THEN
    UPDATE public.freight_approvals SET status = 'executed', decided_by = auth.uid(), decided_at = now(), executed_at = now() WHERE id = a.id;
  ELSE
    UPDATE public.freight_approvals SET status = 'failed', decided_by = auth.uid(), decided_at = now(), error = r->>'error' WHERE id = a.id;
  END IF;
  PERFORM private.f_audit(a.company_id, 'approval', a.id, CASE WHEN (r->>'ok')::boolean THEN 'executed' ELSE 'failed' END, r);
  RETURN r;
END $$;

-- AUTOMATION (assistive only: creates review items, never acts)
CREATE OR REPLACE FUNCTION public.freight_rule_set(_company uuid, _kind text, _enabled boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT private.f_has(_company, ARRAY['admin','dispatcher']) THEN RETURN private.f_err('not_permitted'); END IF;
  INSERT INTO public.freight_automation_rules(company_id, kind, name, owner_id, enabled, approval_required)
  VALUES (_company, _kind, initcap(replace(_kind,'_',' ')), auth.uid(), _enabled, true)
  ON CONFLICT (company_id, kind) DO UPDATE SET enabled = _enabled, owner_id = auth.uid();
  PERFORM private.f_audit(_company, 'automation_rule', NULL, CASE WHEN _enabled THEN 'enabled' ELSE 'disabled' END, jsonb_build_object('kind', _kind));
  RETURN jsonb_build_object('ok', true);
EXCEPTION WHEN check_violation THEN RETURN private.f_err('bad_kind');
END $$;

CREATE OR REPLACE FUNCTION public.freight_automation_scan(_company uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r public.freight_automation_rules; n integer := 0; c integer;
BEGIN
  IF NOT private.f_has(_company, ARRAY['admin','dispatcher']) THEN RETURN private.f_err('not_permitted'); END IF;
  FOR r IN SELECT * FROM public.freight_automation_rules WHERE company_id = _company AND enabled LOOP
    IF r.kind = 'missing_fields' THEN
      INSERT INTO public.freight_automation_runs(company_id, rule_id, load_id, title, why, dedupe_key)
      SELECT _company, r.id, l.id, l.reference || ' is missing ' || array_to_string(private.f_missing(l), ', '),
        'Loads cannot be tendered or assigned until every required field is filled.', 'mf:' || l.id || ':' || l.version
      FROM public.freight_loads l WHERE l.company_id = _company AND l.status IN ('draft','tendered','countered','accepted') AND cardinality(private.f_missing(l)) > 0
      ON CONFLICT DO NOTHING;
    ELSIF r.kind = 'missing_pod' THEN
      INSERT INTO public.freight_automation_runs(company_id, rule_id, load_id, title, why, dedupe_key)
      SELECT _company, r.id, l.id, l.reference || ' has arrived at delivery with no POD', 'Delivery cannot be closed without a stored proof of delivery.', 'pod:' || l.id
      FROM public.freight_loads l WHERE l.company_id = _company AND l.op_status = 'arrived_delivery' AND l.pod_document_id IS NULL
      ON CONFLICT DO NOTHING;
    ELSIF r.kind = 'appointment_soon' THEN
      INSERT INTO public.freight_automation_runs(company_id, rule_id, load_id, title, why, dedupe_key)
      SELECT _company, r.id, l.id, l.reference || ' pickup within 4 hours with no driver acceptance', 'Pickup appointment is ' || to_char(l.pickup_at AT TIME ZONE 'UTC', 'Mon DD HH24:MI') || ' UTC and the driver has not accepted.', 'appt:' || l.id || ':' || l.version
      FROM public.freight_loads l WHERE l.company_id = _company AND l.pickup_at BETWEEN now() AND now() + interval '4 hours' AND coalesce(l.driver_response,'') <> 'accepted' AND l.status NOT IN ('cancelled','delivered')
      ON CONFLICT DO NOTHING;
    ELSIF r.kind = 'late_risk' THEN
      INSERT INTO public.freight_automation_runs(company_id, rule_id, load_id, title, why, dedupe_key)
      SELECT _company, r.id, l.id, l.reference || ' is past its delivery appointment', 'Delivery appointment passed while status is ' || replace(l.op_status,'_',' ') || '.', 'late:' || l.id
      FROM public.freight_loads l WHERE l.company_id = _company AND l.delivery_at < now() AND l.status IN ('assigned','in_transit')
      ON CONFLICT DO NOTHING;
    ELSIF r.kind = 'doc_expiry' THEN
      INSERT INTO public.freight_automation_runs(company_id, rule_id, title, why, dedupe_key)
      SELECT _company, r.id, 'Unit ' || e.unit_number || ' paperwork expires soon', 'Insurance, registration, permit or inspection date is within 30 days.', 'eq:' || e.id || ':' || current_date
      FROM public.freight_equipment e WHERE e.company_id = _company AND least(e.insurance_expires, e.registration_expires, e.permit_expires, e.inspection_expires) < current_date + 30
      ON CONFLICT DO NOTHING;
    ELSIF r.kind = 'driver_suggestion' THEN
      INSERT INTO public.freight_automation_runs(company_id, rule_id, load_id, title, why, dedupe_key)
      SELECT _company, r.id, l.id, l.reference || ': ' || count(d.user_id) || ' available driver(s) with no conflicting load',
        'Counted drivers marked available whose current assignments do not overlap this load''s pickup-to-delivery window. Assignment still needs a dispatcher.', 'sug:' || l.id || ':' || l.version
      FROM public.freight_loads l JOIN public.freight_driver_profiles d ON d.company_id = l.company_id AND d.available
      WHERE l.company_id = _company AND l.status = 'accepted' AND l.driver_id IS NULL AND cardinality(private.f_missing(l)) = 0
        AND NOT EXISTS (SELECT 1 FROM public.freight_loads o WHERE o.driver_id = d.user_id AND o.status IN ('assigned','in_transit') AND tstzrange(o.pickup_at,o.delivery_at,'[]') && tstzrange(l.pickup_at,l.delivery_at,'[]'))
      GROUP BY l.id, l.reference, l.version
      ON CONFLICT DO NOTHING;
    END IF;
    GET DIAGNOSTICS c = ROW_COUNT; n := n + c;
  END LOOP;
  PERFORM private.f_audit(_company, 'automation', NULL, 'scan', jsonb_build_object('created', n));
  RETURN jsonb_build_object('ok', true, 'created', n);
END $$;

CREATE OR REPLACE FUNCTION public.freight_run_review(_run uuid, _status text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE x public.freight_automation_runs;
BEGIN
  SELECT * INTO x FROM public.freight_automation_runs WHERE id = _run FOR UPDATE;
  IF x.id IS NULL OR NOT private.f_has(x.company_id, ARRAY['admin','dispatcher']) THEN RETURN private.f_err('not_permitted'); END IF;
  IF _status NOT IN ('open','dismissed','done') THEN RETURN private.f_err('bad_status'); END IF;
  UPDATE public.freight_automation_runs SET status = _status, reviewed_by = auth.uid(), reviewed_at = now() WHERE id = _run;
  PERFORM private.f_audit(x.company_id, 'automation_run', x.id, 'review_' || _status, '{}');
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.freight_driver_profile_upsert(_company uuid, _user uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT private.f_has(_company, ARRAY['admin','fleet_owner']) THEN RETURN private.f_err('not_permitted'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.freight_member_roles WHERE company_id = _company AND user_id = _user AND role = 'driver') THEN RETURN private.f_err('not_a_driver'); END IF;
  INSERT INTO public.freight_driver_profiles(company_id, user_id) VALUES (_company, _user) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('ok', true);
END $$;

DO $$ DECLARE f text; BEGIN
  FOR f IN SELECT p.oid::regprocedure::text FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname LIKE 'freight\_%' LOOP
    EXECUTE 'REVOKE ALL ON FUNCTION ' || f || ' FROM PUBLIC, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION ' || f || ' TO authenticated';
  END LOOP;
  FOR f IN SELECT p.oid::regprocedure::text FROM pg_proc p WHERE p.pronamespace = 'private'::regnamespace AND p.proname IN ('f_event','f_audit','f_do_assign','f_missing','f_err') LOOP
    EXECUTE 'REVOKE ALL ON FUNCTION ' || f || ' FROM PUBLIC, anon, authenticated';
  END LOOP;
END $$;
