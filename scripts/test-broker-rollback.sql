-- Run only through a trusted database test session; all fixture changes roll back.
BEGIN;
DO $$ BEGIN
  IF has_table_privilege('authenticated','public.broker_delivery_outbox','INSERT') THEN RAISE EXCEPTION 'Client outbox insert allowed'; END IF;
  IF has_table_privilege('authenticated','public.broker_intake_drafts','UPDATE') THEN RAISE EXCEPTION 'Client draft approval allowed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='broker_outbox_approval_guard') THEN RAISE EXCEPTION 'Missing outbox guard'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='broker_recipient_verification_guard') THEN RAISE EXCEPTION 'Missing recipient verification guard'; END IF;
END $$;
ROLLBACK;BEGIN;
DO $$ DECLARE source text; BEGIN
 IF has_table_privilege('authenticated','public.broker_load_releases','INSERT') OR has_table_privilege('authenticated','public.broker_driver_recipients','UPDATE') THEN RAISE EXCEPTION 'Client assignment/verification write allowed'; END IF;
 IF has_function_privilege('authenticated','public.broker_intake_approve(uuid,uuid,uuid,boolean)','EXECUTE') THEN RAISE EXCEPTION 'Old carrier-only approval bypass allowed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='broker_release_guard') THEN RAISE EXCEPTION 'Missing release guard'; END IF;
 SELECT pg_get_functiondef('public.broker_can_review(uuid)'::regprocedure) INTO source;
 IF position('dispatcher' in source)=0 OR position('broker' in source)=0 THEN RAISE EXCEPTION 'Missing reviewer role'; END IF;
 SELECT pg_get_functiondef('public.broker_review_batch(uuid,jsonb,boolean)'::regprocedure) INTO source;
 IF position('tstzrange' in source)=0 OR position('FOR UPDATE' in source)=0 OR position('Active verified driver' in source)=0 THEN RAISE EXCEPTION 'Missing conflicts/serialization/verification guards'; END IF;
 BEGIN PERFORM public.broker_review_batch(gen_random_uuid(),'[]'::jsonb,false); RAISE EXCEPTION 'Unconfirmed approval unexpectedly allowed'; EXCEPTION WHEN OTHERS THEN IF SQLERRM='Unconfirmed approval unexpectedly allowed' THEN RAISE; END IF; END;
END $$;
ROLLBACK;
