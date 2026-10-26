-- Run only through a trusted database test session; all fixture changes roll back.
BEGIN;
DO $$ BEGIN
  IF has_table_privilege('authenticated','public.broker_delivery_outbox','INSERT') THEN RAISE EXCEPTION 'Client outbox insert allowed'; END IF;
  IF has_table_privilege('authenticated','public.broker_intake_drafts','UPDATE') THEN RAISE EXCEPTION 'Client draft approval allowed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='broker_outbox_approval_guard') THEN RAISE EXCEPTION 'Missing outbox guard'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='broker_recipient_verification_guard') THEN RAISE EXCEPTION 'Missing recipient verification guard'; END IF;
END $$;
ROLLBACK;