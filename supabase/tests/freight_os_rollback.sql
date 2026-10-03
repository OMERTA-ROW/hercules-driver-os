-- Hercules Freight OS rollback-only database assertions.
-- Run: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/freight_os_rollback.sql
-- Everything happens inside one transaction that is rolled back; nothing persists.
BEGIN;

CREATE TEMP TABLE t_ids (k text PRIMARY KEY, v uuid);
GRANT ALL ON t_ids TO authenticated;
CREATE TEMP TABLE t_tok (k text, v text);
GRANT ALL ON t_tok TO authenticated;

INSERT INTO auth.users (id, email, email_confirmed_at, aud, role, instance_id)
SELECT gen_random_uuid(), e, now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'
FROM unnest(ARRAY['fx-admin@test.invalid','fx-disp@test.invalid','fx-driver@test.invalid','fx-outsider@test.invalid','fx-admin2@test.invalid']) e;
INSERT INTO t_ids SELECT split_part(email,'@',1), id FROM auth.users WHERE email LIKE 'fx-%@test.invalid';

CREATE OR REPLACE FUNCTION pg_temp.as_user(_k text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', (SELECT v FROM t_ids WHERE k = _k), 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$;
CREATE OR REPLACE FUNCTION pg_temp.ok(_cond boolean, _msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF NOT coalesce(_cond, false) THEN RAISE EXCEPTION 'ASSERTION FAILED: %', _msg; END IF; RAISE NOTICE 'pass: %', _msg; END $$;
CREATE OR REPLACE FUNCTION pg_temp.j(_v jsonb, _k text) RETURNS text LANGUAGE sql AS $$ SELECT _v->>_k $$;

-- 1. Company creation grants admin transactionally
SELECT pg_temp.as_user('fx-admin');
DO $$ DECLARE r jsonb; BEGIN
  r := public.freight_company_create('Fixture Carrier', 'carrier');
  PERFORM pg_temp.ok((r->>'ok')::boolean, 'company created');
  INSERT INTO t_ids VALUES ('co', (r->>'company_id')::uuid);
  PERFORM pg_temp.ok(private.f_has((r->>'company_id')::uuid, ARRAY['admin']), 'creator is admin');
END $$;
RESET ROLE;
SELECT pg_temp.as_user('fx-outsider');
DO $$ DECLARE r jsonb; BEGIN
  r := public.freight_company_create('Other Co', 'broker');
  INSERT INTO t_ids VALUES ('co2', (r->>'company_id')::uuid);
END $$;
RESET ROLE;

-- 2. Invites: hashed, email-bound, single-use
SELECT pg_temp.as_user('fx-admin');
DO $$ DECLARE r jsonb; r2 jsonb; BEGIN
  r := public.freight_invite_create((SELECT v FROM t_ids WHERE k='co'), 'fx-driver@test.invalid', 'driver', 24);
  PERFORM pg_temp.ok((r->>'ok')::boolean, 'invite created');
  INSERT INTO t_tok VALUES ('drv', r->>'token');
  r2 := public.freight_invite_create((SELECT v FROM t_ids WHERE k='co'), 'fx-disp@test.invalid', 'dispatcher', 24);
  INSERT INTO t_tok VALUES ('disp', r2->>'token');
  r2 := public.freight_invite_create((SELECT v FROM t_ids WHERE k='co'), 'fx-admin2@test.invalid', 'admin', 24);
  INSERT INTO t_tok VALUES ('adm2', r2->>'token');
END $$;
RESET ROLE;
DO $$ BEGIN PERFORM pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.freight_invites WHERE token_hash IN (SELECT v FROM t_tok)), 'raw token is not stored'); END $$;

SELECT pg_temp.as_user('fx-outsider');
DO $$ BEGIN
  PERFORM pg_temp.ok(public.freight_invite_accept((SELECT v FROM t_tok WHERE k='drv'))->>'error' = 'wrong_email', 'wrong email refused');
  PERFORM pg_temp.ok(public.freight_invite_create((SELECT v FROM t_ids WHERE k='co'), 'x@y.zz', 'admin', 24)->>'error' = 'not_permitted', 'outsider cannot invite into another company');
  PERFORM pg_temp.ok((SELECT count(*) FROM public.freight_loads WHERE company_id = (SELECT v FROM t_ids WHERE k='co')) = 0, 'outsider sees no loads');
END $$;
RESET ROLE;
SELECT pg_temp.as_user('fx-driver');
DO $$ BEGIN
  PERFORM pg_temp.ok((public.freight_invite_accept((SELECT v FROM t_tok WHERE k='drv'))->>'ok')::boolean, 'driver joins');
  PERFORM pg_temp.ok(public.freight_invite_accept((SELECT v FROM t_tok WHERE k='drv'))->>'error' = 'used_up', 'invite replay refused');
  PERFORM pg_temp.ok(NOT private.f_has((SELECT v FROM t_ids WHERE k='co'), ARRAY['admin','dispatcher']), 'driver did not gain privileged role');
END $$;
RESET ROLE;
SELECT pg_temp.as_user('fx-disp');
DO $$ BEGIN PERFORM pg_temp.ok((public.freight_invite_accept((SELECT v FROM t_tok WHERE k='disp'))->>'ok')::boolean, 'dispatcher joins'); END $$;
RESET ROLE;
SELECT pg_temp.as_user('fx-admin2');
DO $$ BEGIN PERFORM pg_temp.ok((public.freight_invite_accept((SELECT v FROM t_tok WHERE k='adm2'))->>'ok')::boolean, 'second admin joins'); END $$;
RESET ROLE;

-- 3. Loads: draft incomplete allowed, assignment requires fields, overlap blocked
SELECT pg_temp.as_user('fx-disp');
DO $$ DECLARE co uuid := (SELECT v FROM t_ids WHERE k='co'); r jsonb; cust uuid; l1 uuid; l2 uuid; drv uuid := (SELECT v FROM t_ids WHERE k='fx-driver'); BEGIN
  r := public.freight_load_save(co, NULL, '{"origin":"Dallas, TX"}', 0);
  PERFORM pg_temp.ok((r->>'ok')::boolean, 'incomplete draft saved');
  l1 := (r->>'id')::uuid;
  r := public.freight_load_assign(l1, drv, NULL, NULL, 1);
  PERFORM pg_temp.ok(r->>'error' = 'missing_fields', 'assignment refused on incomplete load');
  INSERT INTO public.freight_customers(company_id, name) VALUES (co, 'Fixture Shipper') RETURNING id INTO cust;
  r := public.freight_load_save(co, l1, jsonb_build_object('customer_id', cust, 'destination','Austin, TX','pickup_at', now()+interval '1 day','delivery_at', now()+interval '2 days','equipment_type','Dry van','commodity','Paper','weight_lb',30000,'contact_name','Dock'), 1);
  PERFORM pg_temp.ok((r->>'ok')::boolean, 'draft completed');
  PERFORM pg_temp.ok(public.freight_load_save(co, l1, '{"notes":"x"}', 1)->>'error' = 'stale_version', 'stale version refused');
  r := public.freight_load_assign(l1, drv, NULL, NULL, 2);
  PERFORM pg_temp.ok((r->>'ok')::boolean, 'assignment succeeds');
  r := public.freight_load_save(co, NULL, jsonb_build_object('customer_id', cust, 'origin','A','destination','B','pickup_at', now()+interval '36 hours','delivery_at', now()+interval '3 days','equipment_type','Dry van','commodity','Paper','weight_lb',1000,'contact_name','Dock'), 0);
  l2 := (r->>'id')::uuid;
  PERFORM pg_temp.ok(public.freight_load_assign(l2, drv, NULL, NULL, 1)->>'error' = 'schedule_conflict', 'overlapping driver assignment refused');
  INSERT INTO t_ids VALUES ('l1', l1), ('l2', l2);
  -- cross-company foreign key refused
  BEGIN
    INSERT INTO public.freight_customers(company_id, name) VALUES ((SELECT v FROM t_ids WHERE k='co2'), 'Spoof');
    PERFORM pg_temp.ok(false, 'cross-company directory insert should fail');
  EXCEPTION WHEN insufficient_privilege THEN PERFORM pg_temp.ok(true, 'cross-company directory insert refused');
  END;
END $$;
RESET ROLE;
DO $$ BEGIN
  BEGIN
    UPDATE public.freight_loads SET customer_id = (SELECT id FROM public.freight_customers WHERE company_id = (SELECT v FROM t_ids WHERE k='co') LIMIT 1)
     WHERE company_id = (SELECT v FROM t_ids WHERE k='co2');
    INSERT INTO public.freight_customers(company_id, name) VALUES ((SELECT v FROM t_ids WHERE k='co2'), 'B cust');
    INSERT INTO public.freight_loads(company_id, reference, created_by, customer_id) VALUES ((SELECT v FROM t_ids WHERE k='co2'), 'X1', (SELECT v FROM t_ids WHERE k='fx-admin'),
      (SELECT id FROM public.freight_customers WHERE company_id = (SELECT v FROM t_ids WHERE k='co') LIMIT 1));
    PERFORM pg_temp.ok(false, 'composite FK should block cross-company customer');
  EXCEPTION WHEN foreign_key_violation THEN PERFORM pg_temp.ok(true, 'composite FK blocks cross-company customer');
  END;
END $$;

-- 4. Driver scope, direct write denial, finance isolation, POD gate
SELECT pg_temp.as_user('fx-driver');
DO $$ DECLARE l uuid := (SELECT v FROM t_ids WHERE k='l1'); r jsonb; BEGIN
  PERFORM pg_temp.ok((SELECT count(*) FROM public.freight_loads) = 1, 'driver sees only assigned load');
  PERFORM pg_temp.ok((SELECT count(*) FROM public.freight_load_financials) = 0, 'driver sees no financials');
  BEGIN UPDATE public.freight_loads SET status = 'delivered' WHERE id = l; PERFORM pg_temp.ok(false, 'direct update should fail');
  EXCEPTION WHEN insufficient_privilege THEN PERFORM pg_temp.ok(true, 'direct load update refused'); END;
  PERFORM pg_temp.ok(public.freight_load_status(l, 'en_route_pickup', NULL, 3)->>'error' = 'accept_first', 'must accept first');
  PERFORM pg_temp.ok(public.freight_driver_respond(l, false, '')->>'error' = 'reason_required', 'decline needs a reason');
  PERFORM pg_temp.ok((public.freight_driver_respond(l, true, NULL)->>'ok')::boolean, 'driver accepts');
  PERFORM pg_temp.ok(public.freight_load_status(l, 'loaded', NULL, 4)->>'error' = 'out_of_order', 'status skip refused');
  PERFORM public.freight_load_status(l, 'en_route_pickup', NULL, 4);
  PERFORM public.freight_load_status(l, 'arrived_pickup', NULL, 5);
  PERFORM public.freight_load_status(l, 'loaded', NULL, 6);
  PERFORM public.freight_load_status(l, 'en_route_delivery', NULL, 7);
  PERFORM public.freight_load_status(l, 'arrived_delivery', NULL, 8);
  PERFORM pg_temp.ok(public.freight_load_status(l, 'delivered', 'driver says delivered fine', 9)->>'error' = 'pod_required', 'delivered refused without POD');
  r := public.freight_doc_register((SELECT v FROM t_ids WHERE k='co'), l, NULL, NULL, 'pod', 'pod.pdf', 'application/pdf', 1000);
  PERFORM pg_temp.ok(public.freight_doc_finalize((r->>'id')::uuid)->>'error' = 'file_missing', 'POD not counted until file is stored');
  PERFORM pg_temp.ok(public.freight_doc_register((SELECT v FROM t_ids WHERE k='co'), l, NULL, NULL, 'pod', 'x.exe', 'application/x-msdownload', 1000)->>'error' = 'bad_type', 'bad file type refused');
  PERFORM pg_temp.ok(public.freight_doc_register((SELECT v FROM t_ids WHERE k='co'), (SELECT v FROM t_ids WHERE k='l2'), NULL, NULL, 'pod', 'p.pdf', 'application/pdf', 10)->>'error' = 'not_permitted', 'driver cannot upload to unassigned load');
END $$;
RESET ROLE;

-- 5. Approvals: no self-approval, stale detection, no replay
SELECT pg_temp.as_user('fx-admin');
DO $$ DECLARE co uuid := (SELECT v FROM t_ids WHERE k='co'); l uuid := (SELECT v FROM t_ids WHERE k='l2'); r jsonb; a uuid; BEGIN
  r := public.freight_approval_request(co, 'rate_change', l, '{"customer_rate_cents":250000}', 'customer agreed', 'test');
  a := (r->>'id')::uuid;
  PERFORM pg_temp.ok(public.freight_approval_request(co, 'rate_change', l, '{"customer_rate_cents":250000}', 'dup', 'test')->>'error' = 'duplicate_request', 'duplicate request refused');
  PERFORM pg_temp.ok(public.freight_approval_decide(a, true, NULL)->>'error' = 'self_approval', 'self approval refused');
  INSERT INTO t_ids VALUES ('appr', a);
  r := public.freight_approval_request(co, 'cancel_load', l, '{}', 'customer cancelled', 'test');
  INSERT INTO t_ids VALUES ('appr_stale', (r->>'id')::uuid);
END $$;
RESET ROLE;
SELECT pg_temp.as_user('fx-disp');
DO $$ BEGIN PERFORM pg_temp.ok(public.freight_approval_decide((SELECT v FROM t_ids WHERE k='appr'), true, NULL)->>'error' = 'not_permitted', 'dispatcher cannot approve rate'); END $$;
RESET ROLE;
SELECT pg_temp.as_user('fx-admin2');
DO $$ BEGIN
  PERFORM pg_temp.ok((public.freight_approval_decide((SELECT v FROM t_ids WHERE k='appr'), true, NULL)->>'ok')::boolean, 'second admin approves and executes');
  PERFORM pg_temp.ok(public.freight_approval_decide((SELECT v FROM t_ids WHERE k='appr'), true, NULL)->>'error' = 'already_decided', 'approval replay refused');
  PERFORM pg_temp.ok(public.freight_approval_decide((SELECT v FROM t_ids WHERE k='appr_stale'), true, NULL)->>'error' = 'stale', 'stale approval refused after load changed');
  PERFORM pg_temp.ok((SELECT customer_rate_cents FROM public.freight_load_financials WHERE load_id = (SELECT v FROM t_ids WHERE k='l2')) = 250000, 'rate applied once');
END $$;
RESET ROLE;

-- 6. Audit trail is append-only for clients
SELECT pg_temp.as_user('fx-admin');
DO $$ BEGIN
  PERFORM pg_temp.ok((SELECT count(*) FROM public.freight_audit_log) > 5, 'audit events recorded');
  BEGIN DELETE FROM public.freight_audit_log; PERFORM pg_temp.ok(false, 'audit delete should fail');
  EXCEPTION WHEN insufficient_privilege THEN PERFORM pg_temp.ok(true, 'audit log cannot be deleted'); END;
  PERFORM pg_temp.ok((SELECT count(*) FROM public.freight_loads WHERE company_id = (SELECT v FROM t_ids WHERE k='co2')) = 0, 'admin of A sees nothing of B');
END $$;
RESET ROLE;

ROLLBACK;
