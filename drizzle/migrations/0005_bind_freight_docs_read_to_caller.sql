DROP POLICY IF EXISTS "freight docs read" ON storage.objects;
CREATE POLICY "freight docs read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'freight-docs' AND EXISTS (
    SELECT 1 FROM public.freight_documents d
    WHERE d.storage_path = objects.name
      AND (
        d.uploaded_by = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.company_members cm
          WHERE cm.company_id = d.company_id
            AND cm.user_id = (select auth.uid())
            AND cm.status = 'active'
        )
      )
  )
);