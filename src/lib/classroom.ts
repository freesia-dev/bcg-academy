import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type Mark = "hadir" | "izin" | "sakit" | "alpa";

export const MARKS: { id: Mark; label: string; short: string; className: string; activeClass: string }[] = [
  { id: "hadir", label: "Hadir", short: "H", className: "text-emerald-700", activeClass: "bg-emerald-600 text-white border-emerald-600" },
  { id: "izin", label: "Izin", short: "I", className: "text-sky-700", activeClass: "bg-sky-600 text-white border-sky-600" },
  { id: "sakit", label: "Sakit", short: "S", className: "text-amber-700", activeClass: "bg-amber-500 text-white border-amber-500" },
  { id: "alpa", label: "Alpa", short: "A", className: "text-red-700", activeClass: "bg-red-600 text-white border-red-600" },
];
export const MARK_BY_ID = Object.fromEntries(MARKS.map((m) => [m.id, m])) as Record<Mark, (typeof MARKS)[number]>;

export interface Session { id: string; batch_id: string; session_date: string; title: string; topic: string | null; sort_order: number }

export interface Member {
  id: string; // enrollment id
  user_id: string;
  status: "active" | "completed";
  course_id: string;
  batch_id: string | null;
  certificate_url: string | null;
  certificate_number: string | null;
  certificate_issued_at: string | null;
  completed_at: string | null;
  name: string;
  phone: string | null;
}

/** attendance[sessionId][enrollmentId] = mark */
export type AttendanceMap = Record<string, Record<string, Mark>>;

export async function loadMembers(filter: { batchId?: string; courseId?: string }): Promise<Member[]> {
  let q = db.from("enrollments")
    .select("id,user_id,status,course_id,batch_id,certificate_url,certificate_number,certificate_issued_at,completed_at")
    .in("status", ["active", "completed"]);
  if (filter.batchId) q = q.eq("batch_id", filter.batchId);
  if (filter.courseId) q = q.eq("course_id", filter.courseId);
  const { data } = await q;
  const rows = (data as Omit<Member, "name" | "phone">[]) || [];
  const ids = Array.from(new Set(rows.map((r) => r.user_id)));
  const profiles: Record<string, { full_name: string | null; phone: string | null }> = {};
  if (ids.length) {
    const { data: ps } = await supabase.from("profiles").select("id,full_name,phone").in("id", ids);
    (ps || []).forEach((p) => { profiles[p.id] = p; });
  }
  return rows
    .map((r) => ({ ...r, name: profiles[r.user_id]?.full_name?.trim() || "Tanpa nama", phone: profiles[r.user_id]?.phone || null }))
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
}

export async function loadSessions(batchId: string): Promise<Session[]> {
  const { data } = await db.from("batch_sessions").select("*").eq("batch_id", batchId).order("session_date").order("sort_order");
  return (data as Session[]) || [];
}

export async function loadAttendance(sessionIds: string[]): Promise<AttendanceMap> {
  const map: AttendanceMap = {};
  if (!sessionIds.length) return map;
  const { data } = await db.from("attendance").select("session_id,enrollment_id,status").in("session_id", sessionIds);
  ((data as { session_id: string; enrollment_id: string; status: Mark }[]) || []).forEach((a) => {
    (map[a.session_id] ||= {})[a.enrollment_id] = a.status;
  });
  return map;
}

// ------------------------------------------------------------------ tanggal
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export const toDate = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayIso = () => toIso(new Date());

export const dayShort = (s: string) => { const d = toDate(s); return `${DAYS[d.getDay()].slice(0, 3)}, ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`; };
export const dayLong = (s: string) => { const d = toDate(s); return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
export const WEEKDAYS = DAYS.map((d, i) => ({ id: i, label: d.slice(0, 3) }));

/** Tanggal antara from–to (inklusif) pada hari tertentu (0 = Minggu). */
export const datesBetween = (from: string, to: string, days: number[], max = 120) => {
  const out: string[] = [];
  const end = toDate(to);
  for (let d = toDate(from); d <= end && out.length < max; d.setDate(d.getDate() + 1)) {
    if (days.includes(d.getDay())) out.push(toIso(d));
  }
  return out;
};

// ------------------------------------------------------------------ rekap
export interface Recap { hadir: number; izin: number; sakit: number; alpa: number; counted: number; pct: number }

/** Pertemuan yang dihitung: sudah lewat, atau (hari ini/akan datang) yang sudah ada catatan absennya. */
export const countedSessions = (sessions: Session[], att: AttendanceMap) => {
  const today = todayIso();
  return sessions.filter((s) => s.session_date < today || Object.keys(att[s.id] || {}).length > 0);
};

export const recapFor = (enrollmentId: string, counted: Session[], att: AttendanceMap): Recap => {
  const r = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
  counted.forEach((s) => { const m = att[s.id]?.[enrollmentId]; if (m) r[m]++; });
  return { ...r, counted: counted.length, pct: counted.length ? Math.round((r.hadir / counted.length) * 100) : 0 };
};

export const certCode = (enrollmentId: string) => enrollmentId.slice(0, 8).toUpperCase();
export const verifyUrl = (enrollmentId: string) => `${window.location.origin}/verifikasi/${certCode(enrollmentId)}`;
