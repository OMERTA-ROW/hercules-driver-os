REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.broker_load_releases,public.broker_driver_recipients FROM anon,authenticated;
REVOKE SELECT ON public.broker_load_releases,public.broker_driver_recipients FROM anon;
REVOKE EXECUTE ON FUNCTION public.broker_intake_approve(uuid,uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
COMMENT ON TABLE public.broker_driver_recipients IS 'Trusted driver/carrier/email verification mappings. Explicit client write privileges revoked; read scoped by RLS. No verification workflow connected.';