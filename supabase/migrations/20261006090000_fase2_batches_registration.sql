-- ============ FASE 2: ANGKATAN & PENDAFTARAN ============
-- 1) Program: kolom syarat & FAQ (satu katalog = tabel courses)
-- 2) Angkatan (batches): tanggal, jadwal, lokasi, kuota, harga khusus, status
-- 3) Pendaftaran terhubung ke angkatan + catatan peserta + status 'waitlist'
-- 4) Fungsi server: daftar (cek kuota), unggah bukti menyusul, batal, sisa kursi publik

-- 1) Program -----------------------------------------------------------------------
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS requirements text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS faq jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2) Angkatan ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date,
  end_date date,
  schedule text,
  location text,
  quota integer CHECK (quota IS NULL OR quota > 0),
  price integer CHECK (price IS NULL OR price >= 0),
  registration_deadline date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('draft','open','closed','running','finished','cancelled')),
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS batches_course_idx ON public.batches(course_id);
GRANT SELECT ON public.batches TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.batches TO authenticated;
GRANT ALL ON public.batches TO service_role;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View batches" ON public.batches;
CREATE POLICY "View batches" ON public.batches FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')
  OR (status <> 'draft' AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.is_published))
);
DROP POLICY IF EXISTS "Admins insert batches" ON public.batches;
CREATE POLICY "Admins insert batches" ON public.batches FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));
DROP POLICY IF EXISTS "Admins update batches" ON public.batches;
CREATE POLICY "Admins update batches" ON public.batches FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));
DROP POLICY IF EXISTS "Admins delete batches" ON public.batches;
CREATE POLICY "Admins delete batches" ON public.batches FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

DROP TRIGGER IF EXISTS batches_updated_at ON public.batches;
CREATE TRIGGER batches_updated_at BEFORE UPDATE ON public.batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Pendaftaran -------------------------------------------------------------------
ALTER TYPE public.enrollment_status ADD VALUE IF NOT EXISTS 'waitlist';
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS participant_note text;
CREATE INDEX IF NOT EXISTS enrollments_batch_idx ON public.enrollments(batch_id);

-- 4a) Sisa kursi per angkatan (publik, tanpa membuka data peserta)
CREATE OR REPLACE FUNCTION public.batch_seats(_course_id uuid DEFAULT NULL)
RETURNS TABLE (batch_id uuid, taken integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.batch_id, count(*)::int
  FROM public.enrollments e
  WHERE e.batch_id IS NOT NULL
    AND e.status::text IN ('pending_payment', 'active', 'completed')
    AND (_course_id IS NULL OR e.course_id = _course_id)
  GROUP BY e.batch_id
$$;
REVOKE ALL ON FUNCTION public.batch_seats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.batch_seats(uuid) TO anon, authenticated;

-- 4b) Daftar program (dengan atau tanpa angkatan). Nominal & status ditentukan server.
CREATE OR REPLACE FUNCTION public.register_program(
  _course_id uuid,
  _batch_id uuid DEFAULT NULL,
  _method text DEFAULT NULL,
  _proof_path text DEFAULT NULL,
  _note text DEFAULT NULL
) RETURNS public.enrollments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  c public.courses;
  b public.batches;
  e public.enrollments;
  taken integer;
  amount integer;
  new_status public.enrollment_status;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Silakan masuk atau buat akun terlebih dahulu'; END IF;

  SELECT * INTO c FROM public.courses WHERE id = _course_id AND is_published = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Program tidak tersedia'; END IF;

  IF _batch_id IS NOT NULL THEN
    -- kunci baris angkatan agar dua pendaftar terakhir tidak melewati kuota bersamaan
    SELECT * INTO b FROM public.batches WHERE id = _batch_id AND course_id = _course_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Angkatan tidak ditemukan'; END IF;
    IF b.status <> 'open' THEN RAISE EXCEPTION 'Pendaftaran untuk angkatan ini sudah ditutup'; END IF;
    IF b.registration_deadline IS NOT NULL AND b.registration_deadline < current_date THEN
      RAISE EXCEPTION 'Batas pendaftaran angkatan ini sudah lewat';
    END IF;
  END IF;

  SELECT * INTO e FROM public.enrollments WHERE user_id = uid AND course_id = _course_id;
  IF FOUND AND e.status::text IN ('active', 'completed') THEN
    RETURN e; -- sudah terdaftar & aktif
  END IF;

  IF _batch_id IS NOT NULL AND b.quota IS NOT NULL THEN
    SELECT count(*) INTO taken FROM public.enrollments
    WHERE batch_id = _batch_id AND user_id <> uid AND status::text IN ('pending_payment', 'active', 'completed');
    IF taken >= b.quota THEN RAISE EXCEPTION 'Maaf, kuota angkatan ini sudah penuh'; END IF;
  END IF;

  IF _proof_path IS NOT NULL AND _proof_path NOT LIKE (uid::text || '/%') THEN
    RAISE EXCEPTION 'Bukti pembayaran tidak valid';
  END IF;

  amount := COALESCE(b.price, CASE WHEN COALESCE(c.is_free, false) THEN 0 ELSE c.price END, 0);

  IF _batch_id IS NULL AND c.type <> 'online' THEN
    new_status := 'waitlist';        -- belum ada jadwal: daftar minat
  ELSIF amount = 0 THEN
    new_status := 'active';
  ELSE
    new_status := 'pending_payment';
  END IF;

  INSERT INTO public.enrollments (user_id, course_id, batch_id, status, payment_method, payment_proof_url,
                                  payment_amount, paid_at, notes, participant_note, enrolled_at)
  VALUES (uid, _course_id, _batch_id, new_status, _method, _proof_path, amount,
          CASE WHEN new_status = 'active' THEN now() END, NULL, NULLIF(trim(_note), ''), now())
  ON CONFLICT (user_id, course_id) DO UPDATE SET
    batch_id = EXCLUDED.batch_id, status = EXCLUDED.status, payment_method = EXCLUDED.payment_method,
    payment_proof_url = EXCLUDED.payment_proof_url, payment_amount = EXCLUDED.payment_amount,
    paid_at = EXCLUDED.paid_at, notes = NULL, participant_note = EXCLUDED.participant_note, enrolled_at = now()
  RETURNING * INTO e;
  RETURN e;
END $$;
REVOKE ALL ON FUNCTION public.register_program(uuid, uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_program(uuid, uuid, text, text, text) TO authenticated;

-- 4c) Unggah bukti bayar menyusul (atau setelah ditolak)
CREATE OR REPLACE FUNCTION public.attach_payment_proof(_enrollment_id uuid, _proof_path text, _method text DEFAULT NULL)
RETURNS public.enrollments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); e public.enrollments;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Silakan masuk terlebih dahulu'; END IF;
  IF _proof_path IS NULL OR _proof_path NOT LIKE (uid::text || '/%') THEN RAISE EXCEPTION 'Bukti pembayaran tidak valid'; END IF;
  UPDATE public.enrollments
     SET payment_proof_url = _proof_path, payment_method = COALESCE(_method, payment_method),
         status = 'pending_payment', notes = NULL
   WHERE id = _enrollment_id AND user_id = uid AND status::text IN ('pending_payment', 'rejected')
  RETURNING * INTO e;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pendaftaran tidak ditemukan atau tidak menunggu pembayaran'; END IF;
  RETURN e;
END $$;
REVOKE ALL ON FUNCTION public.attach_payment_proof(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attach_payment_proof(uuid, text, text) TO authenticated;

-- 4d) Peserta membatalkan pendaftaran yang belum aktif
CREATE OR REPLACE FUNCTION public.cancel_registration(_enrollment_id uuid)
RETURNS public.enrollments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); e public.enrollments;
BEGIN
  UPDATE public.enrollments SET status = 'cancelled'
   WHERE id = _enrollment_id AND user_id = uid AND status::text IN ('waitlist', 'pending_payment', 'rejected')
  RETURNING * INTO e;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pendaftaran tidak dapat dibatalkan'; END IF;
  RETURN e;
END $$;
REVOKE ALL ON FUNCTION public.cancel_registration(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_registration(uuid) TO authenticated;
