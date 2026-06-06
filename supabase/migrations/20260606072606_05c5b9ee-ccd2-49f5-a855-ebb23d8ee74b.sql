
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS prerequisite_module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL;

CREATE POLICY "Admins upload course media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update course media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'course-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete course media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'course-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone view course media" ON storage.objects FOR SELECT
  USING (bucket_id = 'course-media');
