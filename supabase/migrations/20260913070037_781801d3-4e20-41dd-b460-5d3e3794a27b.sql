CREATE OR REPLACE FUNCTION public.ai_billing_owner_of_customer(_customer text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT user_id
  FROM public.ai_billing_customers
  WHERE provider = 'stripe' AND customer_id = _customer
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.ai_billing_owner_of_customer(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_billing_owner_of_customer(text) TO service_role;