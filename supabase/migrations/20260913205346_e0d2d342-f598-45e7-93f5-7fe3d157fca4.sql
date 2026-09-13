ALTER TABLE public.billing_events ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz;

CREATE OR REPLACE FUNCTION public.ai_billing_claim_event(_provider text, _event_id text, _type text, _payload jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  e public.billing_events;
BEGIN
  INSERT INTO public.billing_events (provider, event_id, event_type, payload, status, attempts, lease_expires_at)
  VALUES (_provider, _event_id, _type, _payload, 'pending', 1, now() + interval '2 minutes')
  ON CONFLICT (provider, event_id) DO NOTHING
  RETURNING * INTO e;

  IF e.id IS NOT NULL THEN RETURN 'claimed'; END IF;

  SELECT * INTO e FROM public.billing_events
    WHERE public.billing_events.provider = _provider
      AND public.billing_events.event_id = _event_id
    FOR UPDATE;

  IF e.status = 'processed' THEN RETURN 'duplicate'; END IF;

  IF e.status = 'pending' AND e.lease_expires_at IS NOT NULL AND e.lease_expires_at > now() THEN
    RETURN 'in_progress';
  END IF;

  UPDATE public.billing_events
    SET attempts = e.attempts + 1,
        payload = _payload,
        status = 'pending',
        lease_expires_at = now() + interval '2 minutes'
    WHERE public.billing_events.provider = _provider
      AND public.billing_events.event_id = _event_id;

  RETURN 'claimed';
END;
$function$;

DROP FUNCTION IF EXISTS public.ai_billing_finish_event(text, text, boolean, text);
CREATE FUNCTION public.ai_billing_finish_event(_provider text, _event_id text, _ok boolean, _error text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  UPDATE public.billing_events
    SET status = CASE WHEN _ok THEN 'processed' ELSE 'failed' END,
        processed_at = CASE WHEN _ok THEN now() ELSE processed_at END,
        last_error = _error,
        lease_expires_at = NULL
    WHERE public.billing_events.provider = _provider
      AND public.billing_events.event_id = _event_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.ai_billing_claim_event(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_billing_finish_event(text, text, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_billing_claim_event(text, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_billing_finish_event(text, text, boolean, text) TO service_role;