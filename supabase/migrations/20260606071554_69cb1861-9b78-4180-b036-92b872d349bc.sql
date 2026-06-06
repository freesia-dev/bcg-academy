
CREATE POLICY "Users read own certificates"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'certificates' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins manage certificates"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'certificates' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'certificates' AND public.has_role(auth.uid(), 'admin'));
