import { supabase } from "@/integrations/supabase/client";

export type BatchStatus = "draft" | "open" | "closed" | "running" | "finished" | "cancelled";

export interface Batch {
  id: string;
  course_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  schedule: string | null;
  location: string | null;
  quota: number | null;
  price: number | null;
  registration_deadline: string | null;
  status: BatchStatus;
  notes: string | null;
  sort_order: number;
}

export const BATCH_STATUS_LABEL: Record<BatchStatus, string> = {
  draft: "Draf (tersembunyi)",
  open: "Pendaftaran dibuka",
  closed: "Pendaftaran ditutup",
  running: "Sedang berjalan",
  finished: "Selesai",
  cancelled: "Dibatalkan",
};

const db = supabase as any;

export async function fetchBatches(courseId?: string, includeAll = false): Promise<Batch[]> {
  let q = db.from("batches").select("*").order("start_date", { ascending: true, nullsFirst: false }).order("sort_order");
  if (courseId) q = q.eq("course_id", courseId);
  if (!includeAll) q = q.in("status", ["open", "closed", "running"]);
  const { data } = await q;
  return (data as Batch[]) || [];
}

export async function fetchSeats(courseId?: string): Promise<Record<string, number>> {
  const { data } = await db.rpc("batch_seats", courseId ? { _course_id: courseId } : {});
  return Object.fromEntries(((data as { batch_id: string; taken: number }[]) || []).map((r) => [r.batch_id, r.taken]));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const parse = (d: string) => { const [y, m, day] = d.split("-").map(Number); return { y, m, day }; };

/** "12 Okt 2026" */
export const formatDate = (d?: string | null) => {
  if (!d) return "";
  const { y, m, day } = parse(d);
  return `${day} ${MONTHS[m - 1]} ${y}`;
};

/** "12–30 Okt 2026", "28 Okt – 8 Nov 2026", atau "Mulai 12 Okt 2026" */
export const formatDateRange = (start?: string | null, end?: string | null) => {
  if (!start) return "Jadwal menyusul";
  if (!end || end === start) return formatDate(start);
  const a = parse(start), b = parse(end);
  if (a.y === b.y && a.m === b.m) return `${a.day}–${b.day} ${MONTHS[b.m - 1]} ${b.y}`;
  if (a.y === b.y) return `${a.day} ${MONTHS[a.m - 1]} – ${b.day} ${MONTHS[b.m - 1]} ${b.y}`;
  return `${formatDate(start)} – ${formatDate(end)}`;
};

const today = () => new Date().toISOString().slice(0, 10);

export interface BatchAvailability { open: boolean; left: number | null; reason?: string }

export const availability = (b: Batch, taken = 0): BatchAvailability => {
  const left = b.quota == null ? null : Math.max(b.quota - taken, 0);
  if (b.status !== "open") return { open: false, left, reason: BATCH_STATUS_LABEL[b.status] };
  if (b.registration_deadline && b.registration_deadline < today()) return { open: false, left, reason: "Pendaftaran ditutup" };
  if (left === 0) return { open: false, left, reason: "Kuota penuh" };
  return { open: true, left };
};

export const priceFor = (course: { price: number; is_free: boolean }, batch?: Batch | null) =>
  batch?.price ?? (course.is_free ? 0 : course.price || 0);

export const rupiah = (n: number) => (n > 0 ? `Rp ${n.toLocaleString("id-ID")}` : "Gratis");

/** Kode pendaftaran yang mudah disebut lewat WhatsApp. */
export const regCode = (enrollmentId: string) => `BCG-${enrollmentId.slice(0, 6).toUpperCase()}`;
