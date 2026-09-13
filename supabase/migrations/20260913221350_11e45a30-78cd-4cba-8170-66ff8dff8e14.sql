REVOKE ALL ON FUNCTION public.loads_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vehicles_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.company_my_memberships() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.company_roster(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.company_my_memberships() TO authenticated;
GRANT EXECUTE ON FUNCTION public.company_roster(uuid) TO authenticated;