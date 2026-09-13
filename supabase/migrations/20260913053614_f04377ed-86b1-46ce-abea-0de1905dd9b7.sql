CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_seats INTEGER := GREATEST(1, COALESCE((m ->> 'seats')::int, 1));
BEGIN
  INSERT INTO public.profiles (
    id, full_name, email, account_kind, plan, seats, status, trial_ends_at,
    company_code, company_name, fleet_tier
  )
  VALUES (
    NEW.id,
    COALESCE(m ->> 'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(m ->> 'account_kind', 'solo'),
    NULLIF(m ->> 'plan', ''),
    v_seats,
    'trial',
    COALESCE((m ->> 'trial_ends_at')::timestamptz, now() + interval '7 days'),
    NULLIF(UPPER(TRIM(COALESCE(m ->> 'company_code', ''))), ''),
    NULLIF(TRIM(COALESCE(m ->> 'company_name', '')), ''),
    NULLIF(m ->> 'fleet_tier', '')::int
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;