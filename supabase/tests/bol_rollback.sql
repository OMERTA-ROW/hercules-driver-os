-- BOL ownership and linked-load authorization assertions. Everything rolls back.
BEGIN;

CREATE TEMP TABLE bol_ids (key text PRIMARY KEY, value uuid);
GRANT ALL ON bol_ids TO authenticated;

INSERT INTO auth.users (id, email, email_confirmed_at, aud, role, instance_id)
SELECT gen_random_uuid(), fixture_email, now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'
FROM unnest(ARRAY['bol-owner@test.invalid', 'bol-other@test.invalid']) AS fixture(fixture_email);
INSERT INTO bol_ids
SELECT split_part(email, '@', 1), id FROM auth.users WHERE email LIKE 'bol-%@test.invalid';

CREATE OR REPLACE FUNCTION pg_temp.as_bol_user(key_name text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', (SELECT value FROM bol_ids WHERE key = key_name), 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$;
CREATE OR REPLACE FUNCTION pg_temp.ok(condition boolean, message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF NOT coalesce(condition, false) THEN RAISE EXCEPTION 'ASSERTION FAILED: %', message; END IF; RAISE NOTICE 'pass: %', message; END $$;

SELECT pg_temp.as_bol_user('bol-owner');
CREATE TEMP TABLE owned_load AS
WITH inserted AS (
  INSERT INTO public.loads (posted_by, reference, status)
  VALUES ((SELECT value FROM bol_ids WHERE key='bol-owner'), 'BOL-OWN', 'booked')
  RETURNING id
)
SELECT id FROM inserted;
INSERT INTO public.documents (owner_id, load_id, kind, title, bol_data)
VALUES ((SELECT value FROM bol_ids WHERE key='bol-owner'), (SELECT id FROM owned_load), 'bol_draft', 'Allowed', '{}');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.documents WHERE title='Allowed'), 'owner can link a BOL to an owned load');
RESET ROLE;

SELECT pg_temp.as_bol_user('bol-other');
DO $$ BEGIN
  BEGIN
    INSERT INTO public.documents (owner_id, load_id, kind, title, bol_data)
    VALUES ((SELECT value FROM bol_ids WHERE key='bol-other'), (SELECT id FROM owned_load), 'bol_draft', 'Blocked', '{}');
    PERFORM pg_temp.ok(false, 'cross-user load link should fail');
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    PERFORM pg_temp.ok(true, 'cross-user load link is refused');
  END;
END $$;
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.documents WHERE title='Allowed'), 'other user cannot read owner BOL');
RESET ROLE;

ROLLBACK;