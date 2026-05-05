
-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Programs
CREATE TABLE public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  duration TEXT NOT NULL,
  capacity TEXT NOT NULL,
  level TEXT NOT NULL,
  highlights TEXT[] NOT NULL DEFAULT '{}',
  color TEXT NOT NULL DEFAULT 'gold',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active programs" ON public.programs
  FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage programs insert" ON public.programs
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage programs update" ON public.programs
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage programs delete" ON public.programs
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Gallery
CREATE TABLE public.gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'training',
  image_url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gallery" ON public.gallery_items
  FOR SELECT USING (true);

CREATE POLICY "Admins insert gallery" ON public.gallery_items
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update gallery" ON public.gallery_items
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete gallery" ON public.gallery_items
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER programs_updated_at BEFORE UPDATE ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER gallery_updated_at BEFORE UPDATE ON public.gallery_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for gallery
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery', 'gallery', true);

CREATE POLICY "Public read gallery" ON storage.objects
  FOR SELECT USING (bucket_id = 'gallery');

CREATE POLICY "Admins upload gallery" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'gallery' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update gallery files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'gallery' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete gallery files" ON storage.objects
  FOR DELETE USING (bucket_id = 'gallery' AND public.has_role(auth.uid(), 'admin'));

-- Seed programs
INSERT INTO public.programs (title, slug, description, duration, capacity, level, highlights, color, sort_order) VALUES
('Administrasi Perkantoran', 'administrasi-perkantoran', 'Pelajari keterampilan administrasi modern untuk menunjang karir di bidang perkantoran dan manajemen.', '20 Hari', '40 Peserta', 'Pemula - Menengah', ARRAY['Microsoft Office','Manajemen Dokumen','Komunikasi Bisnis'], 'corporate-blue', 1),
('Barista Professional', 'barista-professional', 'Kuasai seni membuat kopi dan manajemen café untuk berkarir di industri F&B yang berkembang pesat.', '20 Hari', '30 Peserta', 'Pemula', ARRAY['Coffee Making','Latte Art','Café Management'], 'accent-red', 2),
('Rias Pengantin Gaun Panjang', 'rias-pengantin', 'Pelajari teknik rias pengantin modern dan tradisional untuk membangun bisnis wedding organizer.', '20 Hari', '20 Peserta', 'Pemula - Mahir', ARRAY['Makeup Artistry','Hair Styling','Wedding Planning'], 'gold', 3),
('Desainer Grafis', 'desainer-grafis', 'Kembangkan kreativitas dan technical skills untuk berkarir sebagai desainer grafis profesional.', '20 Hari', '30 Peserta', 'Pemula - Menengah', ARRAY['Adobe Creative Suite','Branding','Digital Design'], 'corporate-blue', 4),
('Operator Komputer Muda', 'operator-komputer-muda', 'Kuasai keterampilan dasar komputer dan aplikasi perkantoran untuk meningkatkan daya saing kerja.', '10 Hari', '40 Peserta', 'Pemula', ARRAY['Basic Computing','Office Apps','Data Entry'], 'accent-red', 5),
('Digital Marketing', 'digital-marketing', 'Pelajari strategi pemasaran digital terkini untuk mengembangkan bisnis di era digital.', '10 Hari', '40 Peserta', 'Pemula - Menengah', ARRAY['Social Media','SEO/SEM','Content Strategy'], 'gold', 6);
