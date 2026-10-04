CREATE TABLE public.hercules_verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.hercules_role_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  doc_type text NOT NULL CHECK (length(doc_type) BETWEEN 2 AND 120),
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type IN ('application/pdf','image/jpeg','image/png','image/webp')),
  size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  expires_on date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.hercules_verification_documents(request_id);
GRANT SELECT, INSERT ON public.hercules_verification_documents TO authenticated;
GRANT ALL ON public.hercules_verification_documents TO service_role;
ALTER TABLE public.hercules_verification_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vault read owner or admin" ON public.hercules_verification_documents FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.hercules_is_company_admin(auth.uid(), company_id));

CREATE POLICY "vault insert own open request" ON public.hercules_verification_documents FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND status = 'pending' AND reviewed_by IS NULL
  AND storage_path LIKE auth.uid()::text || '/' || request_id::text || '/%'
  AND EXISTS (SELECT 1 FROM public.hercules_role_requests r WHERE r.id = request_id AND r.user_id = auth.uid()
    AND r.company_id = hercules_verification_documents.company_id
    AND r.status IN ('not_started','documents_required','submitted','under_review','needs_correction'))
);

CREATE OR REPLACE FUNCTION public.hercules_vault_review(_doc uuid, _accept boolean, _note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.hercules_verification_documents;
BEGIN
  SELECT * INTO d FROM public.hercules_verification_documents WHERE id = _doc FOR UPDATE;
  IF d.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Document not found'); END IF;
  IF NOT public.hercules_is_company_admin(auth.uid(), d.company_id) THEN RETURN jsonb_build_object('ok', false, 'error', 'Only a company admin can review'); END IF;
  IF d.user_id = auth.uid() THEN RETURN jsonb_build_object('ok', false, 'error', 'You cannot review your own document'); END IF;
  IF NOT _accept AND length(coalesce(trim(_note),'')) < 3 THEN RETURN jsonb_build_object('ok', false, 'error', 'A reason is required to reject'); END IF;
  IF _accept AND d.expires_on IS NOT NULL AND d.expires_on < current_date THEN RETURN jsonb_build_object('ok', false, 'error', 'Document is expired'); END IF;
  UPDATE public.hercules_verification_documents SET status = CASE WHEN _accept THEN 'accepted' ELSE 'rejected' END,
    review_note = nullif(trim(_note),''), reviewed_by = auth.uid(), reviewed_at = now() WHERE id = _doc;
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.hercules_vault_review(uuid, boolean, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.hercules_vault_review(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.hercules_vault_verify_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE missing text;
BEGIN
  IF NEW.status = 'verified' AND OLD.status IS DISTINCT FROM 'verified' THEN
    SELECT string_agg(req, ', ') INTO missing FROM unnest(NEW.required_documents) req
    WHERE NOT EXISTS (SELECT 1 FROM public.hercules_verification_documents v
      WHERE v.request_id = NEW.id AND v.doc_type = req AND v.status = 'accepted'
        AND (v.expires_on IS NULL OR v.expires_on >= current_date));
    IF missing IS NOT NULL THEN RAISE EXCEPTION 'Accepted, unexpired documents still needed: %', missing; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER hercules_vault_verify_guard BEFORE UPDATE ON public.hercules_role_requests
FOR EACH ROW EXECUTE FUNCTION public.hercules_vault_verify_guard();

CREATE POLICY "vault upload own folder" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'verification-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "vault read owner or admin" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'verification-docs' AND (
  (storage.foldername(name))[1] = auth.uid()::text
  OR EXISTS (SELECT 1 FROM public.hercules_verification_documents v
    WHERE v.storage_path = storage.objects.name AND public.hercules_is_company_admin(auth.uid(), v.company_id))));