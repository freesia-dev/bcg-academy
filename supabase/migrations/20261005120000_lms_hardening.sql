-- ============ LMS HARDENING ============
-- Masalah sebelumnya:
--  1) Siswa bisa INSERT/UPDATE enrollments langsung dari browser, termasuk mengisi
--     status = 'active' (kursus berbayar jadi gratis) dan payment_amount sesuka hati.
--  2) Seluruh isi pelajaran (video_url, materi, file) bisa dibaca siapa saja lewat API
--     karena policy SELECT lessons hanya mengecek kursus sudah publish.
-- Perbaikan: pendaftaran lewat fungsi server (nominal diambil dari harga kursus),
-- isi pelajaran hanya untuk peserta aktif / pelajaran preview / admin, dan silabus
-- publik lewat view `lesson_outline` yang tidak memuat isi materi.

-- 1) Tutup penulisan langsung oleh siswa ------------------------------------------
DROP POLICY IF EXISTS "Users create own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users update own pending enrollments" ON public.enrollments;

CREATE OR REPLACE FUNCTION public.enroll_in_course(
  _course_id uuid,
  _method text DEFAULT NULL,
  _proof_path text DEFAULT NULL
) RETURNS public.enrollments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  c public.courses;
  e public.enrollments;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Silakan login terlebih dahulu'; END IF;

  SELECT * INTO c FROM public.courses WHERE id = _course_id AND is_published = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Kursus tidak tersedia'; END IF;

  SELECT * INTO e FROM public.enrollments WHERE user_id = uid AND course_id = _course_id;
  IF FOUND AND e.status IN ('active', 'completed') THEN RETURN e; END IF;

  IF COALESCE(c.is_free, false) OR COALESCE(c.price, 0) = 0 THEN
    INSERT INTO public.enrollments (user_id, course_id, status, payment_amount, paid_at)
    VALUES (uid, _course_id, 'active', 0, now())
    ON CONFLICT (user_id, course_id)
    DO UPDATE SET status = 'active', payment_amount = 0, paid_at = now(), notes = NULL
    RETURNING * INTO e;
  ELSE
    IF _proof_path IS NULL OR _proof_path NOT LIKE (uid::text || '/%') THEN
      RAISE EXCEPTION 'Bukti pembayaran wajib diunggah';
    END IF;
    INSERT INTO public.enrollments (user_id, course_id, status, payment_method, payment_proof_url, payment_amount, enrolled_at)
    VALUES (uid, _course_id, 'pending_payment', _method, _proof_path, c.price, now())
    ON CONFLICT (user_id, course_id)
    DO UPDATE SET status = 'pending_payment', payment_method = EXCLUDED.payment_method,
                  payment_proof_url = EXCLUDED.payment_proof_url, payment_amount = EXCLUDED.payment_amount,
                  paid_at = NULL, notes = NULL, enrolled_at = now()
    RETURNING * INTO e;
  END IF;
  RETURN e;
END $$;

REVOKE ALL ON FUNCTION public.enroll_in_course(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enroll_in_course(uuid, text, text) TO authenticated;

-- 2) Isi pelajaran hanya untuk peserta aktif, preview, atau admin --------------------
DROP POLICY IF EXISTS "View lessons of published courses" ON public.lessons;
CREATE POLICY "View lessons if enrolled or preview" ON public.lessons FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.modules m JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = lessons.module_id
      AND (
        public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')
        OR (c.is_published = true AND (lessons.is_preview = true OR public.has_active_enrollment(auth.uid(), c.id)))
      )
  )
);

-- Silabus publik: judul & metadata saja (tanpa video_url / materi / file)
CREATE OR REPLACE VIEW public.lesson_outline AS
SELECT l.id, l.module_id, l.title, l.content_type, l.duration_min, l.is_preview, l.sort_order
FROM public.lessons l
JOIN public.modules m ON m.id = l.module_id
JOIN public.courses c ON c.id = m.course_id
WHERE c.is_published = true;
GRANT SELECT ON public.lesson_outline TO anon, authenticated;

-- 3) Verifikasi sertifikat publik ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_certificate(_code text)
RETURNS TABLE (participant text, course_title text, issued_at timestamptz, cert_code text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(p.full_name, 'Peserta'), c.title, e.completed_at, upper(left(e.id::text, 8))
  FROM public.enrollments e
  JOIN public.courses c ON c.id = e.course_id
  LEFT JOIN public.profiles p ON p.id = e.user_id
  WHERE e.certificate_url IS NOT NULL
    AND upper(left(e.id::text, 8)) = upper(regexp_replace(CASE WHEN position('/' in _code) > 0 THEN split_part(_code, '/', 3) ELSE _code END, '[^A-Za-z0-9]', '', 'g'))
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;
