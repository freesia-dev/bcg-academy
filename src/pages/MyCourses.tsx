import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle, Award, BookOpen, Building2, CalendarDays, Check, Clock, GraduationCap, Link2, Loader2, MapPin, MessageCircle, PlayCircle, ShieldCheck, Upload,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/site/PageHeader";
import ProgramVisual from "@/components/site/ProgramVisual";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useMyEnrollments } from "@/hooks/useEnrollments";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatDateRange, regCode, rupiah } from "@/lib/batches";
import { cn } from "@/lib/utils";
import { MARK_BY_ID, countedSessions, dayLong, dayShort, recapFor, todayIso, verifyUrl, type AttendanceMap, type Session } from "@/lib/classroom";
import { toast } from "sonner";

const db = supabase as any;
const METHODS = ["Transfer bank", "QRIS / e-wallet", "Tunai di kantor"];
const today = () => todayIso();

type Tone = "info" | "warn" | "error" | "ok";
interface View { headline: string; detail: string; tone: Tone; steps: string[]; current: number }

/** Menerjemahkan status pendaftaran menjadi linimasa yang mudah dipahami peserta. */
const describe = (e: any): View => {
  const free = !e.payment_amount;
  const online = e.course?.type === "online";
  const base = ["Terdaftar", free ? "Gratis" : "Pembayaran", "Terverifikasi", online ? "Belajar" : "Kelas", "Sertifikat"];
  switch (e.status) {
    case "waitlist":
      return { headline: "Daftar minat", detail: "Kami kabari lewat WhatsApp saat jadwal angkatan dibuka.", tone: "info", steps: ["Terdaftar", "Jadwal angkatan", "Pembayaran", "Kelas", "Sertifikat"], current: 1 };
    case "pending_payment":
      return e.payment_proof_url
        ? { headline: "Menunggu verifikasi", detail: "Bukti pembayaran sedang diperiksa admin (maks. 1×24 jam).", tone: "warn", steps: base, current: 2 }
        : { headline: "Menunggu pembayaran", detail: `Selesaikan pembayaran ${rupiah(e.payment_amount || 0)} lalu unggah buktinya.`, tone: "warn", steps: base, current: 1 };
    case "rejected":
      return { headline: "Pembayaran perlu diperbaiki", detail: e.notes ? `Alasan: ${e.notes}` : "Bukti pembayaran belum dapat diverifikasi.", tone: "error", steps: base, current: 1 };
    case "active": {
      const start = e.batch?.start_date;
      const upcoming = start && start > today();
      return {
        headline: online ? "Aktif — silakan belajar" : upcoming ? `Kursi aman — kelas mulai ${formatDate(start)}` : "Kelas sedang berjalan",
        detail: online ? "Materi bisa diakses kapan saja." : e.batch ? "Detail jadwal ada di bawah. Simpan kode pendaftaran Anda." : "Admin akan mengabarkan jadwal kelas.",
        tone: "ok", steps: base, current: 3,
      };
    }
    case "completed":
      return e.certificate_url
        ? { headline: "Lulus", detail: "Selamat! Sertifikat Anda sudah terbit dan bisa diunduh.", tone: "ok", steps: base, current: 5 }
        : { headline: "Lulus", detail: "Selamat, Anda dinyatakan lulus. Sertifikat sedang disiapkan admin.", tone: "ok", steps: base, current: 4 };
    default:
      return { headline: "Dibatalkan", detail: "", tone: "info", steps: base, current: 0 };
  }
};

const TONE: Record<Tone, string> = {
  info: "bg-secondary text-primary",
  warn: "bg-amber-50 text-amber-900 border border-amber-200",
  error: "bg-destructive/5 text-destructive border border-destructive/30",
  ok: "bg-green-50 text-green-900 border border-green-200",
};

const MyCourses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { brand } = useSiteConfig();
  const { enrollments, loading, refetch } = useMyEnrollments(user?.id);
  const [pct, setPct] = useState<Record<string, number>>({});
  const [payInfo, setPayInfo] = useState<any>(null);
  const [uploadFor, setUploadFor] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [method, setMethod] = useState(METHODS[0]);
  const [busy, setBusy] = useState(false);
  const [lessonCount, setLessonCount] = useState<Record<string, number>>({});
  const [classData, setClassData] = useState<{ sessions: Session[]; att: AttendanceMap }>({ sessions: [], att: {} });

  useEffect(() => {
    supabase.from("site_content").select("value").eq("key", "payment_info").maybeSingle().then(({ data }) => setPayInfo(data?.value || null));
  }, []);

  // progres belajar untuk kelas online
  useEffect(() => {
    const live = enrollments.filter((e) => (e.status === "active" || e.status === "completed") && e.course?.type === "online");
    if (!user || live.length === 0) return;
    (async () => {
      const courseIds = live.map((e) => e.course_id);
      const { data: mods } = await supabase.from("modules").select("id,course_id").in("course_id", courseIds);
      const modIds = (mods || []).map((m: any) => m.id);
      if (!modIds.length) return;
      const [{ data: les }, { data: prog }] = await Promise.all([
        db.from("lesson_outline").select("id,module_id").in("module_id", modIds),
        supabase.from("lesson_progress").select("lesson_id").eq("user_id", user.id),
      ]);
      const done = new Set((prog || []).map((p: any) => p.lesson_id));
      const modCourse: Record<string, string> = Object.fromEntries((mods || []).map((m: any) => [m.id, m.course_id]));
      const tot: Record<string, number> = {}, dn: Record<string, number> = {};
      (les || []).forEach((l: any) => { const c = modCourse[l.module_id]; tot[c] = (tot[c] || 0) + 1; if (done.has(l.id)) dn[c] = (dn[c] || 0) + 1; });
      setPct(Object.fromEntries(courseIds.map((c) => [c, tot[c] ? Math.round(((dn[c] || 0) / tot[c]) * 100) : 0])));
    })();
  }, [enrollments, user]);

  // jumlah materi per program (untuk tombol "Materi kelas")
  useEffect(() => {
    const live = enrollments.filter((e) => e.status === "active" || e.status === "completed");
    if (!live.length) return;
    (async () => {
      const courseIds = live.map((e) => e.course_id);
      const { data: mods } = await supabase.from("modules").select("id,course_id").in("course_id", courseIds);
      const modIds = (mods || []).map((m: any) => m.id);
      if (!modIds.length) return;
      const { data: les } = await db.from("lesson_outline").select("id,module_id").in("module_id", modIds);
      const modCourse: Record<string, string> = Object.fromEntries((mods || []).map((m: any) => [m.id, m.course_id]));
      const tot: Record<string, number> = {};
      (les || []).forEach((l: any) => { const c = modCourse[l.module_id]; tot[c] = (tot[c] || 0) + 1; });
      setLessonCount(tot);
    })();
  }, [enrollments]);

  // jadwal pertemuan & absensi kelas tatap muka
  useEffect(() => {
    const live = enrollments.filter((e) => (e.status === "active" || e.status === "completed") && e.batch_id);
    if (!live.length) return;
    (async () => {
      const { data: ss } = await db.from("batch_sessions").select("*").in("batch_id", live.map((e) => e.batch_id)).order("session_date");
      const sessions = (ss as Session[]) || [];
      const att: AttendanceMap = {};
      if (sessions.length) {
        const { data: rows } = await db.from("attendance").select("session_id,enrollment_id,status").in("enrollment_id", live.map((e) => e.id));
        (rows || []).forEach((a: any) => { (att[a.session_id] ||= {})[a.enrollment_id] = a.status; });
      }
      setClassData({ sessions, att });
    })();
  }, [enrollments]);

  const copyVerify = async (id: string) => {
    await navigator.clipboard.writeText(verifyUrl(id)).catch(() => {});
    toast.success("Link verifikasi disalin. Bagikan ke HRD atau tempel di CV/LinkedIn.");
  };

  const openCert = async (path: string) => {
    const { data, error } = await supabase.storage.from("certificates").createSignedUrl(path, 60 * 60);
    if (error || !data?.signedUrl) return toast.error("Gagal membuka sertifikat");
    window.open(data.signedUrl, "_blank");
  };

  const cancel = async (e: any) => {
    if (!confirm(`Batalkan pendaftaran "${e.course?.title}"?`)) return;
    const { error } = await db.rpc("cancel_registration", { _enrollment_id: e.id });
    if (error) return toast.error(error.message);
    toast.success("Pendaftaran dibatalkan");
    refetch();
  };

  const upload = async () => {
    if (!user || !uploadFor || !file) return toast.error("Pilih file bukti pembayaran");
    if (file.size > 5 * 1024 * 1024) return toast.error("Ukuran file maksimal 5 MB");
    setBusy(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${uploadFor.course_id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, file);
    if (upErr) { setBusy(false); return toast.error(`Gagal mengunggah: ${upErr.message}`); }
    const { error } = await db.rpc("attach_payment_proof", { _enrollment_id: uploadFor.id, _proof_path: path, _method: method });
    setBusy(false);
    if (error) return toast.error(error.message);
    supabase.functions.invoke("notify-payment", { body: { course_id: uploadFor.course_id, course_title: uploadFor.course?.title || "", amount: uploadFor.payment_amount || 0 } }).catch(() => {});
    toast.success("Bukti pembayaran terkirim. Admin akan memverifikasi maks. 1×24 jam.");
    setUploadFor(null); setFile(null);
    refetch();
  };

  const current = enrollments.filter((e) => !["completed", "cancelled"].includes(e.status));
  const finished = enrollments.filter((e) => e.status === "completed");
  const cancelled = enrollments.filter((e) => e.status === "cancelled");
  const firstName = ((user?.user_metadata?.full_name as string) || "").split(" ")[0];

  const card = (e: any) => {
    const v = describe(e);
    const online = e.course?.type === "online";
    const wa = `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(`Halo ${brand.name}, saya ingin bertanya tentang pendaftaran "${e.course?.title}". Kode: ${regCode(e.id)}.`)}`;
    return (
      <article key={e.id} className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid md:grid-cols-[220px_1fr]">
          <Link to={`/kursus/${e.course?.slug}`} className="block aspect-[16/9] md:aspect-auto md:h-full">
            <ProgramVisual title={e.course?.title || ""} category={e.course?.category} image={e.course?.cover_image} />
          </Link>
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-primary leading-snug">{e.course?.title}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Kode {regCode(e.id)} · didaftarkan {formatDate(e.enrolled_at?.slice(0, 10))}</p>
              </div>
              <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", TONE[v.tone])}>{v.headline}</span>
            </div>

            {e.status !== "cancelled" && (
              <ol className="grid grid-cols-5 gap-1" aria-label="Status pendaftaran">
                {v.steps.map((s, i) => {
                  const done = i < v.current, cur = i === v.current;
                  return (
                    <li key={s} className="flex flex-col items-center text-center gap-1.5">
                      <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                        done ? "bg-green-600 text-white" : cur ? (v.tone === "error" ? "bg-destructive text-white" : "bg-primary text-primary-foreground") : "bg-muted text-muted-foreground")}>
                        {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                      </span>
                      <span className={cn("text-[11px] leading-tight", cur ? "font-semibold text-foreground" : "text-muted-foreground")}>{s}</span>
                    </li>
                  );
                })}
              </ol>
            )}

            {v.detail && <p className={cn("rounded-lg px-3 py-2 text-sm flex gap-2", TONE[v.tone])}>{v.tone === "error" && <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}{v.detail}</p>}

            {e.batch && (
              <div className="grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
                <span className="flex items-center gap-2"><GraduationCap className="h-4 w-4" />{e.batch.name}</span>
                <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{formatDateRange(e.batch.start_date, e.batch.end_date)}</span>
                {e.batch.schedule && <span className="flex items-center gap-2"><Clock className="h-4 w-4" />{e.batch.schedule}</span>}
                {e.batch.location && <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{e.batch.location}</span>}
                {e.batch.notes && <span className="sm:col-span-2 text-foreground/80">Catatan: {e.batch.notes}</span>}
              </div>
            )}

            {!online && e.batch_id && (e.status === "active" || e.status === "completed") && (() => {
              const mine = classData.sessions.filter((s) => s.batch_id === e.batch_id);
              if (!mine.length) return null;
              const counted = countedSessions(mine, classData.att);
              const r = recapFor(e.id, counted, classData.att);
              const next = mine.find((s) => s.session_date >= today());
              return (
                <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold">Kehadiran</span>
                    <span className="text-xs text-muted-foreground">{counted.length ? `${r.hadir} dari ${counted.length} pertemuan · ${r.pct}%` : `${mine.length} pertemuan terjadwal`}</span>
                  </div>
                  {counted.length > 0 && <Progress value={r.pct} className="h-1.5" />}
                  {next && e.status === "active" && (
                    <p className="text-sm flex items-start gap-2"><CalendarDays className="h-4 w-4 mt-0.5 shrink-0 text-gold-dark" />
                      <span>Pertemuan berikutnya: <b>{next.session_date === today() ? "hari ini" : dayLong(next.session_date)}</b>{next.topic ? ` — ${next.topic}` : ""}</span>
                    </p>
                  )}
                  <details>
                    <summary className="cursor-pointer text-xs font-semibold text-primary">Lihat jadwal & absensi</summary>
                    <ul className="mt-2 divide-y text-sm">
                      {mine.map((s) => {
                        const m = classData.att[s.id]?.[e.id];
                        return (
                          <li key={s.id} className="flex items-center justify-between gap-3 py-1.5">
                            <span className="min-w-0 truncate"><span className="text-muted-foreground">{dayShort(s.session_date)}</span> · {s.title}{s.topic ? ` — ${s.topic}` : ""}</span>
                            <span className={cn("text-xs font-semibold shrink-0", m ? MARK_BY_ID[m].className : "text-muted-foreground")}>
                              {m ? MARK_BY_ID[m].label : s.session_date > today() ? "Akan datang" : "—"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                </div>
              );
            })()}

            {e.status === "completed" && e.certificate_url && (
              <div className="rounded-xl border border-gold/40 bg-gold/5 p-4 flex flex-wrap items-center gap-3">
                <ShieldCheck className="h-8 w-8 text-gold-dark shrink-0" />
                <div className="flex-1 min-w-[180px]">
                  <p className="text-sm font-semibold">Sertifikat terverifikasi</p>
                  <p className="text-xs text-muted-foreground font-mono">{e.certificate_number || regCode(e.id)}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => copyVerify(e.id)}><Link2 className="h-4 w-4" />Salin link verifikasi</Button>
              </div>
            )}

            {online && (e.status === "active" || e.status === "completed") && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground"><span>Progres belajar</span><span>{pct[e.course_id] ?? 0}%</span></div>
                <Progress value={pct[e.course_id] ?? 0} className="h-1.5" />
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {(e.status === "pending_payment" && !e.payment_proof_url) || e.status === "rejected"
                ? <Button variant="gold" onClick={() => { setUploadFor(e); setFile(null); }}><Upload className="h-4 w-4" />Unggah bukti bayar</Button> : null}
              {online && e.status === "active" && <Button onClick={() => navigate(`/learn/${e.course.slug}`)}><PlayCircle className="h-4 w-4" />{(pct[e.course_id] ?? 0) > 0 ? "Lanjut belajar" : "Mulai belajar"}</Button>}
              {e.status === "completed" && e.certificate_url && <Button variant="gold" onClick={() => openCert(e.certificate_url)}><Award className="h-4 w-4" />Unduh sertifikat</Button>}
              {online && e.status === "completed" && <Button variant="outline" onClick={() => navigate(`/learn/${e.course.slug}`)}>Lihat materi</Button>}
              {!online && (e.status === "active" || e.status === "completed") && (lessonCount[e.course_id] || 0) > 0 && (
                <Button variant={e.status === "active" ? "default" : "outline"} onClick={() => navigate(`/learn/${e.course.slug}`)}><BookOpen className="h-4 w-4" />Materi kelas</Button>
              )}
              <Button asChild variant="outline"><a href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />Hubungi admin</a></Button>
              {["waitlist", "pending_payment", "rejected"].includes(e.status) && (
                <Button variant="ghost" className="text-muted-foreground" onClick={() => cancel(e)}>Batalkan</Button>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="min-h-screen">
      <Header />
      <PageHeader crumbs={[{ label: "Dashboard Saya" }]} title={firstName ? `Halo, ${firstName}` : "Dashboard Saya"}
        subtitle="Pantau status pendaftaran, jadwal kelas, materi, dan sertifikat Anda di sini." />
      <main className="py-10 md:py-14">
        <div className="container mx-auto px-4 max-w-5xl space-y-10">
          {loading ? (
            <div className="space-y-4">{[0, 1].map((i) => <div key={i} className="h-56 rounded-2xl bg-muted animate-pulse" />)}</div>
          ) : enrollments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 font-semibold text-primary">Belum ada pendaftaran</p>
              <p className="mt-1 text-sm text-muted-foreground">Pilih program pelatihan dan daftar dalam 3 langkah.</p>
              <Button className="mt-5" onClick={() => navigate("/kursus")}>Lihat program</Button>
            </div>
          ) : (
            <>
              {current.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pendaftaran berjalan ({current.length})</h2>
                  {current.map(card)}
                </section>
              )}
              {finished.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Selesai ({finished.length})</h2>
                  {finished.map(card)}
                </section>
              )}
              {cancelled.length > 0 && (
                <details className="rounded-xl border border-border bg-card p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">Riwayat dibatalkan ({cancelled.length})</summary>
                  <ul className="mt-3 space-y-2 text-sm">
                    {cancelled.map((e) => (
                      <li key={e.id} className="flex items-center justify-between gap-3">
                        <span>{e.course?.title} <span className="text-muted-foreground">· {regCode(e.id)}</span></span>
                        <Link to={`/daftar/${e.course?.slug}`} className="font-semibold text-primary underline underline-offset-4">Daftar lagi</Link>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />

      <Dialog open={!!uploadFor} onOpenChange={(v) => !v && setUploadFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unggah bukti pembayaran</DialogTitle>
            <DialogDescription>{uploadFor?.course?.title} · {rupiah(uploadFor?.payment_amount || 0)}</DialogDescription>
          </DialogHeader>
          {payInfo && (
            <div className="rounded-lg bg-secondary/70 p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4" />{payInfo.bank_name}</p>
              <p className="mt-1 font-mono text-base">{payInfo.account_number}</p>
              <p className="text-muted-foreground">a.n. {payInfo.account_holder}</p>
            </div>
          )}
          <div className="grid gap-3">
            <div><Label>Metode pembayaran</Label>
              <select className="mt-1.5 w-full h-11 rounded-md border bg-background px-3 text-sm" value={method} onChange={(ev) => setMethod(ev.target.value)}>
                {METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div><Label>File bukti (foto/PDF, maks. 5 MB)</Label>
              <label className="mt-1.5 flex h-11 cursor-pointer items-center gap-2 rounded-md border border-dashed bg-background px-3 text-sm text-muted-foreground hover:border-primary/50">
                <Upload className="h-4 w-4" /><span className="truncate">{file ? file.name : "Pilih file"}</span>
                <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(ev) => setFile(ev.target.files?.[0] || null)} />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadFor(null)}>Batal</Button>
            <Button variant="gold" onClick={upload} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Kirim bukti</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyCourses;
