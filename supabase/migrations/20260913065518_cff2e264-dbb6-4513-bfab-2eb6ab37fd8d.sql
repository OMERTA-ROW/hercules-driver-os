-- ============ 1. billing_events becomes a retryable state machine ============
ALTER TABLE public.billing_events
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.billing_events'::regclass AND conname = 'billing_events_provider_event_uq'
  ) THEN
    ALTER TABLE public.billing_events
      ADD CONSTRAINT billing_events_provider_event_uq UNIQUE (provider, event_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.ai_billing_claim_event(
  _provider text, _event_id text, _type text, _payload jsonb
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE st text;
BEGIN
  INSERT INTO public.billing_events (provider, event_id, event_type, payload, status, attempts)
  VALUES (_provider, _event_id, _type, _payload, 'pending', 1)
  ON CONFLICT (provider, event_id) DO UPDATE
    SET attempts = public.billing_events.attempts + 1,
        payload = EXCLUDED.payload,
        status = 'pending'
    WHERE public.billing_events.status <> 'processed'
  RETURNING status INTO st;

  IF st IS NULL THEN RETURN 'duplicate'; END IF;
  RETURN 'claimed';
END;
$function$;

CREATE OR REPLACE FUNCTION public.ai_billing_finish_event(
  _provider text, _event_id text, _ok boolean, _error text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  UPDATE public.billing_events
    SET status = CASE WHEN _ok THEN 'processed' ELSE 'failed' END,
        processed_at = CASE WHEN _ok THEN now() ELSE NULL END,
        last_error = _error
    WHERE provider = _provider AND event_id = _event_id;
  RETURN true;
END;
$function$;

-- ============ 2. durable purchase mapping (service-role only) ============
CREATE TABLE IF NOT EXISTS public.ai_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'stripe',
  kind text NOT NULL CHECK (kind IN ('plan','pack')),
  item_id text NOT NULL,
  bucket text NOT NULL CHECK (bucket IN ('monthly','purchased')),
  credits integer NOT NULL CHECK (credits >= 0),
  payment_ref text NOT NULL,
  invoice_id text,
  subscription_id text,
  period_start timestamp with time zone,
  period_end timestamp with time zone,
  amount_paid_cents bigint,
  currency text,
  credits_reversed integer NOT NULL DEFAULT 0,
  credits_owed integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.ai_purchases TO service_role;
ALTER TABLE public.ai_purchases ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS ai_purchases_payment_uq
  ON public.ai_purchases (provider, payment_ref);
CREATE UNIQUE INDEX IF NOT EXISTS ai_purchases_period_uq
  ON public.ai_purchases (provider, subscription_id, period_start)
  WHERE subscription_id IS NOT NULL;

DROP TRIGGER IF EXISTS ai_purchases_touch ON public.ai_purchases;
CREATE TRIGGER ai_purchases_touch BEFORE UPDATE ON public.ai_purchases
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ 3. authoritative customer ownership (service-role only) ============
CREATE TABLE IF NOT EXISTS public.ai_billing_customers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'stripe',
  customer_id text NOT NULL,
  subscription_id text,
  subscription_status text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.ai_billing_customers TO service_role;
ALTER TABLE public.ai_billing_customers ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS ai_billing_customers_customer_uq
  ON public.ai_billing_customers (provider, customer_id);

DROP TRIGGER IF EXISTS ai_billing_customers_touch ON public.ai_billing_customers;
CREATE TRIGGER ai_billing_customers_touch BEFORE UPDATE ON public.ai_billing_customers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.ai_billing_link_customer(
  _user uuid, _customer text, _subscription text DEFAULT NULL, _status text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE owner uuid;
BEGIN
  IF _user IS NULL OR _customer IS NULL THEN RAISE EXCEPTION 'user_and_customer_required'; END IF;

  SELECT user_id INTO owner FROM public.ai_billing_customers
    WHERE provider = 'stripe' AND customer_id = _customer;
  IF owner IS NOT NULL AND owner <> _user THEN
    RAISE EXCEPTION 'customer_owned_by_another_account';
  END IF;

  INSERT INTO public.ai_billing_customers (user_id, customer_id, subscription_id, subscription_status)
  VALUES (_user, _customer, _subscription, _status)
  ON CONFLICT (user_id) DO UPDATE
    SET customer_id = EXCLUDED.customer_id,
        subscription_id = COALESCE(EXCLUDED.subscription_id, public.ai_billing_customers.subscription_id),
        subscription_status = COALESCE(EXCLUDED.subscription_status, public.ai_billing_customers.subscription_status);
  RETURN true;
END;
$function$;

-- ============ 4. atomic fulfilment ============
CREATE OR REPLACE FUNCTION public.ai_billing_fulfill(
  _user uuid,
  _kind text,
  _item_id text,
  _bucket text,
  _credits integer,
  _payment_ref text,
  _invoice text DEFAULT NULL,
  _subscription text DEFAULT NULL,
  _period_start timestamp with time zone DEFAULT NULL,
  _period_end timestamp with time zone DEFAULT NULL,
  _amount_cents bigint DEFAULT NULL,
  _currency text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  w public.ai_credit_wallets;
  inserted uuid;
BEGIN
  IF _user IS NULL OR _payment_ref IS NULL THEN RAISE EXCEPTION 'user_and_ref_required'; END IF;
  IF _bucket NOT IN ('monthly','purchased') THEN RAISE EXCEPTION 'invalid bucket'; END IF;

  w := public.ai_credits_touch(_user);

  -- A monthly allowance for a period that already ended (delayed/out-of-order
  -- invoice) must never reset a newer period.
  IF _bucket = 'monthly' AND _period_end IS NOT NULL
     AND w.monthly_expires_at IS NOT NULL AND _period_end <= w.monthly_expires_at THEN
    RETURN 'stale';
  END IF;

  BEGIN
    INSERT INTO public.ai_purchases
      (user_id, provider, kind, item_id, bucket, credits, payment_ref, invoice_id,
       subscription_id, period_start, period_end, amount_paid_cents, currency)
    VALUES
      (_user, 'stripe', _kind, _item_id, _bucket, _credits, _payment_ref, _invoice,
       _subscription, _period_start, _period_end, _amount_cents, _currency)
    RETURNING id INTO inserted;
  EXCEPTION WHEN unique_violation THEN
    RETURN 'duplicate';
  END;

  PERFORM public.ai_credits_grant(
    _user, _bucket, _credits, 'stripe:' || _payment_ref,
    CASE WHEN _bucket = 'monthly' THEN 'Monthly AI allowance (paid invoice)'
         ELSE 'Credit pack purchase (never expires)' END,
    CASE WHEN _bucket = 'monthly' THEN COALESCE(_period_end, now() + interval '31 days') ELSE NULL END,
    CASE WHEN _kind = 'plan' THEN _item_id ELSE NULL END,
    CASE WHEN _bucket = 'monthly' THEN COALESCE(_period_end, now() + interval '31 days') ELSE NULL END
  );

  RETURN 'granted';
END;
$function$;

-- ============ 5. proportional, non-repeating reversal ============
CREATE OR REPLACE FUNCTION public.ai_billing_reverse(
  _payment_ref text,
  _refunded_cents bigint,
  _reason text
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  p public.ai_purchases;
  share numeric;
  target integer;
  take integer;
  before_total integer;
  after_total integer;
  removed integer;
BEGIN
  SELECT * INTO p FROM public.ai_purchases
    WHERE provider = 'stripe' AND payment_ref = _payment_ref FOR UPDATE;
  IF p.id IS NULL THEN RETURN 'unknown_payment'; END IF;

  IF p.amount_paid_cents IS NULL OR p.amount_paid_cents <= 0 OR _refunded_cents IS NULL THEN
    share := 1;
  ELSE
    share := LEAST(1::numeric, _refunded_cents::numeric / p.amount_paid_cents::numeric);
  END IF;

  target := FLOOR(p.credits * share)::integer;
  take := target - p.credits_reversed;
  IF take <= 0 THEN RETURN 'already_reversed'; END IF;

  SELECT monthly_balance + purchased_balance INTO before_total
    FROM public.ai_credit_wallets WHERE user_id = p.user_id;

  PERFORM public.ai_credits_revoke(
    p.user_id, p.bucket, take,
    'reverse:' || _payment_ref || ':' || target::text,
    COALESCE(_reason, 'Payment reversed — credits removed')
  );

  SELECT monthly_balance + purchased_balance INTO after_total
    FROM public.ai_credit_wallets WHERE user_id = p.user_id;

  removed := GREATEST(0, COALESCE(before_total, 0) - COALESCE(after_total, 0));

  UPDATE public.ai_purchases
    SET credits_reversed = target,
        -- credits already spent cannot be clawed back from the wallet; they are
        -- recorded as owed rather than quietly written off.
        credits_owed = credits_owed + GREATEST(0, take - removed)
    WHERE id = p.id;

  RETURN 'reversed';
END;
$function$;

-- ============ 6. privileges: server only ============
REVOKE ALL ON FUNCTION public.ai_billing_claim_event(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_billing_finish_event(text, text, boolean, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_billing_fulfill(uuid, text, text, text, integer, text, text, text, timestamptz, timestamptz, bigint, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_billing_reverse(text, bigint, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_billing_link_customer(uuid, text, text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.ai_billing_claim_event(text, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_billing_finish_event(text, text, boolean, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_billing_fulfill(uuid, text, text, text, integer, text, text, text, timestamptz, timestamptz, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_billing_reverse(text, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_billing_link_customer(uuid, text, text, text) TO service_role;