-- Column-level privileges: RLS decides WHICH row, these decide WHICH columns.
REVOKE UPDATE ON public.profiles FROM authenticated;

GRANT UPDATE (
  full_name,
  email,
  account_kind,
  plan,
  seats,
  company_name,
  company_code,
  fleet_tier,
  home_base,
  cdl_number,
  updated_at
) ON public.profiles TO authenticated;

-- status, trial_ends_at and stripe_customer_id are deliberately excluded:
-- they are server-owned billing state.
GRANT ALL ON public.profiles TO service_role;