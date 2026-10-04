CREATE TABLE public.hercules_role_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role public.hercules_role NOT NULL,
  reason text NOT NULL,
  required_documents text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('not_started','documents_required','submitted','under_review','needs_correction','verified','approved','rejected','expired','suspended')),
  reviewer_id uuid,
  review_reason text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hercules_role_requests TO authenticated;
GRANT ALL ON public.hercules_role_requests TO service_role;
ALTER TABLE public.hercules_role_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.hercules_is_company_admin(_user uuid, _company uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.hercules_has_role(_user, 'company_admin') AND EXISTS (
    SELECT 1 FROM public.companies c WHERE c.id = _company AND (c.created_by = _user OR EXISTS (
      SELECT 1 FROM public.company_members a WHERE a.company_id = c.id AND a.user_id = _user AND a.status = 'active' AND a.role = 'owner')))
$$;

CREATE POLICY "Own or company admin can read role requests" ON public.hercules_role_requests
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.hercules_is_company_admin(auth.uid(), company_id));

CREATE OR REPLACE FUNCTION public.hercules_role_request_submit(_company uuid, _role public.hercules_role, _reason text, _docs text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid := auth.uid(); rid uuid;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF _role = 'platform_admin' THEN RETURN jsonb_build_object('ok', false, 'error', 'This role cannot be requested'); END IF;
  IF length(trim(coalesce(_reason,''))) < 5 THEN RETURN jsonb_build_object('ok', false, 'error', 'Please give a reason'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.company_members WHERE company_id = _company AND user_id = u AND status = 'active') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You are not an active member of that company'); END IF;
  IF public.hercules_has_role(u, _role) THEN RETURN jsonb_build_object('ok', false, 'error', 'You already hold this role'); END IF;
  IF EXISTS (SELECT 1 FROM public.hercules_role_requests WHERE user_id = u AND company_id = _company AND role = _role
    AND status IN ('not_started','documents_required','submitted','under_review','needs_correction','verified')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You already have an open request for this role'); END IF;
  INSERT INTO public.hercules_role_requests (user_id, company_id, role, reason, required_documents)
  VALUES (u, _company, _role, trim(_reason), coalesce(_docs, '{}')) RETURNING id INTO rid;
  INSERT INTO public.hercules_access_audit (user_id, event, detail) VALUES (u, 'role_requested', jsonb_build_object('request', rid, 'role', _role, 'company', _company));
  RETURN jsonb_build_object('ok', true, 'id', rid);
END $$;

CREATE OR REPLACE FUNCTION public.hercules_role_request_decide(_request uuid, _status text, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid := auth.uid(); r public.hercules_role_requests;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT * INTO r FROM public.hercules_role_requests WHERE id = _request FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Request not found'); END IF;
  IF r.user_id = u OR NOT public.hercules_is_company_admin(u, r.company_id) THEN
    INSERT INTO public.hercules_access_audit (user_id, event, detail) VALUES (u, 'authorization_denied', jsonb_build_object('action','role_request_decide','request',_request));
    RETURN jsonb_build_object('ok', false, 'error', 'Only a company admin other than the requester can review this');
  END IF;
  IF _status NOT IN ('documents_required','under_review','needs_correction','verified','approved','rejected','expired','suspended') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unknown status'); END IF;
  IF _status IN ('rejected','suspended','expired','needs_correction') AND length(trim(coalesce(_reason,''))) < 3 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'A reason is required'); END IF;
  IF _status = 'approved' AND r.status <> 'verified' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Mark documents verified before approving'); END IF;
  UPDATE public.hercules_role_requests SET status = _status, reviewer_id = u, review_reason = nullif(trim(coalesce(_reason,'')),''), updated_at = now() WHERE id = _request;
  IF _status = 'approved' THEN
    INSERT INTO public.hercules_user_roles (user_id, role, granted_by) VALUES (r.user_id, r.role, u) ON CONFLICT DO NOTHING;
  ELSIF _status IN ('rejected','suspended','expired') AND r.status = 'approved' THEN
    DELETE FROM public.hercules_user_roles WHERE user_id = r.user_id AND role = r.role;
    DELETE FROM public.hercules_active_role WHERE user_id = r.user_id AND role = r.role;
  END IF;
  INSERT INTO public.hercules_access_audit (user_id, event, detail) VALUES (u, 'role_request_' || _status,
    jsonb_build_object('request', _request, 'target', r.user_id, 'role', r.role, 'reason', _reason));
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE EXECUTE ON FUNCTION public.hercules_role_request_submit(uuid, public.hercules_role, text, text[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.hercules_role_request_decide(uuid, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.hercules_role_request_submit(uuid, public.hercules_role, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hercules_role_request_decide(uuid, text, text) TO authenticated;