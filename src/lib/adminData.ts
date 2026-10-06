import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface AdminEnrollment {
  id: string;
  status: "waitlist" | "pending_payment" | "active" | "completed" | "rejected" | "cancelled";
  user_id: string;
  course_id: string;
  batch_id: string | null;
  payment_method: string | null;
  payment_amount: number | null;
  payment_proof_url: string | null;
  enrolled_at: string;
  paid_at: string | null;
  completed_at: string | null;
  notes: string | null;
  participant_note: string | null;
  course: { id: string; title: string; slug: string; type: string; price: number; is_free: boolean } | null;
  batch: { id: string; name: string; start_date: string | null; end_date: string | null; location: string | null; schedule: string | null; status: string } | null;
}

export interface AdminProfile { id: string; full_name: string | null; phone: string | null }

export async function loadEnrollments(): Promise<{ rows: AdminEnrollment[]; profiles: Record<string, AdminProfile> }> {
  const { data } = await db
    .from("enrollments")
    .select(
      "id,status,user_id,course_id,batch_id,payment_method,payment_amount,payment_proof_url,enrolled_at,paid_at,completed_at,notes,participant_note," +
        "course:courses(id,title,slug,type,price,is_free), batch:batches(id,name,start_date,end_date,location,schedule,status)",
    )
    .order("enrolled_at", { ascending: false });
  const rows = (data as AdminEnrollment[]) || [];
  const ids = Array.from(new Set(rows.map((r) => r.user_id)));
  let profiles: Record<string, AdminProfile> = {};
  if (ids.length) {
    const { data: ps } = await supabase.from("profiles").select("id,full_name,phone").in("id", ids);
    profiles = Object.fromEntries(((ps as AdminProfile[]) || []).map((p) => [p.id, p]));
  }
  return { rows, profiles };
}

/** Status yang dipakai di filter & ringkasan admin. "verify" dan "unpaid" sama-sama pending_payment. */
export type Stage = "verify" | "unpaid" | "waitlist" | "active" | "completed" | "rejected" | "cancelled";

export const stageOf = (e: Pick<AdminEnrollment, "status" | "payment_proof_url">): Stage =>
  e.status === "pending_payment" ? (e.payment_proof_url ? "verify" : "unpaid") : e.status;

export const STAGE: Record<Stage, { label: string; short: string; className: string }> = {
  verify: { label: "Perlu verifikasi", short: "Verifikasi", className: "bg-amber-100 text-amber-900 border-amber-200" },
  unpaid: { label: "Belum bayar", short: "Belum bayar", className: "bg-orange-50 text-orange-800 border-orange-200" },
  waitlist: { label: "Daftar minat", short: "Minat", className: "bg-sky-50 text-sky-800 border-sky-200" },
  active: { label: "Aktif", short: "Aktif", className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  completed: { label: "Lulus", short: "Lulus", className: "bg-primary/10 text-primary border-primary/20" },
  rejected: { label: "Ditolak", short: "Ditolak", className: "bg-red-50 text-red-800 border-red-200" },
  cancelled: { label: "Dibatalkan", short: "Batal", className: "bg-muted text-muted-foreground border-border" },
};

export const STATUS_LABEL: Record<string, string> = {
  waitlist: "Daftar minat", pending_payment: "Menunggu bayar", active: "Aktif", completed: "Lulus", rejected: "Ditolak", cancelled: "Dibatalkan",
};

/** Nomor WhatsApp format internasional (62…), atau null bila tidak valid. */
export const toWa = (phone: string | null | undefined) => {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return d.length >= 9 ? d : null;
};

export const waUrl = (phone: string | null | undefined, text: string) => {
  const n = toWa(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
};

export const daysAgoIso = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export const relativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

export const downloadCsv = (filename: string, header: string[], rows: (string | number | null | undefined)[][]) => {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "﻿" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
