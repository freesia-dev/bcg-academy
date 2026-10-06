import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Loader2, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { BATCH_STATUS_LABEL, fetchBatches, formatDateRange, type Batch } from "@/lib/batches";
import {
  countedSessions, loadAttendance, loadMembers, loadSessions, recapFor,
  type AttendanceMap, type Member, type Session,
} from "@/lib/classroom";
import AttendancePanel from "./classroom/AttendancePanel";
import RecapPanel from "./classroom/RecapPanel";
import GraduationPanel, { type Metric } from "./classroom/GraduationPanel";

interface Course { id: string; title: string; type: string; min_attendance: number | null }

const db = supabase as any;

/** Konteks: "b:<batchId>" untuk kelas tatap muka, "c:<courseId>" untuk program online tanpa angkatan. */
const ClassroomAdmin = ({ initialBatch }: { initialBatch?: string | null }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [ctx, setCtx] = useState<string>("");
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendance, setAttendance] = useState<AttendanceMap>({});
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [tab, setTab] = useState("absensi");

  useEffect(() => {
    (async () => {
      const [{ data: cs }, bs] = await Promise.all([
        db.from("courses").select("id,title,type,min_attendance").order("sort_order"),
        fetchBatches(undefined, true),
      ]);
      const list = (cs as Course[]) || [];
      setCourses(list);
      setBatches(bs);
      const pick = (initialBatch && bs.find((b) => b.id === initialBatch))
        || bs.find((b) => b.status === "running") || bs.find((b) => b.status === "open")
        || bs.find((b) => b.status !== "cancelled" && b.status !== "draft");
      const online = list.find((c) => c.type === "online");
      setCtx(pick ? `b:${pick.id}` : online ? `c:${online.id}` : "");
      setBooting(false);
    })();
  }, [initialBatch]);

  const batch = ctx.startsWith("b:") ? batches.find((b) => b.id === ctx.slice(2)) || null : null;
  const course = batch ? courses.find((c) => c.id === batch.course_id) || null : courses.find((c) => `c:${c.id}` === ctx) || null;
  const minAttendance = course?.min_attendance ?? 75;

  const reloadSessions = useCallback(async () => {
    if (!batch) return;
    const ss = await loadSessions(batch.id);
    setSessions(ss);
    setAttendance(await loadAttendance(ss.map((s) => s.id)));
  }, [batch]);

  const loadOnlineProgress = useCallback(async (courseId: string, ms: Member[]) => {
    const { data: mods } = await db.from("modules").select("id").eq("course_id", courseId);
    const modIds = ((mods as { id: string }[]) || []).map((m) => m.id);
    if (!modIds.length) { setProgress({}); return; }
    const { data: ls } = await db.from("lessons").select("id").in("module_id", modIds);
    const lessonIds = ((ls as { id: string }[]) || []).map((l) => l.id);
    if (!lessonIds.length) { setProgress({}); return; }
    const userIds = ms.map((m) => m.user_id);
    const { data: lp } = userIds.length
      ? await db.from("lesson_progress").select("user_id,lesson_id").in("lesson_id", lessonIds).in("user_id", userIds)
      : { data: [] };
    const done: Record<string, Set<string>> = {};
    ((lp as { user_id: string; lesson_id: string }[]) || []).forEach((r) => { (done[r.user_id] ||= new Set()).add(r.lesson_id); });
    setProgress(Object.fromEntries(ms.map((m) => [m.id, Math.round(((done[m.user_id]?.size || 0) / lessonIds.length) * 100)])));
  }, []);

  const reloadMembers = useCallback(async () => {
    if (batch) setMembers(await loadMembers({ batchId: batch.id }));
    else if (course) {
      const ms = await loadMembers({ courseId: course.id });
      setMembers(ms);
      await loadOnlineProgress(course.id, ms);
    }
  }, [batch, course, loadOnlineProgress]);

  useEffect(() => {
    if (!ctx || booting) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setSessions([]); setAttendance({}); setProgress({});
      await Promise.all([reloadMembers(), reloadSessions()]);
      if (alive) setLoading(false);
    })();
    setTab(ctx.startsWith("b:") ? "absensi" : "kelulusan");
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, booting]);

  const metrics = useMemo(() => {
    const out: Record<string, Metric> = {};
    if (batch) {
      const counted = countedSessions(sessions, attendance);
      members.forEach((m) => {
        const r = recapFor(m.id, counted, attendance);
        out[m.id] = { value: counted.length ? r.pct : null, label: counted.length ? `${r.pct}% hadir` : "Belum ada absen", eligible: counted.length > 0 && r.pct >= minAttendance };
      });
    } else {
      members.forEach((m) => {
        const p = progress[m.id];
        out[m.id] = { value: p ?? null, label: p == null ? "—" : `${p}% materi`, eligible: p === 100 };
      });
    }
    return out;
  }, [batch, sessions, attendance, members, progress, minAttendance]);

  const grouped = useMemo(() => {
    const byCourse = new Map<string, Batch[]>();
    batches.filter((b) => b.status !== "cancelled").forEach((b) => byCourse.set(b.course_id, [...(byCourse.get(b.course_id) || []), b]));
    return courses
      .map((c) => ({ c, bs: byCourse.get(c.id) || [] }))
      .filter((g) => g.bs.length || g.c.type === "online");
  }, [courses, batches]);

  if (booting) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (!grouped.length) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center space-y-2">
        <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="font-medium">Belum ada kelas</p>
        <p className="text-sm text-muted-foreground">Buat angkatan dulu di menu <Link to="/admin?menu=angkatan" className="underline">Angkatan</Link>. Setelah ada peserta aktif, absensi dan kelulusan dikelola di sini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <select aria-label="Pilih kelas" className="h-11 w-full lg:w-auto lg:min-w-[420px] min-w-0 rounded-md border bg-background px-3 text-sm font-medium" value={ctx} onChange={(e) => setCtx(e.target.value)}>
          {grouped.map(({ c, bs }) => (
            <optgroup key={c.id} label={c.title}>
              {bs.map((b) => (
                <option key={b.id} value={`b:${b.id}`}>{b.name} · {formatDateRange(b.start_date, b.end_date)} ({BATCH_STATUS_LABEL[b.status].toLowerCase()})</option>
              ))}
              {c.type === "online" && <option value={`c:${c.id}`}>Kelas online (semua peserta)</option>}
            </optgroup>
          ))}
        </select>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5"><Users className="h-3.5 w-3.5" />{members.length} peserta aktif</span>
          {batch && <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5"><CalendarDays className="h-3.5 w-3.5" />{sessions.length} pertemuan</span>}
          {batch && <span className="inline-flex items-center rounded-full border bg-card px-3 py-1.5">Lulus jika hadir ≥ {minAttendance}%</span>}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-auto w-full sm:w-auto justify-start overflow-x-auto">
            {batch && <TabsTrigger value="absensi" className="px-3 sm:px-4 py-2 shrink-0">Absensi</TabsTrigger>}
            {batch && <TabsTrigger value="rekap" className="px-3 sm:px-4 py-2 shrink-0">Rekap<span className="hidden sm:inline">&nbsp;kehadiran</span></TabsTrigger>}
            <TabsTrigger value="kelulusan" className="px-3 sm:px-4 py-2 shrink-0">Kelulusan<span className="hidden sm:inline">&nbsp;& sertifikat</span></TabsTrigger>
          </TabsList>
          {batch && (
            <TabsContent value="absensi" className="mt-5">
              <AttendancePanel batch={batch} members={members} sessions={sessions} attendance={attendance} setAttendance={setAttendance} reloadSessions={reloadSessions} />
            </TabsContent>
          )}
          {batch && (
            <TabsContent value="rekap" className="mt-5">
              <RecapPanel members={members} sessions={sessions} attendance={attendance} minAttendance={minAttendance} fileLabel={`${course?.title || ""} ${batch.name}`} />
            </TabsContent>
          )}
          <TabsContent value="kelulusan" className="mt-5">
            <GraduationPanel
              members={members}
              metrics={metrics}
              metricTitle={batch ? "Kehadiran" : "Materi"}
              requirement={batch
                ? `Syarat lulus: kehadiran minimal ${minAttendance}% (ubah di menu Program). Admin tetap bisa meluluskan peserta lain secara manual.`
                : "Peserta online bisa mengklaim sertifikat sendiri setelah semua materi & kuis selesai. Di sini Anda bisa meluluskan secara manual."}
              courseTitle={course?.title || ""}
              onChanged={reloadMembers}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default ClassroomAdmin;
