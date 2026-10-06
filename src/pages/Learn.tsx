import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Circle, PlayCircle, FileText, FileQuestion, Lock, ArrowLeft, ArrowRight, Award, Loader2, ListChecks, Download } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Lesson = {
  id: string;
  module_id: string;
  title: string;
  content_type: string | null;
  video_url: string | null;
  content_md: string | null;
  file_url: string | null;
  embed_html: string | null;
  duration_min: number | null;
  sort_order: number | null;
};
type Quiz = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  passing_score: number | null;
  questions: any;
};
type Module = {
  id: string;
  title: string;
  description: string | null;
  sort_order: number | null;
  lessons: Lesson[];
  quizzes: Quiz[];
};
type Course = { id: string; slug: string; title: string; type: string | null };

type ActiveItem =
  | { kind: "lesson"; data: Lesson }
  | { kind: "quiz"; data: Quiz }
  | null;

const toEmbed = (url: string) => {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith("/embed/")) return url;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    return url;
  } catch {
    return url;
  }
};

const isVideoFile = (url: string) => /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);

const Learn = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [progress, setProgress] = useState<Set<string>>(new Set());
  const [attempts, setAttempts] = useState<Record<string, { score: number; passed: boolean }>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeKind, setActiveKind] = useState<"lesson" | "quiz">("lesson");
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [certPath, setCertPath] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const { brand } = useSiteConfig();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/auth?redirect=/learn/${slug}`);
      return;
    }
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: c } = await supabase
        .from("courses")
        .select("id, slug, title, type")
        .eq("slug", slug)
        .maybeSingle();
      if (!c) {
        setLoading(false);
        return;
      }
      setCourse(c as Course);

      const { data: enr } = await supabase
        .from("enrollments")
        .select("status, certificate_url")
        .eq("user_id", user.id)
        .eq("course_id", c.id)
        .in("status", ["active", "completed"])
        .maybeSingle();
      setEnrolled(!!enr);
      setCertPath((enr as any)?.certificate_url ?? null);
      if (!enr) {
        setLoading(false);
        return;
      }

      const { data: mods } = await supabase.from("modules").select("*").eq("course_id", c.id).order("sort_order");

      const modIds = (mods || []).map((m: any) => m.id);
      const { data: realLessons } = await supabase
        .from("lessons")
        .select("*")
        .in("module_id", modIds.length ? modIds : ["00000000-0000-0000-0000-000000000000"])
        .order("sort_order");
      // quiz_public strips the correct-answer key server-side before it ever
      // reaches the browser — students only ever see question text + options.
      const { data: realQuizzes } = await supabase
        .from("quiz_public")
        .select("*")
        .in("module_id", modIds.length ? modIds : ["00000000-0000-0000-0000-000000000000"]);

      const combined: Module[] = (mods || []).map((m: any) => ({
        ...m,
        lessons: (realLessons || []).filter((l: any) => l.module_id === m.id),
        quizzes: (realQuizzes || []).filter((q: any) => q.module_id === m.id),
      }));
      setModules(combined);

      const lessonIds = (realLessons || []).map((l: any) => l.id);
      if (lessonIds.length) {
        const { data: prog } = await supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("user_id", user.id)
          .in("lesson_id", lessonIds);
        setProgress(new Set((prog || []).map((p: any) => p.lesson_id)));
      }
      const quizIds = (realQuizzes || []).map((q: any) => q.id);
      if (quizIds.length) {
        const { data: atts } = await supabase
          .from("quiz_attempts")
          .select("quiz_id, score, passed")
          .eq("user_id", user.id)
          .in("quiz_id", quizIds);
        const map: Record<string, { score: number; passed: boolean }> = {};
        (atts || []).forEach((a: any) => {
          const cur = map[a.quiz_id];
          if (!cur || a.score > cur.score) map[a.quiz_id] = { score: a.score, passed: a.passed };
        });
        setAttempts(map);
      }

      // lanjutkan dari pelajaran pertama yang belum selesai
      const doneIds = new Set<string>();
      if (lessonIds.length) {
        const { data: prog2 } = await supabase.from("lesson_progress").select("lesson_id").eq("user_id", user.id).in("lesson_id", lessonIds);
        (prog2 || []).forEach((p: any) => doneIds.add(p.lesson_id));
      }
      const flat = combined.flatMap((m) => m.lessons);
      const first = flat.find((l) => !doneIds.has(l.id)) || flat[0];
      if (first) {
        setActiveId(first.id);
        setActiveKind("lesson");
      } else {
        const firstQ = combined.find((m) => m.quizzes.length)?.quizzes[0];
        if (firstQ) {
          setActiveId(firstQ.id);
          setActiveKind("quiz");
        }
      }
      setLoading(false);
    })();
  }, [slug, user, authLoading, navigate]);

  const allLessons = useMemo(() => modules.flatMap((m) => m.lessons), [modules]);
  const completionPct = allLessons.length
    ? Math.round((Array.from(progress).filter((id) => allLessons.some((l) => l.id === id)).length / allLessons.length) * 100)
    : 0;

  const active: ActiveItem = useMemo(() => {
    if (!activeId) return null;
    if (activeKind === "lesson") {
      const l = allLessons.find((x) => x.id === activeId);
      return l ? { kind: "lesson", data: l } : null;
    }
    const q = modules.flatMap((m) => m.quizzes).find((x) => x.id === activeId);
    return q ? { kind: "quiz", data: q } : null;
  }, [activeId, activeKind, allLessons, modules]);

  const markComplete = async (lessonId: string) => {
    if (!user || progress.has(lessonId)) return true;
    const { error } = await supabase
      .from("lesson_progress")
      .insert({ user_id: user.id, lesson_id: lessonId });
    if (error) {
      toast.error("Gagal menyimpan progress");
      return false;
    }
    setProgress((s) => new Set(s).add(lessonId));
    toast.success("Pelajaran selesai");
    return true;
  };

  const allQuizzes = useMemo(() => modules.flatMap((m) => m.quizzes), [modules]);
  const sequence = useMemo(
    () => modules.flatMap((m) => [
      ...m.lessons.map((l) => ({ kind: "lesson" as const, id: l.id })),
      ...m.quizzes.map((q) => ({ kind: "quiz" as const, id: q.id })),
    ]),
    [modules],
  );
  const seqIndex = sequence.findIndex((x) => x.id === activeId);
  const goTo = (i: number) => {
    const t = sequence[i];
    if (!t) return;
    setActiveId(t.id); setActiveKind(t.kind);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const allLessonsDone = allLessons.length > 0 && allLessons.every((l) => progress.has(l.id));
  const allQuizzesPassed = allQuizzes.every((q) => attempts[q.id]?.passed);
  const canClaim = (allLessons.length > 0 || allQuizzes.length > 0) && allLessonsDone && allQuizzesPassed;

  const openCertificate = async (path: string) => {
    const { data, error } = await supabase.storage.from("certificates").createSignedUrl(path, 60 * 60);
    if (error || !data?.signedUrl) { toast.error("Gagal membuka sertifikat"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const claimCertificate = async () => {
    if (!course) return;
    setClaiming(true);
    const { data, error } = await supabase.functions.invoke("issue-certificate", { body: { course_id: course.id } });
    setClaiming(false);
    if (error) { toast.error(error.message || "Gagal menerbitkan sertifikat"); return; }
    if ((data as any)?.error) { toast.error((data as any).error); return; }
    const path = (data as any)?.path as string | undefined;
    const url = (data as any)?.url as string | undefined;
    if (path) setCertPath(path);
    toast.success("Sertifikat berhasil diterbitkan!");
    if (url) window.open(url, "_blank");
  };

  const isOnline = course?.type === "online";
  const doneLessons = allLessons.filter((l) => progress.has(l.id)).length;
  const position = seqIndex >= 0 ? seqIndex + 1 : 0;

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="pt-28 pb-20 container mx-auto px-4">{children}</main>
      <Footer />
    </div>
  );

  if (authLoading || loading) {
    return shell(
      <>
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid lg:grid-cols-[1fr_340px] gap-6">
          <Skeleton className="aspect-video w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </>,
    );
  }

  if (!course) {
    return shell(
      <div className="max-w-xl mx-auto text-center rounded-2xl border bg-card p-10">
        <h1 className="text-2xl font-bold mb-2">Program tidak ditemukan</h1>
        <p className="text-muted-foreground mb-6">Tautan mungkin sudah berubah.</p>
        <Button asChild variant="gold"><Link to="/kursus">Lihat program</Link></Button>
      </div>,
    );
  }

  if (!enrolled) {
    return shell(
      <div className="max-w-xl mx-auto text-center rounded-2xl border bg-card p-10 space-y-4">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gold/15 text-gold-dark"><Lock className="h-7 w-7" /></span>
        <h1 className="text-2xl font-bold text-primary">Materi untuk peserta aktif</h1>
        <p className="text-muted-foreground">Materi {course.title} terbuka setelah pendaftaran Anda aktif (pembayaran sudah diverifikasi).</p>
        <div className="flex flex-wrap gap-2 justify-center">
          <Button asChild variant="gold"><Link to={`/kursus/${slug}`}>Lihat program</Link></Button>
          <Button asChild variant="outline"><Link to="/kursus-saya">Dashboard Saya</Link></Button>
        </div>
      </div>,
    );
  }

  const outline = (
    <nav aria-label="Daftar materi" className="space-y-5">
      {modules.length === 0 && <p className="text-sm text-muted-foreground">Belum ada modul.</p>}
      {modules.map((m, mi) => {
        const total = m.lessons.length;
        const done = m.lessons.filter((l) => progress.has(l.id)).length;
        return (
          <div key={m.id}>
            <div className="flex items-baseline justify-between gap-2 mb-1.5 px-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Modul {mi + 1} · {m.title}</p>
              {total > 0 && <span className="text-[11px] tabular-nums text-muted-foreground">{done}/{total}</span>}
            </div>
            <ul className="space-y-0.5">
              {m.lessons.map((l) => {
                const isDone = progress.has(l.id);
                const isActive = activeKind === "lesson" && activeId === l.id;
                return (
                  <li key={l.id}>
                    <button onClick={() => { setActiveId(l.id); setActiveKind("lesson"); setOutlineOpen(false); window.scrollTo({ top: 0 }); }}
                      aria-current={isActive ? "step" : undefined}
                      className={`w-full flex items-center gap-2.5 text-left text-sm px-2.5 py-2 rounded-lg transition-colors ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
                      {isDone
                        ? <CheckCircle2 className={`h-4 w-4 shrink-0 ${isActive ? "text-gold" : "text-emerald-600"}`} />
                        : <Circle className={`h-4 w-4 shrink-0 ${isActive ? "text-primary-foreground/60" : "text-muted-foreground/60"}`} />}
                      <span className="flex-1 line-clamp-2">{l.title}</span>
                      {l.content_type === "text" ? <FileText className="h-3.5 w-3.5 shrink-0 opacity-50" /> : <PlayCircle className="h-3.5 w-3.5 shrink-0 opacity-50" />}
                      {l.duration_min ? <span className={`text-[11px] ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{l.duration_min}m</span> : null}
                    </button>
                  </li>
                );
              })}
              {m.quizzes.map((q) => {
                const att = attempts[q.id];
                const isActive = activeKind === "quiz" && activeId === q.id;
                return (
                  <li key={q.id}>
                    <button onClick={() => { setActiveId(q.id); setActiveKind("quiz"); setOutlineOpen(false); window.scrollTo({ top: 0 }); }}
                      className={`w-full flex items-center gap-2.5 text-left text-sm px-2.5 py-2 rounded-lg transition-colors ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
                      <FileQuestion className={`h-4 w-4 shrink-0 ${att?.passed ? "text-emerald-600" : "opacity-60"}`} />
                      <span className="flex-1 line-clamp-2">Kuis: {q.title}</span>
                      {att && <Badge variant={att.passed ? "default" : "secondary"} className="text-[11px]">{att.score}</Badge>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  const certAction = certPath ? (
    <Button variant="gold" size="sm" onClick={() => openCertificate(certPath)} aria-label="Unduh sertifikat"><Award className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Sertifikat</span></Button>
  ) : isOnline && canClaim ? (
    <Button variant="gold" size="sm" onClick={claimCertificate} disabled={claiming}>
      {claiming ? <Loader2 className="h-4 w-4 sm:mr-1.5 animate-spin" /> : <Award className="h-4 w-4 sm:mr-1.5" />}<span className="hidden sm:inline">Klaim sertifikat</span>
    </Button>
  ) : null;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Bilah atas ruang belajar */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Kembali ke Dashboard Saya">
            <Link to="/kursus-saya"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <img src={brand.logo} alt={brand.name} className="hidden md:block h-7 w-auto" />
          <span className="hidden md:block h-6 w-px bg-border" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-primary truncate leading-tight">{course.title}</p>
            <p className="text-xs text-muted-foreground">{sequence.length ? `Langkah ${position} dari ${sequence.length}` : "Ruang belajar"}</p>
          </div>
          <div className="hidden md:block w-44">
            <div className="flex justify-between text-[11px] mb-1"><span className="text-muted-foreground">{doneLessons}/{allLessons.length} pelajaran</span><span className="font-semibold">{completionPct}%</span></div>
            <Progress value={completionPct} className="h-1.5" />
          </div>
          {certAction}
          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setOutlineOpen(true)} aria-label="Daftar materi"><ListChecks className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Materi</span></Button>
        </div>
        <Progress value={completionPct} className="h-0.5 rounded-none md:hidden" />
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8">
        {isOnline && canClaim && !certPath && (
          <div className="mb-6 rounded-2xl border border-gold/40 bg-gold/10 p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Award className="h-8 w-8 text-gold-dark" />
              <div>
                <p className="font-bold text-primary">Selamat! Semua materi dan kuis sudah selesai.</p>
                <p className="text-sm text-muted-foreground">Klaim sertifikat kelulusan Anda sekarang.</p>
              </div>
            </div>
            <Button variant="gold" onClick={claimCertificate} disabled={claiming}>
              {claiming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Award className="h-4 w-4 mr-2" />}Klaim sertifikat
            </Button>
          </div>
        )}

        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
          <div className="min-w-0 space-y-4">
            {active?.kind === "lesson" && <LessonView lesson={active.data} done={progress.has(active.data.id)}
              onComplete={() => markComplete(active.data.id)}
              hasPrev={seqIndex > 0} hasNext={seqIndex >= 0 && seqIndex < sequence.length - 1}
              onPrev={() => goTo(seqIndex - 1)}
              onNext={async () => { if (await markComplete(active.data.id)) goTo(seqIndex + 1); }} />}
            {active?.kind === "quiz" && <QuizView quiz={active.data} prev={attempts[active.data.id]} userId={user!.id} onSubmitted={(r) => setAttempts((m) => ({ ...m, [active.data.id]: r }))} />}
            {!active && (
              <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">Materi untuk program ini belum diunggah. Cek lagi nanti.</div>
            )}
          </div>

          <aside className="hidden lg:block sticky top-24">
            <div className="rounded-2xl border bg-card p-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
              <p className="font-semibold text-sm mb-4 px-1">Daftar materi</p>
              {outline}
              {!isOnline && (
                <p className="mt-5 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">Sertifikat program tatap muka diterbitkan admin setelah Anda dinyatakan lulus (berdasarkan kehadiran).</p>
              )}
            </div>
          </aside>
        </div>
      </main>

      <Sheet open={outlineOpen} onOpenChange={setOutlineOpen}>
        <SheetContent side="right" className="w-[320px] sm:w-[380px] overflow-y-auto">
          <SheetTitle className="mb-4">Daftar materi</SheetTitle>
          {outline}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const LessonView = ({ lesson, done, onComplete, hasPrev, hasNext, onPrev, onNext }: {
  lesson: Lesson; done: boolean; onComplete: () => void; hasPrev: boolean; hasNext: boolean; onPrev: () => void; onNext: () => void;
}) => {
  const url = lesson.video_url || lesson.file_url || "";
  const showVideo = lesson.content_type === "video" || (!!lesson.video_url);
  return (
    <Card className="rounded-2xl shadow-none overflow-hidden">
      {showVideo && url && (
        isVideoFile(url) ? (
          <video src={url} controls className="w-full bg-black aspect-video" />
        ) : (
          <div className="aspect-video w-full bg-black">
            <iframe src={toEmbed(url)} title={lesson.title} className="w-full h-full" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        )
      )}
      {lesson.embed_html && (
        <div className="aspect-video w-full bg-black" dangerouslySetInnerHTML={{ __html: lesson.embed_html }} />
      )}
      <CardContent className="p-6 md:p-8 space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            {showVideo ? <PlayCircle className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
            {showVideo ? "Video" : lesson.file_url ? "Dokumen" : "Bacaan"}
            {lesson.duration_min ? <span>· {lesson.duration_min} menit</span> : null}
            {done && <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Selesai</span>}
          </div>
          <h2 className="mt-1.5 text-2xl md:text-[28px] font-bold text-primary leading-tight text-balance">{lesson.title}</h2>
        </div>

        {lesson.content_md && (
          <div className="whitespace-pre-wrap text-[15px] leading-7 text-foreground/90 max-w-3xl">{lesson.content_md}</div>
        )}

        {lesson.file_url && !showVideo && (
          <a href={lesson.file_url} target="_blank" rel="noreferrer"
            className="flex items-center gap-3 rounded-xl border p-4 hover:border-primary/40 hover:bg-secondary/40 transition-colors max-w-md">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><FileText className="h-5 w-5" /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold">Unduh materi</span>
              <span className="block text-xs text-muted-foreground truncate">{decodeURIComponent(lesson.file_url.split("/").pop()?.split("?")[0] || "file")}</span>
            </span>
            <Download className="h-4 w-4 text-muted-foreground" />
          </a>
        )}

        {!showVideo && !lesson.content_md && !lesson.embed_html && !lesson.file_url && (
          <p className="text-sm text-muted-foreground">Isi pelajaran ini belum tersedia.</p>
        )}

        <div className="pt-5 border-t flex items-center justify-between gap-2 flex-wrap">
          <Button variant="ghost" onClick={onPrev} disabled={!hasPrev}><ArrowLeft className="h-4 w-4 mr-1" />Sebelumnya</Button>
          <div className="flex gap-2">
            {!done && hasNext && <Button variant="outline" onClick={onComplete}>Tandai selesai</Button>}
            {hasNext ? (
              <Button variant="gold" onClick={onNext}>{done ? "Lanjut" : "Selesai & lanjut"}<ArrowRight className="h-4 w-4 ml-1" /></Button>
            ) : (
              <Button variant={done ? "outline" : "gold"} onClick={onComplete} disabled={done}>
                {done ? <><CheckCircle2 className="h-4 w-4 mr-2" />Selesai</> : "Tandai selesai"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const QuizView = ({
  quiz,
  prev,
  onSubmitted,
}: {
  quiz: Quiz;
  prev?: { score: number; passed: boolean };
  userId: string;
  onSubmitted: (r: { score: number; passed: boolean }) => void;
}) => {
  const questions: any[] = Array.isArray(quiz.questions) ? quiz.questions : [];
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(prev ?? null);

  useEffect(() => {
    setAnswers({});
    setResult(prev ?? null);
  }, [quiz.id, prev]);

  const submit = async () => {
    if (questions.length === 0) return;
    setSubmitting(true);
    // Penilaian di server (submit-quiz) — kunci jawaban tidak pernah dikirim ke browser.
    const { data, error } = await supabase.functions.invoke("submit-quiz", { body: { quiz_id: quiz.id, answers } });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Gagal menyimpan kuis");
      return;
    }
    const { score, passed } = data as { score: number; passed: boolean };
    setResult({ score, passed });
    onSubmitted({ score, passed });
    toast[passed ? "success" : "error"](passed ? `Lulus! Skor ${score}` : `Belum lulus. Skor ${score}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const answered = Object.keys(answers).length;

  return (
    <Card className="rounded-2xl shadow-none">
      <CardContent className="p-6 md:p-8 space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <FileQuestion className="h-3.5 w-3.5" />Kuis · {questions.length} soal · nilai lulus {quiz.passing_score ?? 70}
          </div>
          <h2 className="mt-1.5 text-2xl md:text-[28px] font-bold text-primary leading-tight">{quiz.title}</h2>
          {quiz.description && <p className="text-sm text-muted-foreground mt-2">{quiz.description}</p>}
        </div>

        {result && (
          <div className={`rounded-xl p-4 text-sm flex items-center gap-3 ${result.passed ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            <span className="text-2xl font-bold tabular-nums">{result.score}</span>
            <span>{result.passed ? "Lulus. Anda boleh mengulang untuk memperbaiki nilai." : "Belum lulus. Pelajari lagi materinya lalu coba kembali."}</span>
          </div>
        )}

        {questions.length === 0 && <p className="text-sm text-muted-foreground">Soal belum tersedia.</p>}

        <ol className="space-y-7">
          {questions.map((q, i) => (
            <li key={i} className="space-y-3">
              <p className="font-medium leading-relaxed"><span className="text-muted-foreground mr-1.5">{i + 1}.</span>{q.question}</p>
              <RadioGroup value={answers[i]?.toString() ?? ""} onValueChange={(v) => setAnswers((a) => ({ ...a, [i]: parseInt(v) }))} className="gap-2">
                {(q.options || []).map((opt: string, oi: number) => (
                  <Label key={oi} htmlFor={`q${i}-o${oi}`}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 font-normal cursor-pointer transition-colors ${answers[i] === oi ? "border-primary bg-primary/5" : "hover:bg-secondary/60"}`}>
                    <RadioGroupItem value={oi.toString()} id={`q${i}-o${oi}`} />
                    <span className="leading-snug">{opt}</span>
                  </Label>
                ))}
              </RadioGroup>
            </li>
          ))}
        </ol>

        {questions.length > 0 && (
          <div className="pt-5 border-t flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm text-muted-foreground">{answered} dari {questions.length} soal dijawab</span>
            <Button variant="gold" onClick={submit} disabled={submitting || answered !== questions.length}>
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mengirim…</> : "Kirim jawaban"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Learn;
