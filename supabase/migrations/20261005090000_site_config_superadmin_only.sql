-- Konfigurasi tampilan situs (key = 'site_config') hanya boleh diubah superadmin.
-- Key site_content lain (mis. payment_info) tetap bisa diubah admin.

DROP POLICY IF EXISTS "Admins write site content ins" ON public.site_content;
DROP POLICY IF EXISTS "Admins write site content upd" ON public.site_content;
DROP POLICY IF EXISTS "Admins write site content del" ON public.site_content;

CREATE POLICY "Admins write site content ins" ON public.site_content
  FOR INSERT TO authenticated
  WITH CHECK (
    (key <> 'site_config' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')))
    OR (key = 'site_config' AND public.has_role(auth.uid(), 'superadmin'))
  );

CREATE POLICY "Admins write site content upd" ON public.site_content
  FOR UPDATE TO authenticated
  USING (
    (key <> 'site_config' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')))
    OR (key = 'site_config' AND public.has_role(auth.uid(), 'superadmin'))
  )
  WITH CHECK (
    (key <> 'site_config' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')))
    OR (key = 'site_config' AND public.has_role(auth.uid(), 'superadmin'))
  );

CREATE POLICY "Admins write site content del" ON public.site_content
  FOR DELETE TO authenticated
  USING (
    (key <> 'site_config' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')))
    OR (key = 'site_config' AND public.has_role(auth.uid(), 'superadmin'))
  );
