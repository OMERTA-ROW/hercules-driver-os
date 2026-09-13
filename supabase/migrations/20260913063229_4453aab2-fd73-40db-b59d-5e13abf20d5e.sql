REVOKE ALL ON FUNCTION public.ai_credits_reserve(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ai_credits_commit(uuid, integer, text, numeric, text, boolean, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ai_credits_refund(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ai_set_quality_pref(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_credits_reserve(text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_credits_commit(uuid, integer, text, numeric, text, boolean, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_credits_refund(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_set_quality_pref(text) TO authenticated, service_role;
CREATE POLICY "billing events are server only" ON public.billing_events FOR SELECT TO authenticated USING (false);