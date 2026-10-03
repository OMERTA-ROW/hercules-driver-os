DROP POLICY IF EXISTS "documents own" ON public.documents;
CREATE POLICY "documents own" ON public.documents
FOR ALL TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (
  owner_id = auth.uid()
  AND (
    load_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.loads AS linked_load
      WHERE linked_load.id = documents.load_id
        AND (
          linked_load.posted_by = auth.uid()
          OR linked_load.assigned_driver_id = auth.uid()
        )
    )
  )
);