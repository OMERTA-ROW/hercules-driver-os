CREATE TABLE public.enterprise_inquiries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  fleet_size integer NOT NULL,
  expected_usage text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.enterprise_inquiries TO authenticated;
GRANT ALL ON public.enterprise_inquiries TO service_role;

ALTER TABLE public.enterprise_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can create their own enterprise inquiry"
ON public.enterprise_inquiries FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Drivers can read their own enterprise inquiries"
ON public.enterprise_inquiries FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER enterprise_inquiries_touch
BEFORE UPDATE ON public.enterprise_inquiries
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX enterprise_inquiries_user_created_idx
ON public.enterprise_inquiries (user_id, created_at DESC);