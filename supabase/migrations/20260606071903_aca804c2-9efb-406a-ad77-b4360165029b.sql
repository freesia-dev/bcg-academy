
CREATE TABLE public.certificate_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL UNIQUE REFERENCES public.courses(id) ON DELETE CASCADE,
  heading text NOT NULL DEFAULT 'SERTIFIKAT KELULUSAN',
  subheading text NOT NULL DEFAULT 'Diberikan kepada',
  body_text text NOT NULL DEFAULT 'atas keberhasilan menyelesaikan kursus "{course}" dengan memenuhi seluruh modul, pelajaran, dan uji kompetensi yang dipersyaratkan.',
  organization_name text NOT NULL DEFAULT 'LPK BORNEO CITRA GEMILANG',
  organization_location text NOT NULL DEFAULT 'Bontang, Kalimantan Timur',
  signer_name text NOT NULL DEFAULT 'Direktur LPK BCG',
  signer_title text NOT NULL DEFAULT 'Direktur',
  cert_prefix text NOT NULL DEFAULT 'LPK-BCG',
  date_format text NOT NULL DEFAULT 'long',
  accent_color text NOT NULL DEFAULT '#C79E2E',
  bg_color text NOT NULL DEFAULT '#FCFBED',
  text_color text NOT NULL DEFAULT '#0F0F1A',
  footer_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificate_templates TO authenticated;
GRANT ALL ON public.certificate_templates TO service_role;

ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read certificate templates"
ON public.certificate_templates FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins insert certificate templates"
ON public.certificate_templates FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update certificate templates"
ON public.certificate_templates FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete certificate templates"
ON public.certificate_templates FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_certificate_templates_updated_at
BEFORE UPDATE ON public.certificate_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
