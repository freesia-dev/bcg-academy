
-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ COURSES ============
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cover_image TEXT,
  type TEXT NOT NULL DEFAULT 'online' CHECK (type IN ('online','offline')),
  category TEXT,
  level TEXT NOT NULL DEFAULT 'Pemula',
  duration TEXT,
  capacity TEXT,
  instructor_name TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT true,
  currency TEXT NOT NULL DEFAULT 'IDR',
  is_published BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  highlights TEXT[] NOT NULL DEFAULT '{}',
  color TEXT NOT NULL DEFAULT 'gold',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.courses TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view published courses" ON public.courses FOR SELECT USING (is_published = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update courses" ON public.courses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete courses" ON public.courses FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ MODULES ============
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX modules_course_id_idx ON public.modules(course_id);
GRANT SELECT ON public.modules TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.modules TO authenticated;
GRANT ALL ON public.modules TO service_role;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view modules of published courses" ON public.modules FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND (c.is_published = true OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "Admins manage modules ins" ON public.modules FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage modules upd" ON public.modules FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage modules del" ON public.modules FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ ENROLLMENTS ============
CREATE TYPE public.enrollment_status AS ENUM ('pending_payment','active','completed','cancelled','rejected');

CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status public.enrollment_status NOT NULL DEFAULT 'pending_payment',
  payment_method TEXT,
  payment_proof_url TEXT,
  payment_amount INTEGER,
  paid_at TIMESTAMPTZ,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  certificate_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);
CREATE INDEX enrollments_user_idx ON public.enrollments(user_id);
CREATE INDEX enrollments_course_idx ON public.enrollments(course_id);
GRANT SELECT, INSERT, UPDATE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own enrollments" ON public.enrollments FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users create own enrollments" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own pending enrollments" ON public.enrollments FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = 'pending_payment');
CREATE POLICY "Admins update enrollments" ON public.enrollments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete enrollments" ON public.enrollments FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER enrollments_updated_at BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: active enrollment check
CREATE OR REPLACE FUNCTION public.has_active_enrollment(_user_id UUID, _course_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.enrollments WHERE user_id=_user_id AND course_id=_course_id AND status IN ('active','completed'))
$$;

-- ============ LESSONS ============
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('video','text','file','embed')),
  video_url TEXT,
  content_md TEXT,
  file_url TEXT,
  embed_html TEXT,
  duration_min INTEGER,
  is_preview BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX lessons_module_idx ON public.lessons(module_id);
GRANT SELECT ON public.lessons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
-- Public can see lesson titles (for syllabus); content fields are filtered in app code.
-- For preview lessons: full access. For others: must be enrolled.
CREATE POLICY "View lessons of published courses" ON public.lessons FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.modules m JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = module_id AND (c.is_published = true OR public.has_role(auth.uid(),'admin'))
  )
);
CREATE POLICY "Admins manage lessons ins" ON public.lessons FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage lessons upd" ON public.lessons FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage lessons del" ON public.lessons FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ QUIZZES ============
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Uji Kompetensi',
  description TEXT,
  passing_score INTEGER NOT NULL DEFAULT 70,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quizzes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT ALL ON public.quizzes TO service_role;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enrolled users view quizzes" ON public.quizzes FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.modules m WHERE m.id = module_id AND public.has_active_enrollment(auth.uid(), m.course_id)
  )
);
CREATE POLICY "Admins manage quizzes ins" ON public.quizzes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage quizzes upd" ON public.quizzes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage quizzes del" ON public.quizzes FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ LESSON PROGRESS ============
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);
CREATE INDEX lesson_progress_user_idx ON public.lesson_progress(user_id);
GRANT SELECT, INSERT, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own progress sel" ON public.lesson_progress FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users manage own progress ins" ON public.lesson_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own progress del" ON public.lesson_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ QUIZ ATTEMPTS ============
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX quiz_attempts_user_idx ON public.quiz_attempts(user_id);
GRANT SELECT, INSERT ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own attempts" ON public.quiz_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users create own attempts" ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ SITE CONTENT (Homepage CMS) ============
CREATE TABLE public.site_content (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read site content" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "Admins write site content ins" ON public.site_content FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins write site content upd" ON public.site_content FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins write site content del" ON public.site_content FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER site_content_updated_at BEFORE UPDATE ON public.site_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SEED site_content from Company Profile ============
INSERT INTO public.site_content (key, value) VALUES
('hero', jsonb_build_object(
  'tagline','Membangun Keterampilan, Mewujudkan Masa Depan Gemilang',
  'title','LPK Borneo Citra Gemilang',
  'subtitle','Lembaga Pelatihan Kerja terpercaya di Kota Bontang. Mencetak SDM kompeten, profesional, dan siap kerja melalui pelatihan berbasis SKKNI dengan Sertifikasi BNSP.',
  'cta_primary','Lihat Kursus',
  'cta_secondary','Daftar Sekarang'
)),
('about', jsonb_build_object(
  'title','Tentang BCG Academy',
  'welcome_quote','Kami berkomitmen mencetak SDM unggul, berdaya saing, dan siap kerja melalui program pelatihan berbasis kompetensi sesuai standar nasional.',
  'welcome_author','Euis Paramitha',
  'welcome_role','Direktur LPK Borneo Citra Gemilang',
  'description','LPK Borneo Citra Gemilang (BCG Academy) adalah lembaga pelatihan kerja yang berfokus pada pengembangan keterampilan praktis dan profesional di Kota Bontang dan sekitarnya. Program pelatihan dirancang berdasarkan SKKNI dengan sertifikasi resmi BNSP.',
  'vision','Menjadi lembaga pelatihan kerja unggulan di Kalimantan Timur yang menghasilkan SDM profesional, berkarakter, dan berdaya saing global.',
  'mission','Memberikan pendidikan dan pelatihan kerja berkualitas yang relevan dengan kebutuhan industri dan mengembangkan potensi peserta didik secara optimal.'
)),
('offer', jsonb_build_object(
  'title','Apa yang Kami Tawarkan',
  'items', jsonb_build_array(
    jsonb_build_object('title','Pelatihan Berbasis Kompetensi','desc','Program praktis berdasarkan Standar Kompetensi Kerja Nasional Indonesia (SKKNI).','icon','GraduationCap'),
    jsonb_build_object('title','Sertifikasi Resmi BNSP','desc','Uji kompetensi & sertifikat dari Badan Nasional Sertifikasi Profesi, diakui nasional.','icon','Award'),
    jsonb_build_object('title','Dukungan Karier & Wirausaha','desc','Jejaring perusahaan, UMKM, dan komunitas lokal untuk membuka peluang kerja & usaha.','icon','Briefcase')
  )
)),
('contact', jsonb_build_object(
  'phone','+62 822 5418 7096',
  'email','lpk.borneocg@gmail.com',
  'address','Jl. Dewi Sartika Gg. Kulintang 4 No. 21, Kel. Bontang Baru, Kec. Bontang Utara, Kota Bontang 75311',
  'wa','6282254187096'
)),
('legal', jsonb_build_object(
  'nib','3001250056199',
  'founded','6 Januari 2025',
  'notaris','Winarti Wilami, SH'
));

-- ============ SEED courses from existing programs (offline) ============
INSERT INTO public.courses (slug, title, description, type, level, duration, capacity, price, is_free, is_published, sort_order, highlights, color, category)
SELECT slug, title, description, 'offline', level, duration, capacity, 0, true, true, sort_order, highlights, color, 'Pelatihan Offline'
FROM public.programs
ON CONFLICT (slug) DO NOTHING;
