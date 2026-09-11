CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.current_company_code()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT company_code FROM public.profiles WHERE id = auth.uid() $$;
REVOKE ALL ON FUNCTION private.current_company_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_company_code() TO authenticated, service_role;

DROP POLICY "vehicles read" ON public.vehicles;
CREATE POLICY "vehicles read" ON public.vehicles FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR (company_code IS NOT NULL AND company_code = private.current_company_code()));

DROP POLICY "loads read" ON public.loads;
CREATE POLICY "loads read" ON public.loads FOR SELECT TO authenticated
  USING (status = 'available' OR posted_by = auth.uid() OR assigned_driver_id = auth.uid()
    OR (company_code IS NOT NULL AND company_code = private.current_company_code()));

DROP POLICY "readings read" ON public.vehicle_health_readings;
CREATE POLICY "readings read" ON public.vehicle_health_readings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id
    AND (v.owner_id = auth.uid() OR (v.company_code IS NOT NULL AND v.company_code = private.current_company_code()))));

DROP FUNCTION public.current_company_code();

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;