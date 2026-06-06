import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Circle, PlayCircle, FileText, FileQuestion, Lock, ArrowLeft, Award, Loader2 } from "lucide-react";
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
type Course = { id: string; slug: string; title: string };

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
        .select("id, slug, title")
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

      const [{ data: mods }, { data: lessons }, { data: quizzes }] = await Promise.all([
        supabase.from("modules").select("*").eq("course_id", c.id).order("sort_order"),
        supabase
          .from("lessons")
          .select("*")
          .in("module_id", []) // placeholder, replaced below
          .order("sort_order"),
        supabase.from("quizzes").select("*"),
      ]);

      const modIds = (mods || []).map((m: any) => m.id);
      const { data: realLessons } = await supabase
        .from("lessons")
        .select("*")
        .in("module_id", modIds.length ? modIds : ["00000000-0000-0000-0000-000000000000"])
        .order("sort_order");
      const { data: realQuizzes } = await supabase
        .from("quizzes")
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

      // auto select first lesson
      const first = combined.find((m) => m.lessons.length)?.lessons[0];
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
    if (!user || progress.has(lessonId)) return;
    const { error } = await supabase
      .from("lesson_progress")
      .insert({ user_id: user.id, lesson_id: lessonId });
    if (error) {
      toast.error("Gagal menyimpan progress");
      return;
    }
    setProgress((s) => new Set(s).add(lessonId));
    toast.success("Pelajaran selesai");
  };

  const allQuizzes = useMemo(() => modules.flatMap((m) => m.quizzes), [modules]);
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-32 pb-20 container mx-auto px-4">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid lg:grid-cols-[1fr_320px] gap-6">
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-32 pb-20 container mx-auto px-4 max-w-2xl text-center">
          <h1 className="text-2xl font-bold mb-4">Kursus tidak ditemukan</h1>
          <Link to="/kursus"><Button variant="gold">Lihat Katalog</Button></Link>
        </main>
        <Footer />
      </div>
    );
  }

  if (!enrolled) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-32 pb-20 container mx-auto px-4 max-w-2xl">
          <Card>
            <CardContent className="p-10 text-center space-y-4">
              <Lock className="h-12 w-12 mx-auto text-gold" />
              <h1 className="text-2xl font-bold">Akses Terkunci</h1>
              <p className="text-muted-foreground">
                Anda belum terdaftar atau pembayaran belum diverifikasi untuk kursus ini.
              </p>
              <div className="flex gap-2 justify-center">
                <Link to={`/kursus/${slug}`}><Button variant="gold">Daftar Kursus</Button></Link>
                <Link to="/kursus-saya"><Button variant="outline">Kursus Saya</Button></Link>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <div>
              <Link to="/kursus-saya" className="text-sm text-muted-foreground hover:text-gold inline-flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" /> Kembali ke Kursus Saya
              </Link>
              <h1 className="text-2xl md:text-3xl font-bold text-primary mt-1">{course.title}</h1>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {certPath ? (
                <Button variant="gold" onClick={() => openCertificate(certPath)}>
                  <Award className="h-4 w-4 mr-2" /> Unduh Sertifikat
                </Button>
              ) : canClaim ? (
                <Button variant="gold" onClick={claimCertificate} disabled={claiming}>
                  {claiming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Award className="h-4 w-4 mr-2" />}
                  Klaim Sertifikat
                </Button>
              ) : null}
              <div className="min-w-[200px]">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold text-gold">{completionPct}%</span>
                </div>
                <Progress value={completionPct} />
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_340px] gap-6">
            <div className="space-y-4">
              {active?.kind === "lesson" && <LessonView lesson={active.data} done={progress.has(active.data.id)} onComplete={() => markComplete(active.data.id)} />}
              {active?.kind === "quiz" && <QuizView quiz={active.data} prev={attempts[active.data.id]} userId={user!.id} onSubmitted={(r) => setAttempts((m) => ({ ...m, [active.data.id]: r }))} />}
              {!active && (
                <Card><CardContent className="p-10 text-center text-muted-foreground">Belum ada materi di kursus ini.</CardContent></Card>
              )}
            </div>

            <aside className="space-y-3">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Daftar Materi</CardTitle></CardHeader>
                <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto">
                  {modules.length === 0 && <p className="text-sm text-muted-foreground">Belum ada modul.</p>}
                  {modules.map((m, mi) => (
                    <div key={m.id} className="space-y-1">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Modul {mi + 1}: {m.title}
                      </div>
                      {m.lessons.map((l) => {
                        const done = progress.has(l.id);
                        const isActive = activeKind === "lesson" && activeId === l.id;
                        return (
                          <button
                            key={l.id}
                            onClick={() => { setActiveId(l.id); setActiveKind("lesson"); }}
                            className={`w-full flex items-center gap-2 text-left text-sm px-2 py-2 rounded-md transition-colors ${isActive ? "bg-gold/10 text-gold" : "hover:bg-muted"}`}
                          >
                            {done ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                            {l.content_type === "text" ? <FileText className="h-4 w-4 shrink-0 opacity-70" /> : <PlayCircle className="h-4 w-4 shrink-0 opacity-70" />}
                            <span className="flex-1 line-clamp-2">{l.title}</span>
                            {l.duration_min ? <span className="text-xs text-muted-foreground">{l.duration_min}m</span> : null}
                          </button>
                        );
                      })}
                      {m.quizzes.map((q) => {
                        const att = attempts[q.id];
                        const isActive = activeKind === "quiz" && activeId === q.id;
                        return (
                          <button
                            key={q.id}
                            onClick={() => { setActiveId(q.id); setActiveKind("quiz"); }}
                            className={`w-full flex items-center gap-2 text-left text-sm px-2 py-2 rounded-md transition-colors ${isActive ? "bg-gold/10 text-gold" : "hover:bg-muted"}`}
                          >
                            <FileQuestion className="h-4 w-4 shrink-0 opacity-70" />
                            <span className="flex-1 line-clamp-2">Kuis: {q.title}</span>
                            {att && <Badge variant={att.passed ? "default" : "secondary"} className="text-xs">{att.score}</Badge>}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const LessonView = ({ lesson, done, onComplete }: { lesson: Lesson; done: boolean; onComplete: () => void }) => {
  const url = lesson.video_url || lesson.file_url || "";
  const showVideo = lesson.content_type === "video" || (!!lesson.video_url);
  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-primary">{lesson.title}</h2>
          {lesson.duration_min ? <p className="text-sm text-muted-foreground mt-1">Durasi: {lesson.duration_min} menit</p> : null}
        </div>

        {showVideo && url && (
          isVideoFile(url) ? (
            <video src={url} controls className="w-full rounded-md bg-black aspect-video" />
          ) : (
            <div className="aspect-video w-full rounded-md overflow-hidden bg-black">
              <iframe src={toEmbed(url)} className="w-full h-full" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          )
        )}

        {lesson.embed_html && (
          <div className="aspect-video w-full rounded-md overflow-hidden bg-black" dangerouslySetInnerHTML={{ __html: lesson.embed_html }} />
        )}

        {lesson.content_md && (
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">{lesson.content_md}</div>
        )}

        {lesson.file_url && !showVideo && (
          <a href={lesson.file_url} target="_blank" rel="noreferrer">
            <Button variant="outline"><FileText className="h-4 w-4 mr-2" />Unduh Materi</Button>
          </a>
        )}

        {!showVideo && !lesson.content_md && !lesson.embed_html && !lesson.file_url && (
          <p className="text-sm text-muted-foreground">Materi belum tersedia.</p>
        )}

        <div className="pt-2 border-t flex justify-end">
          <Button variant={done ? "outline" : "gold"} onClick={onComplete} disabled={done}>
            {done ? <><CheckCircle2 className="h-4 w-4 mr-2" />Selesai</> : "Tandai Selesai"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const QuizView = ({
  quiz,
  prev,
  userId,
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
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correct) correct += 1;
    });
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= (quiz.passing_score ?? 70);
    const { error } = await supabase.from("quiz_attempts").insert({
      user_id: userId,
      quiz_id: quiz.id,
      score,
      passed,
      answers,
    });
    setSubmitting(false);
    if (error) { toast.error("Gagal menyimpan kuis"); return; }
    setResult({ score, passed });
    onSubmitted({ score, passed });
    toast[passed ? "success" : "error"](passed ? `Lulus! Skor ${score}` : `Belum lulus. Skor ${score}`);
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-primary">{quiz.title}</h2>
          {quiz.description && <p className="text-sm text-muted-foreground mt-1">{quiz.description}</p>}
          <p className="text-xs text-muted-foreground mt-1">Nilai kelulusan: {quiz.passing_score ?? 70}</p>
        </div>

        {result && (
          <div className={`rounded-md p-3 text-sm ${result.passed ? "bg-green-500/10 text-green-700" : "bg-destructive/10 text-destructive"}`}>
            Skor terakhir: <strong>{result.score}</strong> — {result.passed ? "Lulus" : "Belum lulus"}
          </div>
        )}

        {questions.length === 0 && <p className="text-sm text-muted-foreground">Soal belum tersedia.</p>}

        <div className="space-y-6">
          {questions.map((q, i) => (
            <div key={i} className="space-y-2">
              <div className="font-medium">{i + 1}. {q.question}</div>
              <RadioGroup
                value={answers[i]?.toString() ?? ""}
                onValueChange={(v) => setAnswers((a) => ({ ...a, [i]: parseInt(v) }))}
              >
                {(q.options || []).map((opt: string, oi: number) => (
                  <div key={oi} className="flex items-center space-x-2">
                    <RadioGroupItem value={oi.toString()} id={`q${i}-o${oi}`} />
                    <Label htmlFor={`q${i}-o${oi}`} className="font-normal cursor-pointer">{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ))}
        </div>

        {questions.length > 0 && (
          <div className="pt-2 border-t flex justify-end">
            <Button variant="gold" onClick={submit} disabled={submitting || Object.keys(answers).length !== questions.length}>
              {submitting ? "Mengirim..." : "Kirim Jawaban"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Learn;
