CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  account_kind TEXT NOT NULL DEFAULT 'solo',
  plan TEXT,
  seats INTEGER NOT NULL DEFAULT 1,
  trial_ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'trial',
  company_name TEXT,
  company_code TEXT,
  fleet_tier INTEGER,
  home_base TEXT,
  cdl_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.current_company_code()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT company_code FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, account_kind)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'account_kind', 'solo')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  company_code TEXT,
  label TEXT NOT NULL,
  unit_number TEXT,
  equipment_type TEXT NOT NULL DEFAULT 'tractor_trailer',
  vocation TEXT,
  make TEXT,
  model TEXT,
  model_year INTEGER,
  vin TEXT,
  height_inches INTEGER,
  length_inches INTEGER,
  width_inches INTEGER,
  gross_weight_lb INTEGER,
  axles INTEGER,
  hazmat BOOLEAN NOT NULL DEFAULT false,
  adapter_kind TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicles read" ON public.vehicles FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR (company_code IS NOT NULL AND company_code = public.current_company_code()));
CREATE POLICY "vehicles insert" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "vehicles update" ON public.vehicles FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "vehicles delete" ON public.vehicles FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE TRIGGER vehicles_touch BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.loads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  posted_by UUID REFERENCES auth.users ON DELETE SET NULL,
  company_code TEXT,
  reference TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  broker_name TEXT,
  origin_city TEXT,
  origin_state TEXT,
  origin_lat DOUBLE PRECISION,
  origin_lng DOUBLE PRECISION,
  dest_city TEXT,
  dest_state TEXT,
  dest_lat DOUBLE PRECISION,
  dest_lng DOUBLE PRECISION,
  rate_cents INTEGER,
  miles INTEGER,
  equipment_type TEXT,
  commodity TEXT,
  weight_lb INTEGER,
  pickup_at TIMESTAMPTZ,
  deliver_at TIMESTAMPTZ,
  assigned_driver_id UUID REFERENCES auth.users ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loads TO authenticated;
GRANT ALL ON public.loads TO service_role;
ALTER TABLE public.loads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loads read" ON public.loads FOR SELECT TO authenticated
  USING (status = 'available' OR posted_by = auth.uid() OR assigned_driver_id = auth.uid()
    OR (company_code IS NOT NULL AND company_code = public.current_company_code()));
CREATE POLICY "loads insert" ON public.loads FOR INSERT TO authenticated WITH CHECK (posted_by = auth.uid());
CREATE POLICY "loads update" ON public.loads FOR UPDATE TO authenticated
  USING (posted_by = auth.uid() OR assigned_driver_id = auth.uid())
  WITH CHECK (posted_by = auth.uid() OR assigned_driver_id = auth.uid());
CREATE POLICY "loads delete" ON public.loads FOR DELETE TO authenticated USING (posted_by = auth.uid());
CREATE TRIGGER loads_touch BEFORE UPDATE ON public.loads FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  load_id UUID REFERENCES public.loads ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  start_odometer INTEGER,
  end_odometer INTEGER,
  miles INTEGER,
  drive_minutes INTEGER,
  on_duty_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT ALL ON public.trips TO service_role;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trips own" ON public.trips FOR ALL TO authenticated USING (driver_id = auth.uid()) WITH CHECK (driver_id = auth.uid());
CREATE TRIGGER trips_touch BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.vehicle_health_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  adapter_kind TEXT NOT NULL DEFAULT 'j1939',
  metric TEXT NOT NULL,
  value_num DOUBLE PRECISION,
  value_text TEXT,
  unit TEXT,
  fault_code TEXT,
  severity TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_health_readings TO authenticated;
GRANT ALL ON public.vehicle_health_readings TO service_role;
ALTER TABLE public.vehicle_health_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "readings read" ON public.vehicle_health_readings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id
    AND (v.owner_id = auth.uid() OR (v.company_code IS NOT NULL AND v.company_code = public.current_company_code()))));
CREATE POLICY "readings write" ON public.vehicle_health_readings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.owner_id = auth.uid()));
CREATE POLICY "readings delete" ON public.vehicle_health_readings FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.owner_id = auth.uid()));

CREATE TABLE public.financial_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT current_date,
  category TEXT NOT NULL,
  description TEXT,
  amount_cents BIGINT NOT NULL,
  load_id UUID REFERENCES public.loads ON DELETE SET NULL,
  gallons NUMERIC,
  odometer INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_entries TO authenticated;
GRANT ALL ON public.financial_entries TO service_role;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "money own" ON public.financial_entries FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE TRIGGER money_touch BEFORE UPDATE ON public.financial_entries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT,
  vehicle_id UUID REFERENCES public.vehicles ON DELETE SET NULL,
  load_id UUID REFERENCES public.loads ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts own" ON public.alerts FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  load_id UUID REFERENCES public.loads ON DELETE SET NULL,
  load_reference TEXT,
  kind TEXT NOT NULL DEFAULT 'bol',
  title TEXT,
  storage_path TEXT,
  page_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_to TEXT,
  expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents own" ON public.documents FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE TRIGGER documents_touch BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX loads_status_idx ON public.loads (status);
CREATE INDEX trips_driver_idx ON public.trips (driver_id, started_at DESC);
CREATE INDEX readings_vehicle_idx ON public.vehicle_health_readings (vehicle_id, recorded_at DESC);
CREATE INDEX money_owner_idx ON public.financial_entries (owner_id, entry_date DESC);
CREATE INDEX alerts_owner_idx ON public.alerts (owner_id, created_at DESC);