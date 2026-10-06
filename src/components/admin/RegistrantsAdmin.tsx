import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Ban, CalendarDays, CheckCircle2, Download, Eye, Loader2, MessageCircle, MoveRight, RefreshCw, Search, Wallet, XCircle,
} from "lucide-react";
import { fetchBatches, fetchSeats, formatDateRange, priceFor, regCode, rupiah, type Batch } from "@/lib/batches";
import {
  STAGE, downloadCsv, loadEnrollments, relativeTime, stageOf, waUrl, type AdminEnrollment, type AdminProfile, type Stage,
} from "@/lib/adminData";
import { cn } from "@/lib/utils";

const db = supabase as any;

export type RegistrantFilter = Stage | "action" | "all";

const FILTERS: { id: RegistrantFilter; label: string }[] = [
  { id: "action", label: "Perlu tindakan" },
  { id: "all", label: "Semua" },
  { id: "verify", label: STAGE.verify.label },
  { id: "unpaid", label: STAGE.unpaid.label },
  { id: "waitlist", label: STAGE.waitlist.label },
  { id: "active", label: STAGE.active.label },
  { id: "completed", label: STAGE.completed.label },
  { id: "rejected", label: STAGE.rejected.label },
  { id: "cancelled", label: STAGE.cancelled.label },
];

const matches = (f: RegistrantFilter, s: Stage) =>
  f === "all" ? true : f === "action" ? s === "verify" || s === "waitlist" : f === s;

interface PayInfo { bank_name?: string; account_number?: string; account_holder?: string }

interface Props { initialFilter?: RegistrantFilter; initialBatch?: string | null }

const RegistrantsAdmin = ({ initialFilter = "action", initialBatch = null }: Props) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<AdminEnrollment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, AdminProfile>>({});
  const [batches, setBatches] = useState<Batch[]>([]);
  const [seats, setSeats] = useState<Record<string, number>>({});
  const [payInfo, setPayInfo] = useState<PayInfo | null>(null);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [filter, setFilter] = useState<RegistrantFilter>(initialFilter);
  const [program, setProgram] = useState("all");
  const [batchFilter, setBatchFilter] = useState(initialBatch || "all");
  const [q, setQ] = useState("");

  const [rejecting, setRejecting] = useState<AdminEnrollment | null>(null);
  const [reason, setReason] = useState("");
  const [assigning, setAssigning] = useState<AdminEnrollment | null>(null);
  const [pick, setPick] = useState<string>("");
  const [assigned, setAssigned] = useState<{ row: AdminEnrollment; batch: Batch; amount: number; active: boolean } | null>(null);

  const load = useCallback(async () => {
    const [{ rows, profiles }, bs, st, pi, cs] = await Promise.all([
      loadEnrollments(),
      fetchBatches(undefined, true),
      fetchSeats(),
      supabase.from("site_content").select("value").eq("key", "payment_info").maybeSingle(),
      supabase.from("courses").select("id,title").order("title"),
    ]);
    setRows(rows); setProfiles(profiles); setBatches(bs); setSeats(st);
    setCourses((cs.data as { id: string; title: string }[]) || []);
    setPayInfo((pi.data?.value as PayInfo) || null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);
  useEffect(() => {
    if (!initialBatch) return;
    const b = batches.find((x) => x.id === initialBatch);
    if (b) { setProgram(b.course_id); setBatchFilter(b.id); }
  }, [initialBatch, batches]);

  const programs = useMemo(() => {
    const m = new Map<string, string>(courses.map((c) => [c.id, c.title]));
    rows.forEach((r) => r.course && m.set(r.course.id, r.course.title));
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows, courses]);

  const batchOptions = useMemo(
    () => batches.filter((b) => program === "all" || b.course_id === program),
    [batches, program],
  );

  const scoped = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (program !== "all" && r.course_id !== program) return false;
      if (batchFilter === "none" && r.batch_id) return false;
      if (batchFilter !== "all" && batchFilter !== "none" && r.batch_id !== batchFilter) return false;
      if (!t) return true;
      const p = profiles[r.user_id];
      return [r.course?.title, p?.full_name, p?.phone, regCode(r.id), r.batch?.name].some((x) => (x || "").toLowerCase().includes(t));
    });
  }, [rows, profiles, program, batchFilter, q]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(FILTERS.map((f) => [f.id, 0])) as Record<RegistrantFilter, number>;
    scoped.forEach((r) => {
      const s = stageOf(r);
      FILTERS.forEach((f) => { if (matches(f.id, s)) c[f.id]++; });
    });
    return c;
  }, [scoped]);

  const visible = useMemo(() => scoped.filter((r) => matches(filter, stageOf(r))), [scoped, filter]);

  // ---------------------------------------------------------------- pesan WA
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const scheduleLine = (b: AdminEnrollment["batch"] | Batch | null) =>
    b ? `${b.name}, ${formatDateRange(b.start_date, b.end_date)}${b.location ? ` di ${b.location}` : ""}` : "";

  const messageFor = (r: AdminEnrollment, kind: Stage | "assigned", batch?: Batch | null, amount?: number) => {
    const p = profiles[r.user_id];
    const hi = `Halo ${p?.full_name?.split(" ")[0] || "Bapak/Ibu"},`;
    const title = `"${r.course?.title || "program"}"`;
    const code = regCode(r.id);
    const b = batch ?? r.batch;
    const bank = payInfo?.account_number
      ? ` ke ${payInfo.bank_name || "rekening"} ${payInfo.account_number}${payInfo.account_holder ? ` a.n. ${payInfo.account_holder}` : ""}`
      : "";
    switch (kind) {
      case "active":
      case "completed":
        return r.course?.type === "online"
          ? `${hi} pendaftaran Anda (${code}) untuk program ${title} sudah aktif. Mulai belajar di ${origin}/learn/${r.course?.slug}. Selamat belajar!`
          : `${hi} pendaftaran Anda (${code}) untuk program ${title} sudah aktif.${b ? ` Jadwal: ${scheduleLine(b)}.` : ""} Detail ada di ${origin}/kursus-saya. Sampai jumpa di kelas!`;
      case "rejected":
        return `${hi} pembayaran Anda (${code}) untuk program ${title} belum dapat kami verifikasi${r.notes ? ` (${r.notes})` : ""}. Silakan unggah ulang bukti di ${origin}/kursus-saya.`;
      case "unpaid":
      case "verify":
        return `${hi} terima kasih sudah mendaftar program ${title} (${code}). Biaya ${rupiah(amount ?? r.payment_amount ?? 0)} dapat ditransfer${bank}, lalu unggah bukti di ${origin}/kursus-saya.`;
      case "assigned":
        return amount && amount > 0
          ? `${hi} Anda kami masukkan ke ${scheduleLine(b)} untuk program ${title} (${code}). Biaya ${rupiah(amount)} dapat ditransfer${bank}, lalu unggah bukti di ${origin}/kursus-saya.`
          : `${hi} Anda kami masukkan ke ${scheduleLine(b)} untuk program ${title} (${code}). Pendaftaran sudah aktif, detail di ${origin}/kursus-saya.`;
      default:
        return `${hi} terima kasih atas minat Anda pada program ${title} (${code}). `;
    }
  };

  // ---------------------------------------------------------------- aksi
  const update = async (r: AdminEnrollment, patch: Record<string, unknown>, ok: string) => {
    setBusy(r.id);
    const { error } = await db.from("enrollments").update(patch).eq("id", r.id);
    setBusy(null);
    if (error) { toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" }); return false; }
    toast({ title: ok });
    await load();
    return true;
  };

  const approve = async (r: AdminEnrollment, cash = false) => {
    if (cash && !confirm(`Tandai pendaftaran ${regCode(r.id)} sudah lunas (dibayar tunai/langsung)?`)) return;
    const done = await update(
      r,
      { status: "active", paid_at: new Date().toISOString(), notes: null, ...(cash && !r.payment_method ? { payment_method: "Tunai" } : {}) },
      "Pendaftaran diaktifkan",
    );
    if (done) supabase.functions.invoke("notify-enrollment-approved", { body: { enrollment_id: r.id } }).catch(() => {});
  };

  const reject = async () => {
    if (!rejecting) return;
    const done = await update(rejecting, { status: "rejected", notes: reason.trim() || "Bukti pembayaran tidak sesuai" }, "Pembayaran ditolak");
    if (done) { setRejecting(null); setReason(""); }
  };

  const cancel = async (r: AdminEnrollment) => {
    if (!confirm(`Batalkan pendaftaran ${regCode(r.id)}? Kursinya akan dilepas.`)) return;
    await update(r, { status: "cancelled" }, "Pendaftaran dibatalkan");
  };

  const restore = async (r: AdminEnrollment) => {
    await update(r, { status: r.batch_id || r.course?.type === "online" ? "pending_payment" : "waitlist", notes: null }, "Pendaftaran dipulihkan");
  };

  const viewProof = async (path: string) => {
    const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 600);
    if (error || !data) return toast({ title: "Gagal membuka bukti", variant: "destructive" });
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const openAssign = (r: AdminEnrollment) => { setAssigning(r); setAssigned(null); setPick(r.batch_id || ""); };

  const assignChoices = useMemo(
    () => (assigning ? batches.filter((b) => b.course_id === assigning.course_id && !["cancelled", "finished"].includes(b.status)) : []),
    [assigning, batches],
  );

  const saveAssign = async () => {
    if (!assigning || !assigning.course) return;
    const b = batches.find((x) => x.id === pick);
    if (!b) return toast({ title: "Pilih angkatan dulu" });
    const amount = priceFor(assigning.course, b);
    const keep = assigning.status === "active" || assigning.status === "completed";
    const willBeActive = keep || amount === 0;
    const patch: Record<string, unknown> = keep
      ? { batch_id: b.id }
      : {
          batch_id: b.id,
          payment_amount: amount,
          status: willBeActive ? "active" : "pending_payment",
          paid_at: willBeActive ? new Date().toISOString() : null,
          notes: null,
        };
    setBusy(assigning.id);
    const { error } = await db.from("enrollments").update(patch).eq("id", assigning.id);
    setBusy(null);
    if (error) return toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    setAssigned({ row: assigning, batch: b, amount, active: willBeActive });
    load();
  };

  const exportCsv = () => {
    downloadCsv(
      `pendaftar-bcg-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Kode", "Nama", "WhatsApp", "Program", "Angkatan", "Tanggal angkatan", "Status", "Nominal", "Metode", "Tanggal daftar", "Tanggal bayar", "Catatan peserta"],
      visible.map((r) => {
        const p = profiles[r.user_id];
        return [
          regCode(r.id), p?.full_name || "", p?.phone || "", r.course?.title || "", r.batch?.name || "",
          r.batch ? formatDateRange(r.batch.start_date, r.batch.end_date) : "", STAGE[stageOf(r)].label,
          r.payment_amount ?? 0, r.payment_method || "", new Date(r.enrolled_at).toLocaleString("id-ID"),
          r.paid_at ? new Date(r.paid_at).toLocaleString("id-ID") : "", r.participant_note || "",
        ];
      }),
    );
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  // ---------------------------------------------------------------- tampilan
  const row = (r: AdminEnrollment) => {
    const p = profiles[r.user_id];
    const s = stageOf(r);
    const isBusy = busy === r.id;
    const wa = waUrl(p?.phone, messageFor(r, s));
    const offline = r.course?.type !== "online";
    return (
      <Card key={r.id} className="shadow-none">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h4 className="font-semibold truncate">{p?.full_name || "Tanpa nama"}</h4>
                <span className="font-mono text-[11px] text-muted-foreground">{regCode(r.id)}</span>
                <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border", STAGE[s].className)}>{STAGE[s].label}</span>
              </div>
              <p className="text-sm text-foreground/90">
                {r.course?.title || "Program terhapus"}
                {r.batch ? (
                  <span className="text-muted-foreground"> · {r.batch.name} ({formatDateRange(r.batch.start_date, r.batch.end_date)})</span>
                ) : offline ? (
                  <span className="text-muted-foreground"> · belum ada angkatan</span>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {p?.phone || "tanpa no. WA"} · daftar {relativeTime(r.enrolled_at)}
                {s !== "waitlist" && <> · <span className="font-medium text-foreground">{rupiah(r.payment_amount ?? 0)}</span></>}
                {r.payment_method && ` · ${r.payment_method}`}
              </p>
              {r.participant_note && (
                <p className="text-xs bg-muted/60 rounded-md px-2.5 py-1.5 mt-1"><span className="font-medium">Catatan peserta:</span> {r.participant_note}</p>
              )}
              {s === "rejected" && r.notes && <p className="text-xs text-destructive">Alasan ditolak: {r.notes}</p>}
            </div>

            <div className="flex flex-wrap gap-2 md:justify-end md:max-w-[340px]">
              {r.payment_proof_url && s !== "cancelled" && (
                <Button size="sm" variant="outline" onClick={() => viewProof(r.payment_proof_url!)}><Eye className="h-4 w-4 mr-1.5" />Bukti</Button>
              )}
              {(s === "verify" || s === "rejected") && (
                <Button size="sm" variant="gold" disabled={isBusy} onClick={() => approve(r)}>
                  {isBusy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}Setujui
                </Button>
              )}
              {s === "verify" && (
                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" disabled={isBusy} onClick={() => { setRejecting(r); setReason(""); }}>
                  <XCircle className="h-4 w-4 mr-1.5" />Tolak
                </Button>
              )}
              {s === "unpaid" && (
                <Button size="sm" variant="gold" disabled={isBusy} onClick={() => approve(r, true)}>
                  <Wallet className="h-4 w-4 mr-1.5" />Tandai lunas
                </Button>
              )}
              {s === "waitlist" && (
                <Button size="sm" variant="gold" onClick={() => openAssign(r)}><MoveRight className="h-4 w-4 mr-1.5" />Masukkan ke angkatan</Button>
              )}
              {offline && (s === "unpaid" || s === "verify" || s === "active") && (
                <Button size="sm" variant="outline" onClick={() => openAssign(r)}><CalendarDays className="h-4 w-4 mr-1.5" />{r.batch ? "Pindah angkatan" : "Pilih angkatan"}</Button>
              )}
              {wa && s !== "cancelled" && (
                <Button size="sm" variant="outline" asChild>
                  <a href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 mr-1.5" />{s === "unpaid" ? "Ingatkan" : "WhatsApp"}</a>
                </Button>
              )}
              {(s === "unpaid" || s === "waitlist" || s === "rejected") && (
                <Button size="sm" variant="ghost" className="text-muted-foreground" disabled={isBusy} onClick={() => cancel(r)}><Ban className="h-4 w-4 mr-1.5" />Batalkan</Button>
              )}
              {s === "cancelled" && (
                <Button size="sm" variant="ghost" disabled={isBusy} onClick={() => restore(r)}><RefreshCw className="h-4 w-4 mr-1.5" />Pulihkan</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const emptyText: Partial<Record<RegistrantFilter, string>> = {
    action: "Tidak ada yang perlu ditindaklanjuti. Bukti bayar baru dan daftar minat akan muncul di sini.",
    verify: "Tidak ada bukti bayar yang menunggu verifikasi.",
    waitlist: "Belum ada pendaftar minat.",
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari nama, no. WA, kode BCG-…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select aria-label="Program" className="h-10 rounded-md border bg-background px-3 text-sm lg:w-56" value={program}
          onChange={(e) => { setProgram(e.target.value); setBatchFilter("all"); }}>
          <option value="all">Semua program</option>
          {programs.map(([id, t]) => <option key={id} value={id}>{t}</option>)}
        </select>
        <select aria-label="Angkatan" className="h-10 rounded-md border bg-background px-3 text-sm lg:w-56" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
          <option value="all">Semua angkatan</option>
          <option value="none">Tanpa angkatan</option>
          {batchOptions.map((b) => <option key={b.id} value={b.id}>{b.name}{program === "all" ? ` · ${programs.find(([id]) => id === b.course_id)?.[1] || ""}` : ""}</option>)}
        </select>
        <Button variant="outline" onClick={exportCsv} disabled={!visible.length} className="lg:ml-auto"><Download className="h-4 w-4 mr-2" />Unduh CSV</Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-sm font-medium transition-colors",
              filter === f.id ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-secondary",
            )}>
            {f.label}
            <span className={cn("text-xs tabular-nums rounded-full px-1.5", filter === f.id ? "bg-primary-foreground/15" : "bg-muted text-muted-foreground")}>{counts[f.id]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card className="shadow-none"><CardContent className="p-10 text-center text-sm text-muted-foreground">{emptyText[filter] || "Tidak ada pendaftar pada filter ini."}</CardContent></Card>
      ) : (
        <div className="space-y-3">{visible.map(row)}</div>
      )}

      {/* Tolak */}
      <Dialog open={!!rejecting} onOpenChange={(v) => !v && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak bukti pembayaran</DialogTitle>
            <DialogDescription>Alasan ditampilkan di Dashboard peserta supaya mereka bisa mengunggah ulang bukti yang benar.</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} placeholder="Contoh: nominal transfer kurang / foto bukti tidak terbaca" value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Batal</Button>
            <Button variant="destructive" disabled={busy === rejecting?.id} onClick={reject}>Tolak pembayaran</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Atur angkatan */}
      <Dialog open={!!assigning} onOpenChange={(v) => { if (!v) { setAssigning(null); setAssigned(null); } }}>
        <DialogContent className="max-w-lg">
          {assigned ? (
            <>
              <DialogHeader>
                <DialogTitle>Tersimpan</DialogTitle>
                <DialogDescription>
                  {profiles[assigned.row.user_id]?.full_name || "Peserta"} masuk ke {assigned.batch.name}.{" "}
                  {assigned.active ? "Pendaftarannya aktif." : `Peserta perlu membayar ${rupiah(assigned.amount)} dan mengunggah bukti dari Dashboard Saya.`}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setAssigning(null); setAssigned(null); }}>Tutup</Button>
                {(() => {
                  const url = waUrl(profiles[assigned.row.user_id]?.phone, messageFor(assigned.row, "assigned", assigned.batch, assigned.active ? 0 : assigned.amount));
                  return url ? (
                    <Button variant="gold" asChild><a href={url} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 mr-2" />Kabari via WhatsApp</a></Button>
                  ) : null;
                })()}
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{assigning?.batch_id ? "Pindah angkatan" : "Masukkan ke angkatan"}</DialogTitle>
                <DialogDescription>
                  {profiles[assigning?.user_id || ""]?.full_name || "Peserta"} · {assigning?.course?.title}
                </DialogDescription>
              </DialogHeader>
              {assignChoices.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Program ini belum punya angkatan aktif. Buat angkatan dulu di menu <b>Angkatan</b>.</p>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {assignChoices.map((b) => {
                    const taken = seats[b.id] || 0;
                    const full = b.quota != null && taken >= b.quota && b.id !== assigning?.batch_id;
                    const price = assigning?.course ? priceFor(assigning.course, b) : 0;
                    return (
                      <label key={b.id} className={cn(
                        "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                        pick === b.id ? "border-primary bg-primary/5" : "hover:bg-secondary/60",
                      )}>
                        <input type="radio" name="batch" className="mt-1 accent-[hsl(var(--primary))]" checked={pick === b.id} onChange={() => setPick(b.id)} />
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center justify-between gap-2">
                            <span className="font-medium">{b.name}</span>
                            <span className="text-sm font-semibold">{rupiah(price)}</span>
                          </span>
                          <span className="block text-xs text-muted-foreground mt-0.5">
                            {formatDateRange(b.start_date, b.end_date)}{b.location ? ` · ${b.location}` : ""}
                          </span>
                          <span className={cn("block text-xs mt-0.5", full ? "text-destructive font-medium" : "text-muted-foreground")}>
                            {b.quota != null ? `${taken}/${b.quota} kursi terisi${full ? " · penuh" : ""}` : `${taken} peserta`}
                            {b.status !== "open" && ` · ${b.status === "closed" ? "pendaftaran ditutup" : b.status === "running" ? "sedang berjalan" : "draf"}`}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {assigning && assigning.status !== "active" && assigning.status !== "completed" && pick && (
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const b = batches.find((x) => x.id === pick);
                    const amt = b && assigning.course ? priceFor(assigning.course, b) : 0;
                    if (amt === 0) return "Angkatan gratis: pendaftaran langsung aktif.";
                    return assigning.payment_proof_url && assigning.status === "pending_payment"
                      ? `Tagihan menjadi ${rupiah(amt)}. Bukti bayar yang sudah diunggah tetap menunggu verifikasi.`
                      : `Status menjadi "Belum bayar" dengan tagihan ${rupiah(amt)}.`;
                  })()}
                </p>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setAssigning(null)}>Batal</Button>
                <Button variant="gold" disabled={!pick || busy === assigning?.id || pick === assigning?.batch_id} onClick={saveAssign}>
                  {busy === assigning?.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Simpan
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RegistrantsAdmin;
