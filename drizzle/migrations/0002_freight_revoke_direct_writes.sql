DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'freight\_%' LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM authenticated', t);
  END LOOP;
END $$;
GRANT INSERT, UPDATE, DELETE ON public.freight_customers, public.freight_carriers, public.freight_equipment, public.freight_maintenance TO authenticated;
GRANT INSERT ON public.freight_messages, public.freight_conversations TO authenticated;
GRANT UPDATE (read_at) ON public.freight_notifications TO authenticated;
GRANT UPDATE (display_name, phone, cdl_number, cdl_state, cdl_expires, medical_expires, available) ON public.freight_driver_profiles TO authenticated;
REVOKE SELECT ON public.freight_invites FROM authenticated;
GRANT SELECT (id, company_id, email, role, expires_at, used_at, used_by, revoked, created_by, created_at) ON public.freight_invites TO authenticated;
