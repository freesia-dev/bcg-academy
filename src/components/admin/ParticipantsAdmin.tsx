import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, Search } from "lucide-react";

type Row = {
  enrollment_id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  course_id: string;
  course_title: string;
  status: string;
  enrolled_at: string;
  completed_at: string | null;
  total_lessons: number;
  done_lessons: number;
  total_quizzes: number;
  passed_quizzes: number;
  progress_pct: number;
};

const ParticipantsAdmin = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: enrolls }, { data: profiles }, { data: courses }, { data: modules }, { data: lessons }, { data: quizzes }, { data: progress }, { data: attempts }] =
        await Promise.all([
          supabase.from("enrollments").select("id, user_id, course_id, status, enrolled_at, completed_at"),
          supabase.from("profiles").select("id, full_name, phone"),
          supabase.from("courses").select("id, title"),
          supabase.from("modules").select("id, course_id"),
          supabase.from("lessons").select("id, module_id"),
          supabase.from("quizzes").select("id, module_id"),
          supabase.from("lesson_progress").select("user_id, lesson_id"),
          supabase.from("quiz_attempts").select("user_id, quiz_id, passed"),
        ]);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const courseMap = new Map((courses || []).map((c: any) => [c.id, c]));
      const modulesByCourse = new Map<string, string[]>();
      (modules || []).forEach((m: any) => {
        const arr = modulesByCourse.get(m.course_id) || [];
        arr.push(m.id);
        modulesByCourse.set(m.course_id, arr);
      });
      const lessonsByModule = new Map<string, string[]>();
      (lessons || []).forEach((l: any) => {
        const arr = lessonsByModule.get(l.module_id) || [];
        arr.push(l.id);
        lessonsByModule.set(l.module_id, arr);
      });
      const quizzesByModule = new Map<string, string[]>();
      (quizzes || []).forEach((q: any) => {
        const arr = quizzesByModule.get(q.module_id) || [];
        arr.push(q.id);
        quizzesByModule.set(q.module_id, arr);
      });
      const progressSet = new Set((progress || []).map((p: any) => `${p.user_id}|${p.lesson_id}`));
      const passSet = new Set((attempts || []).filter((a: any) => a.passed).map((a: any) => `${a.user_id}|${a.quiz_id}`));

      const computed: Row[] = (enrolls || []).map((e: any) => {
        const modIds = modulesByCourse.get(e.course_id) || [];
        const lessonIds = modIds.flatMap((m) => lessonsByModule.get(m) || []);
        const quizIds = modIds.flatMap((m) => quizzesByModule.get(m) || []);
        const done = lessonIds.filter((id) => progressSet.has(`${e.user_id}|${id}`)).length;
        const passed = quizIds.filter((id) => passSet.has(`${e.user_id}|${id}`)).length;
        const totalItems = lessonIds.length + quizIds.length;
        const doneItems = done + passed;
        const pct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;
        const prof = profileMap.get(e.user_id) as any;
        const course = courseMap.get(e.course_id) as any;
        return {
          enrollment_id: e.id,
          user_id: e.user_id,
          full_name: prof?.full_name || "-",
          phone: prof?.phone || "-",
          email: "",
          course_id: e.course_id,
          course_title: course?.title || "-",
          status: e.status,
          enrolled_at: e.enrolled_at,
          completed_at: e.completed_at,
          total_lessons: lessonIds.length,
          done_lessons: done,
          total_quizzes: quizIds.length,
          passed_quizzes: passed,
          progress_pct: pct,
        };
      });

      setRows(computed);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.full_name.toLowerCase().includes(q) ||
      r.phone.toLowerCase().includes(q) ||
      r.course_title.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const exportCsv = () => {
    const header = ["Nama", "WhatsApp", "Kursus", "Status", "Progress %", "Pelajaran", "Kuis Lulus", "Terdaftar", "Selesai"];
    const lines = filtered.map((r) => [
      r.full_name, r.phone, r.course_title, r.status, r.progress_pct,
      `${r.done_lessons}/${r.total_lessons}`, `${r.passed_quizzes}/${r.total_quizzes}`,
      new Date(r.enrolled_at).toLocaleString("id-ID"),
      r.completed_at ? new Date(r.completed_at).toLocaleString("id-ID") : "",
    ]);
    const csv = [header, ...lines].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `peserta-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle>Peserta & Progress ({filtered.length})</CardTitle>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 w-56" placeholder="Cari nama / kursus…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Button variant="gold" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Ekspor CSV</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground border-b">
              <tr><th className="py-2 pr-3">Peserta</th><th className="py-2 pr-3">Kursus</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3 w-48">Progress</th><th className="py-2 pr-3">Materi</th><th className="py-2 pr-3">Terdaftar</th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.enrollment_id} className="border-b hover:bg-muted/40">
                  <td className="py-2 pr-3">
                    <div className="font-semibold">{r.full_name}</div>
                    <div className="text-xs text-muted-foreground">{r.phone}</div>
                  </td>
                  <td className="py-2 pr-3">{r.course_title}</td>
                  <td className="py-2 pr-3"><Badge variant={r.status === "completed" ? "default" : r.status === "active" ? "secondary" : "outline"} className={r.status === "completed" ? "bg-gold text-primary" : ""}>{r.status}</Badge></td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <Progress value={r.progress_pct} className="flex-1" />
                      <span className="text-xs font-semibold w-10 text-right">{r.progress_pct}%</span>
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-xs">L {r.done_lessons}/{r.total_lessons} · K {r.passed_quizzes}/{r.total_quizzes}</td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">{new Date(r.enrolled_at).toLocaleDateString("id-ID")}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Tidak ada peserta.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ParticipantsAdmin;
