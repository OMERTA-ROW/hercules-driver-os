
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE public.freight_member_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('admin','dispatcher','driver','fleet_owner','broker','shipper','finance')),
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id, role)
);
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT 'carrier';
ALTER TABLE public.companies ADD CONSTRAINT companies_business_type_chk CHECK (business_type IN ('carrier','broker','shipper','fleet','owner_operator'));

CREATE OR REPLACE FUNCTION private.f_roles(_company uuid) RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(array_agg(r.role), '{}') FROM public.freight_member_roles r
  JOIN public.company_members m ON m.company_id = r.company_id AND m.user_id = r.user_id AND m.status = 'active'
  WHERE r.company_id = _company AND r.user_id = auth.uid()
$$;
CREATE OR REPLACE FUNCTION private.f_has(_company uuid, _roles text[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.f_roles(_company) && _roles
$$;
CREATE OR REPLACE FUNCTION private.f_member(_company uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cardinality(private.f_roles(_company)) > 0
$$;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.f_roles(uuid), private.f_has(uuid,text[]), private.f_member(uuid) TO authenticated;

GRANT SELECT ON public.freight_member_roles TO authenticated;
GRANT ALL ON public.freight_member_roles TO service_role;
ALTER TABLE public.freight_member_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles read" ON public.freight_member_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.f_has(company_id, ARRAY['admin']));

INSERT INTO public.freight_member_roles (company_id, user_id, role)
SELECT company_id, user_id, CASE role WHEN 'owner' THEN 'admin' WHEN 'dispatcher' THEN 'dispatcher' ELSE 'driver' END
FROM public.company_members WHERE status = 'active' ON CONFLICT DO NOTHING;

CREATE TABLE public.freight_audit_log (
  id bigserial PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor uuid,
  entity text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.freight_audit_log TO authenticated;
GRANT ALL ON public.freight_audit_log TO service_role;
ALTER TABLE public.freight_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit read" ON public.freight_audit_log FOR SELECT TO authenticated
  USING (private.f_has(company_id, ARRAY['admin','dispatcher','fleet_owner','broker']));
CREATE OR REPLACE FUNCTION private.f_audit(_company uuid, _entity text, _id uuid, _action text, _detail jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.freight_audit_log(company_id, actor, entity, entity_id, action, detail)
  VALUES (_company, auth.uid(), _entity, _id, _action, coalesce(_detail,'{}'))
$$;

CREATE TABLE public.freight_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin','dispatcher','driver','fleet_owner','broker','shipper','finance')),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by uuid,
  revoked boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT (id, company_id, email, role, expires_at, used_at, used_by, revoked, created_by, created_at) ON public.freight_invites TO authenticated;
GRANT ALL ON public.freight_invites TO service_role;
ALTER TABLE public.freight_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invites admin read" ON public.freight_invites FOR SELECT TO authenticated
  USING (private.f_has(company_id, ARRAY['admin']));

CREATE TABLE public.freight_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 120),
  kind text NOT NULL DEFAULT 'shipper' CHECK (kind IN ('shipper','consignee','broker','other')),
  linked_company_id uuid REFERENCES public.companies(id),
  contact_name text, contact_email text, contact_phone text, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, id)
);
CREATE TABLE public.freight_carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 120),
  mc_number text, dot_number text,
  verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','verified','rejected')),
  insurance_expires date,
  contact_name text, contact_email text, contact_phone text, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, id)
);

CREATE TABLE public.freight_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('truck','trailer')),
  unit_number text NOT NULL CHECK (length(btrim(unit_number)) BETWEEN 1 AND 40),
  equipment_type text,
  vin text, plate text,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','in_use','maintenance','out_of_service')),
  insurance_expires date, registration_expires date, permit_expires date, inspection_expires date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, id),
  UNIQUE (company_id, unit_number)
);
CREATE TABLE public.freight_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  equipment_id uuid NOT NULL,
  description text NOT NULL,
  scheduled_for date, completed_at date, cost_cents bigint,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, equipment_id) REFERENCES public.freight_equipment(company_id, id) ON DELETE CASCADE
);
CREATE TABLE public.freight_driver_profiles (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text, phone text, cdl_number text, cdl_state text,
  cdl_expires date, medical_expires date,
  available boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, user_id)
);

CREATE TABLE public.freight_loads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  reference text NOT NULL,
  customer_id uuid,
  shipper_company_id uuid REFERENCES public.companies(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','tendered','countered','accepted','assigned','in_transit','delivered','cancelled')),
  op_status text CHECK (op_status IN ('assigned','en_route_pickup','arrived_pickup','loaded','en_route_delivery','arrived_delivery','delivered','exception')),
  driver_response text CHECK (driver_response IN ('pending','accepted','declined')),
  driver_response_reason text,
  origin text, destination text,
  pickup_at timestamptz, delivery_at timestamptz,
  equipment_type text, commodity text, weight_lb integer CHECK (weight_lb IS NULL OR weight_lb BETWEEN 1 AND 200000),
  contact_name text, contact_phone text,
  notes text,
  driver_id uuid, truck_id uuid, trailer_id uuid,
  pod_document_id uuid,
  delivered_override_reason text,
  version integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, id),
  UNIQUE (company_id, reference),
  FOREIGN KEY (company_id, customer_id) REFERENCES public.freight_customers(company_id, id),
  FOREIGN KEY (company_id, truck_id) REFERENCES public.freight_equipment(company_id, id),
  FOREIGN KEY (company_id, trailer_id) REFERENCES public.freight_equipment(company_id, id),
  FOREIGN KEY (company_id, driver_id) REFERENCES public.freight_driver_profiles(company_id, user_id)
);
CREATE INDEX ON public.freight_loads(company_id, status);
CREATE INDEX ON public.freight_loads(driver_id);

CREATE TABLE public.freight_load_financials (
  load_id uuid PRIMARY KEY,
  company_id uuid NOT NULL,
  customer_rate_cents bigint, carrier_pay_cents bigint, driver_pay_cents bigint,
  rate_confirmed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, load_id) REFERENCES public.freight_loads(company_id, id) ON DELETE CASCADE
);
CREATE TABLE public.freight_load_events (
  id bigserial PRIMARY KEY,
  company_id uuid NOT NULL,
  load_id uuid NOT NULL,
  actor uuid,
  kind text NOT NULL,
  from_value text, to_value text, reason text,
  version integer NOT NULL,
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, load_id) REFERENCES public.freight_loads(company_id, id) ON DELETE CASCADE
);
CREATE TABLE public.freight_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  load_id uuid NOT NULL,
  raised_by uuid,
  description text NOT NULL,
  resolved_at timestamptz, resolved_by uuid, resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, load_id) REFERENCES public.freight_loads(company_id, id) ON DELETE CASCADE
);

CREATE TABLE public.freight_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  load_id uuid,
  equipment_id uuid,
  driver_user_id uuid,
  kind text NOT NULL CHECK (kind IN ('rate_confirmation','bol','pod','receipt','image','signature','issue','insurance','permit','registration','cdl','medical','other')),
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type IN ('application/pdf','image/jpeg','image/png','image/webp','image/heic')),
  size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 15728640),
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','stored','reviewed','rejected')),
  expires_on date,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id, load_id) REFERENCES public.freight_loads(company_id, id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, equipment_id) REFERENCES public.freight_equipment(company_id, id) ON DELETE CASCADE
);
ALTER TABLE public.freight_loads ADD FOREIGN KEY (company_id, pod_document_id) REFERENCES public.freight_documents(company_id, id);
CREATE TABLE public.freight_document_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  document_id uuid NOT NULL,
  reviewer uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved','rejected')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, document_id) REFERENCES public.freight_documents(company_id, id) ON DELETE CASCADE
);

CREATE TABLE public.freight_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  load_id uuid,
  subject text NOT NULL,
  driver_user_id uuid,
  shipper_visible boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id, load_id) REFERENCES public.freight_loads(company_id, id) ON DELETE CASCADE
);
CREATE TABLE public.freight_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  author uuid NOT NULL DEFAULT auth.uid(),
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, conversation_id) REFERENCES public.freight_conversations(company_id, id) ON DELETE CASCADE
);
CREATE TABLE public.freight_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL, body text, link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.freight_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  load_id uuid,
  customer_id uuid,
  number text NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','sent','paid','void')),
  due_on date,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, number),
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id, load_id) REFERENCES public.freight_loads(company_id, id),
  FOREIGN KEY (company_id, customer_id) REFERENCES public.freight_customers(company_id, id)
);
CREATE TABLE public.freight_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  driver_user_id uuid,
  carrier_id uuid,
  period_start date, period_end date,
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','paid','void')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id, carrier_id) REFERENCES public.freight_carriers(company_id, id)
);
CREATE TABLE public.freight_payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id uuid, settlement_id uuid,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  method text NOT NULL CHECK (method IN ('manual_check','manual_ach','manual_other')),
  reference text,
  recorded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, invoice_id) REFERENCES public.freight_invoices(company_id, id),
  FOREIGN KEY (company_id, settlement_id) REFERENCES public.freight_settlements(company_id, id)
);

CREATE TABLE public.freight_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('reassign','rate_change','carrier_booking','customer_message','invoice','settlement','payment','compliance','cancel_load')),
  load_id uuid,
  target_version integer,
  payload jsonb NOT NULL,
  payload_hash text NOT NULL,
  reason text,
  why text,
  requested_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','executed','stale','failed')),
  decided_by uuid, decided_at timestamptz,
  executed_at timestamptz, error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, load_id) REFERENCES public.freight_loads(company_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX freight_approvals_one_pending ON public.freight_approvals(company_id, payload_hash) WHERE status IN ('pending','approved');
CREATE TABLE public.freight_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('missing_fields','doc_expiry','late_risk','appointment_soon','missing_pod','driver_suggestion')),
  name text NOT NULL,
  owner_id uuid NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  approval_required boolean NOT NULL DEFAULT true,
  conditions jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, kind)
);
CREATE TABLE public.freight_automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES public.freight_automation_rules(id) ON DELETE CASCADE,
  load_id uuid,
  title text NOT NULL,
  why text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','dismissed','done','error')),
  error text,
  dedupe_key text NOT NULL,
  reviewed_by uuid, reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, dedupe_key)
);

CREATE TABLE public.freight_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider text NOT NULL,
  category text NOT NULL,
  status text NOT NULL DEFAULT 'not_connected' CHECK (status IN ('not_connected','connecting','approval_required','connected','failed','disconnected')),
  verified_at timestamptz,
  last_error text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, provider)
);
CREATE TABLE public.freight_integration_logs (
  id bigserial PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider text NOT NULL,
  event text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['freight_customers','freight_carriers','freight_equipment','freight_maintenance','freight_driver_profiles','freight_loads','freight_load_financials','freight_load_events','freight_exceptions','freight_documents','freight_document_reviews','freight_conversations','freight_messages','freight_notifications','freight_invoices','freight_settlements','freight_payment_records','freight_approvals','freight_automation_rules','freight_automation_runs','freight_integrations','freight_integration_logs'] LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
GRANT INSERT, UPDATE, DELETE ON public.freight_customers, public.freight_carriers, public.freight_equipment, public.freight_maintenance TO authenticated;
GRANT INSERT ON public.freight_messages, public.freight_conversations TO authenticated;
GRANT UPDATE (read_at) ON public.freight_notifications TO authenticated;
GRANT UPDATE (display_name, phone, cdl_number, cdl_state, cdl_expires, medical_expires, available) ON public.freight_driver_profiles TO authenticated;

CREATE POLICY "cust read" ON public.freight_customers FOR SELECT TO authenticated USING (private.f_has(company_id, ARRAY['admin','dispatcher','broker','fleet_owner','finance']));
CREATE POLICY "cust write" ON public.freight_customers FOR ALL TO authenticated USING (private.f_has(company_id, ARRAY['admin','dispatcher','broker'])) WITH CHECK (private.f_has(company_id, ARRAY['admin','dispatcher','broker']));
CREATE POLICY "carr read" ON public.freight_carriers FOR SELECT TO authenticated USING (private.f_has(company_id, ARRAY['admin','dispatcher','broker','finance']));
CREATE POLICY "carr write" ON public.freight_carriers FOR ALL TO authenticated USING (private.f_has(company_id, ARRAY['admin','broker'])) WITH CHECK (private.f_has(company_id, ARRAY['admin','broker']));
CREATE POLICY "eq read" ON public.freight_equipment FOR SELECT TO authenticated USING (private.f_has(company_id, ARRAY['admin','dispatcher','fleet_owner','driver']));
CREATE POLICY "eq write" ON public.freight_equipment FOR ALL TO authenticated USING (private.f_has(company_id, ARRAY['admin','fleet_owner'])) WITH CHECK (private.f_has(company_id, ARRAY['admin','fleet_owner']));
CREATE POLICY "mx read" ON public.freight_maintenance FOR SELECT TO authenticated USING (private.f_has(company_id, ARRAY['admin','dispatcher','fleet_owner']));
CREATE POLICY "mx write" ON public.freight_maintenance FOR ALL TO authenticated USING (private.f_has(company_id, ARRAY['admin','fleet_owner'])) WITH CHECK (private.f_has(company_id, ARRAY['admin','fleet_owner']));
CREATE POLICY "drv read" ON public.freight_driver_profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.f_has(company_id, ARRAY['admin','dispatcher','fleet_owner']));
CREATE POLICY "drv update" ON public.freight_driver_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid() OR private.f_has(company_id, ARRAY['admin','fleet_owner'])) WITH CHECK (user_id = auth.uid() OR private.f_has(company_id, ARRAY['admin','fleet_owner']));

CREATE POLICY "loads read" ON public.freight_loads FOR SELECT TO authenticated USING (
  private.f_has(company_id, ARRAY['admin','dispatcher','broker','fleet_owner','finance'])
  OR (driver_id = auth.uid() AND private.f_has(company_id, ARRAY['driver']))
  OR (shipper_company_id IS NOT NULL AND private.f_has(shipper_company_id, ARRAY['shipper','admin'])));
CREATE POLICY "fin read" ON public.freight_load_financials FOR SELECT TO authenticated USING (private.f_has(company_id, ARRAY['admin','broker','finance','fleet_owner']));
CREATE POLICY "events read" ON public.freight_load_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.freight_loads l WHERE l.id = load_id));
CREATE POLICY "exc read" ON public.freight_exceptions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.freight_loads l WHERE l.id = load_id));
CREATE POLICY "docs read" ON public.freight_documents FOR SELECT TO authenticated USING (
  private.f_has(company_id, ARRAY['admin','dispatcher','broker','fleet_owner'])
  OR uploaded_by = auth.uid() OR driver_user_id = auth.uid()
  OR (load_id IS NOT NULL AND kind IN ('rate_confirmation','bol','pod','image','signature','issue') AND EXISTS (SELECT 1 FROM public.freight_loads l WHERE l.id = load_id AND l.driver_id = auth.uid()))
  OR (load_id IS NOT NULL AND kind IN ('bol','pod') AND EXISTS (SELECT 1 FROM public.freight_loads l WHERE l.id = load_id AND l.shipper_company_id IS NOT NULL AND private.f_has(l.shipper_company_id, ARRAY['shipper','admin']))));
CREATE POLICY "rev read" ON public.freight_document_reviews FOR SELECT TO authenticated USING (private.f_has(company_id, ARRAY['admin','dispatcher','broker','fleet_owner']));
CREATE POLICY "conv read" ON public.freight_conversations FOR SELECT TO authenticated USING (
  private.f_has(company_id, ARRAY['admin','dispatcher','broker']) OR driver_user_id = auth.uid()
  OR (shipper_visible AND load_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.freight_loads l WHERE l.id = load_id AND l.shipper_company_id IS NOT NULL AND private.f_has(l.shipper_company_id, ARRAY['shipper']))));
CREATE POLICY "conv insert" ON public.freight_conversations FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND private.f_has(company_id, ARRAY['admin','dispatcher','broker']));
CREATE POLICY "msg read" ON public.freight_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.freight_conversations c WHERE c.id = conversation_id));
CREATE POLICY "msg insert" ON public.freight_messages FOR INSERT TO authenticated WITH CHECK (author = auth.uid() AND EXISTS (SELECT 1 FROM public.freight_conversations c WHERE c.id = conversation_id AND c.company_id = freight_messages.company_id));
CREATE POLICY "notif own" ON public.freight_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif own upd" ON public.freight_notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "inv read" ON public.freight_invoices FOR SELECT TO authenticated USING (private.f_has(company_id, ARRAY['admin','finance','broker']) OR (status IN ('sent','paid') AND customer_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.freight_customers c WHERE c.id = customer_id AND c.linked_company_id IS NOT NULL AND private.f_has(c.linked_company_id, ARRAY['shipper']))));
CREATE POLICY "set read" ON public.freight_settlements FOR SELECT TO authenticated USING (private.f_has(company_id, ARRAY['admin','finance','fleet_owner']) OR (driver_user_id = auth.uid() AND status IN ('approved','paid')));
CREATE POLICY "pay read" ON public.freight_payment_records FOR SELECT TO authenticated USING (private.f_has(company_id, ARRAY['admin','finance']));
CREATE POLICY "appr read" ON public.freight_approvals FOR SELECT TO authenticated USING (private.f_has(company_id, ARRAY['admin','dispatcher','broker','finance','fleet_owner']));
CREATE POLICY "rules read" ON public.freight_automation_rules FOR SELECT TO authenticated USING (private.f_has(company_id, ARRAY['admin','dispatcher','broker','fleet_owner']));
CREATE POLICY "runs read" ON public.freight_automation_runs FOR SELECT TO authenticated USING (private.f_has(company_id, ARRAY['admin','dispatcher','broker','fleet_owner']));
CREATE POLICY "int read" ON public.freight_integrations FOR SELECT TO authenticated USING (private.f_has(company_id, ARRAY['admin']));
CREATE POLICY "intlog read" ON public.freight_integration_logs FOR SELECT TO authenticated USING (private.f_has(company_id, ARRAY['admin']));

CREATE POLICY "freight docs read" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'freight-docs' AND EXISTS (SELECT 1 FROM public.freight_documents d WHERE d.storage_path = storage.objects.name));
CREATE POLICY "freight docs upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'freight-docs' AND EXISTS (SELECT 1 FROM public.freight_documents d WHERE d.storage_path = storage.objects.name AND d.uploaded_by = auth.uid() AND d.status = 'pending'));
