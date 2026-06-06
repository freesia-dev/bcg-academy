
CREATE POLICY "Users upload own payment proof" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users read own payment proof" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "Admins delete payment proof" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(),'admin'));

-- Payment info site_content
INSERT INTO public.site_content (key, value) VALUES
('payment_info', jsonb_build_object(
  'bank_name','BCA',
  'account_number','1234567890',
  'account_holder','LPK Borneo Citra Gemilang',
  'qris_url','',
  'instructions','Transfer sesuai nominal kursus, lalu upload bukti. Verifikasi admin maks 1×24 jam.'
))
ON CONFLICT (key) DO NOTHING;
