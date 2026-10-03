ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS bol_data JSONB;

COMMENT ON COLUMN public.documents.bol_data IS 'Structured owner-scoped Bill of Lading draft fields; unknown values remain null or empty.';

ALTER TABLE public.documents
ADD CONSTRAINT documents_bol_data_object
CHECK (bol_data IS NULL OR jsonb_typeof(bol_data) = 'object');