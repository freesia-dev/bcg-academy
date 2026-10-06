import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight, CalendarDays, CheckCircle2, Circle, ClipboardCheck, Hourglass, Loader2, TrendingUp, UserPlus, Users, Wallet,
} from "lucide-react";
import { fetchBatches, fetchSeats, formatDate, formatDateRange, regCode, rupiah, type Batch } from "@/lib/batches";
import { STAGE, daysAgoIso, loadEnrollments, relativeTime, stageOf, type AdminEnrollment, type AdminProfile } from "@/lib/adminData";
import type { RegistrantFilter } from "./RegistrantsAdmin";
import { cn } from "@/lib/utils";

export type AdminSection =
  | "ringkasan" | "pendaftar" | "program" | "angkatan" | "kelas" | "peserta" | "laporan" | "sertifikat" | "rekening" | "galeri" | "roles";

interface Props { onGo: (section: AdminSection, filter?: RegistrantFilter) => void }

interface Course { id: string; title: string; is_published: boolean; price: number; is_free: boolean }

const AdminOverview = ({ onGo }: Props) => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AdminEnrollment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, AdminProfile>>({});
  const [batches, setBatches] = useState<Batch[]>([]);
  const [seats, setSeats] = useState<Record<string, number>>({});
  const [courses, setCourses] = useState<Course[]>([]);
  const [setup, setSetup] = useState({ bank: false, templates: 0, photos: 0 });

  useEffect(() => {
    (async () => {
      const [{ rows, profiles }, bs, st, cs, pi, tpl, gal] = await Promise.all([
        loadEnrollments(),
        fetchBatches(undefined, true),
        fetchSeats(),
        supabase.from("courses").select("id,title,is_published,price,is_free"),
        supabase.from("site_content").select("value").eq("key", "payment_info").maybeSingle(),
        supabase.from("certificate_templates").select("id", { count: "exact", head: true }),
        supabase.from("gallery_items").select("id", { count: "exact", head: true }),
      ]);
      setRows(rows); setProfiles(profiles); setBatches(bs); setSeats(st);
      setCourses((cs.data as Course[]) || []);
      const acc = (pi.data?.value as { account_number?: string } | null)?.account_number || "";
      setSetup({ bank: !!acc && acc !== "1234567890", templates: tpl.count || 0, photos: gal.count || 0 });
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const by = (s: string) => rows.filter((r) => stageOf(r) === s).length;
    const weekAgo = daysAgoIso(7);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    return {
      verify: by("verify"),
      waitlist: by("waitlist"),
      unpaid: by("unpaid"),
      active: by("active"),
      newWeek: rows.filter((r) => r.enrolled_at >= weekAgo && r.status !== "cancelled").length,
      revenue: rows
        .filter((r) => (r.status === "active" || r.status === "completed") && r.paid_at && new Date(r.paid_at) >= monthStart)
        .reduce((s, r) => s + (r.payment_amount || 0), 0),
    };
  }, [rows]);

  const courseTitle = useMemo(() => Object.fromEntries(courses.map((c) => [c.id, c.title])), [courses]);

  const liveBatches = useMemo(
    () => batches.filter((b) => b.status === "open" || b.status === "running").slice(0, 6),
    [batches],
  );

  const checklist = [
    { done: setup.bank, label: "Isi rekening pembayaran", hint: "Ditampilkan ke peserta saat membayar.", go: "rekening" as const },
    { done: courses.some((c) => c.is_published && !c.is_free && c.price > 0) || batches.some((b) => (b.price || 0) > 0), label: "Atur biaya program", hint: "Matikan opsi Gratis dan isi harga di tiap program.", go: "program" as const },
    { done: batches.some((b) => b.status === "open"), label: "Buka angkatan pertama", hint: "Tanggal, lokasi, dan kuota peserta.", go: "angkatan" as const },
    { done: setup.templates > 0, label: "Siapkan template sertifikat", hint: "Dipakai saat peserta dinyatakan lulus.", go: "sertifikat" as const },
    { done: setup.photos > 0, label: "Unggah foto kegiatan", hint: "Membuat beranda lebih meyakinkan.", go: "galeri" as const },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const cards: { label: string; value: string | number; icon: typeof Users; tone: string; go: () => void; hint: string }[] = [
    { label: "Perlu verifikasi", value: stats.verify, icon: ClipboardCheck, tone: "text-amber-700 bg-amber-100", hint: "Bukti bayar masuk", go: () => onGo("pendaftar", "verify") },
    { label: "Daftar minat", value: stats.waitlist, icon: Hourglass, tone: "text-sky-700 bg-sky-100", hint: "Menunggu angkatan", go: () => onGo("pendaftar", "waitlist") },
    { label: "Belum bayar", value: stats.unpaid, icon: Wallet, tone: "text-orange-700 bg-orange-100", hint: "Sudah daftar, belum transfer", go: () => onGo("pendaftar", "unpaid") },
    { label: "Peserta aktif", value: stats.active, icon: Users, tone: "text-emerald-700 bg-emerald-100", hint: "Sedang mengikuti program", go: () => onGo("pendaftar", "active") },
    { label: "Pendaftar 7 hari", value: stats.newWeek, icon: UserPlus, tone: "text-primary bg-primary/10", hint: "Pendaftaran baru", go: () => onGo("pendaftar", "all") },
    { label: "Pemasukan bulan ini", value: rupiah(stats.revenue).replace("Gratis", "Rp 0"), icon: TrendingUp, tone: "text-gold-dark bg-gold/15", hint: "Pembayaran terverifikasi", go: () => onGo("laporan") },
  ];

  return (
    <div className="space-y-6">
      {doneCount < checklist.length && (
        <Card className="border-gold/40 bg-gold/5 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Siapkan pendaftaran online</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{doneCount} dari {checklist.length} langkah selesai. Setelah semuanya hijau, calon peserta bisa daftar dan bayar sendiri.</p>
              </div>
              <Progress value={(doneCount / checklist.length) * 100} className="w-40 h-2" />
            </div>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-0">
            {checklist.map((c) => (
              <button key={c.label} onClick={() => onGo(c.go)}
                className={cn("text-left rounded-lg border p-3 transition-colors bg-background hover:border-primary/40", c.done && "opacity-70")}>
                <span className="flex items-center gap-2 text-sm font-medium">
                  {c.done ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                  {c.label}
                </span>
                <span className="block text-xs text-muted-foreground mt-1 pl-6">{c.hint}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {cards.map((c) => (
          <button key={c.label} onClick={c.go} className="group text-left rounded-xl border bg-card p-4 sm:p-5 transition-all hover:border-primary/30 hover:shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <span className={cn("h-9 w-9 rounded-lg grid place-items-center", c.tone)}><c.icon className="h-[18px] w-[18px]" /></span>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
            </div>
            <div className={cn("mt-3 font-bold tabular-nums tracking-tight", typeof c.value === "string" ? "text-lg sm:text-2xl" : "text-2xl sm:text-3xl")}>{c.value}</div>
            <div className="text-sm font-medium mt-0.5">{c.label}</div>
            <div className="text-xs text-muted-foreground hidden sm:block">{c.hint}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card className="shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Angkatan berjalan & dibuka</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onGo("angkatan")}>Kelola<ArrowRight className="h-4 w-4 ml-1" /></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {liveBatches.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                Belum ada angkatan yang dibuka.
                <div className="mt-3"><Button size="sm" variant="gold" onClick={() => onGo("angkatan")}>Buat angkatan</Button></div>
              </div>
            ) : liveBatches.map((b) => {
              const taken = seats[b.id] || 0;
              const pct = b.quota ? Math.min(100, Math.round((taken / b.quota) * 100)) : 0;
              return (
                <div key={b.id} className="space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{courseTitle[b.course_id] || "Program"} · {b.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />{formatDateRange(b.start_date, b.end_date)}
                        {b.status === "open" && b.registration_deadline && <> · tutup {formatDate(b.registration_deadline)}</>}
                        {b.status === "running" && <> · sedang berjalan</>}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums shrink-0">{taken}{b.quota ? `/${b.quota}` : ""}</span>
                  </div>
                  {b.quota ? <Progress value={pct} className={cn("h-1.5", pct >= 100 && "[&>div]:bg-destructive")} /> : <div className="h-1.5 rounded-full bg-muted" />}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Pendaftar terbaru</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onGo("pendaftar", "all")}>Lihat semua<ArrowRight className="h-4 w-4 ml-1" /></Button>
          </CardHeader>
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center px-6">Belum ada pendaftar. Bagikan tautan program ke calon peserta.</p>
            ) : (
              <ul className="divide-y">
                {rows.slice(0, 7).map((r) => {
                  const s = stageOf(r);
                  return (
                    <li key={r.id}>
                      <button onClick={() => onGo("pendaftar", s === "verify" || s === "waitlist" || s === "unpaid" ? s : "all")}
                        className="w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-secondary/50 transition-colors">
                        <span className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-bold shrink-0">
                          {(profiles[r.user_id]?.full_name || "?").trim().charAt(0).toUpperCase()}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium truncate">{profiles[r.user_id]?.full_name || "Tanpa nama"}</span>
                          <span className="block text-xs text-muted-foreground truncate">{r.course?.title}{r.batch ? ` · ${r.batch.name}` : ""} · {regCode(r.id)}</span>
                        </span>
                        <span className="text-right shrink-0">
                          <span className={cn("inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border", STAGE[s].className)}>{STAGE[s].short}</span>
                          <span className="block text-[11px] text-muted-foreground mt-0.5">{relativeTime(r.enrolled_at)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOverview;
