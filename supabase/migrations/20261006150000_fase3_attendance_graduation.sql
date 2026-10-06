-- ============ FASE 3: ABSENSI, KELULUSAN, SERTIFIKAT ============
-- 1) Pertemuan per angkatan (batch_sessions) + absensi per peserta (attendance)
-- 2) Minimal kehadiran per program
-- 3) Data sertifikat di pendaftaran + logo/tanda tangan/QR di template
-- 4) Fungsi admin: tandai / cabut kelulusan (massal)
-- 5) Verifikasi sertifikat publik v2 (nomor lengkap atau kode, plus info angkatan)

-- 1a) Pertemuan --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.batch_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  title text NOT NULL DEFAULT '',
  topic text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS batch_sessions_batch_idx ON public.batch_sessions(batch_id, session_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batch_sessions TO authenticated;
GRANT ALL ON public.batch_sessions TO service_role;
ALTER TABLE public.batch_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View batch sessions" ON public.batch_sessions;
CREATE POLICY "View batch sessions" ON public.batch_sessions FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.batch_id = batch_sessions.batch_id AND e.user_id = auth.uid() AND e.status::text IN ('active', 'completed')
  )
);
DROP POLICY IF EXISTS "Admins manage batch sessions" ON public.batch_sessions;
CREATE POLICY "Admins manage batch sessions" ON public.batch_sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- 1b) Absensi ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.batch_sessions(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('hadir', 'izin', 'sakit', 'alpa')),
  note text,
  marked_by uuid DEFAULT auth.uid(),
  marked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, enrollment_id)
);
CREATE INDEX IF NOT EXISTS attendance_enrollment_idx ON public.attendance(enrollment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View attendance" ON public.attendance;
CREATE POLICY "View attendance" ON public.attendance FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')
  OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.id = attendance.enrollment_id AND e.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Admins manage attendance" ON public.attendance;
CREATE POLICY "Admins manage attendance" ON public.attendance FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- 2) Minimal kehadiran -------------------------------------------------------------
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS min_attendance smallint NOT NULL DEFAULT 75;
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_min_attendance_check;
ALTER TABLE public.courses ADD CONSTRAINT courses_min_attendance_check CHECK (min_attendance BETWEEN 0 AND 100);

-- 3) Sertifikat --------------------------------------------------------------------
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS certificate_number text;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS certificate_issued_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS enrollments_certificate_number_key
  ON public.enrollments (certificate_number) WHERE certificate_number IS NOT NULL;
UPDATE public.enrollments SET certificate_issued_at = COALESCE(certificate_issued_at, completed_at, now())
WHERE certificate_url IS NOT NULL AND certificate_issued_at IS NULL;

ALTER TABLE public.certificate_templates ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.certificate_templates ADD COLUMN IF NOT EXISTS signature_url text;
ALTER TABLE public.certificate_templates ADD COLUMN IF NOT EXISTS show_qr boolean NOT NULL DEFAULT true;
ALTER TABLE public.certificate_templates ALTER COLUMN body_text
  SET DEFAULT 'atas keberhasilan menyelesaikan pelatihan "{course}" yang diselenggarakan oleh LPK Borneo Citra Gemilang.';

-- 4) Tandai / cabut kelulusan (massal) ------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_graduation(_enrollment_ids uuid[], _graduated boolean)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')) THEN
    RAISE EXCEPTION 'Hanya admin yang dapat mengubah kelulusan';
  END IF;

  IF _graduated THEN
    UPDATE public.enrollments
       SET status = 'completed', completed_at = COALESCE(completed_at, now())
     WHERE id = ANY(_enrollment_ids) AND status::text IN ('active', 'completed');
  ELSE
    -- cabut kelulusan: sertifikat ikut tidak berlaku (verifikasi publik gagal)
    UPDATE public.enrollments
       SET status = 'active', completed_at = NULL,
           certificate_url = NULL, certificate_number = NULL, certificate_issued_at = NULL
     WHERE id = ANY(_enrollment_ids) AND status::text = 'completed';
  END IF;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.set_graduation(uuid[], boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_graduation(uuid[], boolean) TO authenticated;

-- 5) Verifikasi sertifikat v2 ------------------------------------------------------
DROP FUNCTION IF EXISTS public.verify_certificate(text);
CREATE FUNCTION public.verify_certificate(_code text)
RETURNS TABLE (
  participant text, course_title text, issued_at timestamptz, cert_code text,
  cert_number text, batch_name text, batch_start date, batch_end date
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH q AS (
    SELECT upper(trim(coalesce(_code, ''))) AS raw,
           upper(regexp_replace(
             CASE WHEN position('/' in coalesce(_code, '')) > 0
                  THEN regexp_replace(trim(_code), '^.*/', '') ELSE coalesce(_code, '') END,
             '[^A-Za-z0-9]', '', 'g')) AS short
  )
  SELECT COALESCE(p.full_name, 'Peserta'), c.title,
         COALESCE(e.certificate_issued_at, e.completed_at), upper(left(e.id::text, 8)),
         e.certificate_number, b.name, b.start_date, b.end_date
  FROM q, public.enrollments e
  JOIN public.courses c ON c.id = e.course_id
  LEFT JOIN public.profiles p ON p.id = e.user_id
  LEFT JOIN public.batches b ON b.id = e.batch_id
  WHERE e.certificate_url IS NOT NULL
    AND e.status::text = 'completed'
    AND length(q.short) >= 6
    AND (upper(e.certificate_number) = q.raw OR upper(left(e.id::text, 8)) = q.short)
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;
