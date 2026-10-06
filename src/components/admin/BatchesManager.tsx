import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Copy, Loader2, MapPin, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BATCH_STATUS_LABEL, fetchBatches, fetchSeats, formatDate, formatDateRange, rupiah, type Batch, type BatchStatus } from "@/lib/batches";

const db = supabase as any;
const STATUS_COLOR: Record<BatchStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  open: "bg-green-600 text-white",
  closed: "bg-amber-500 text-white",
  running: "bg-primary text-primary-foreground",
  finished: "bg-secondary text-secondary-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

type Draft = Omit<Batch, "id" | "sort_order"> & { id?: string; sort_order?: number };

const blank = (courseId: string): Draft => ({
  course_id: courseId, name: "", start_date: null, end_date: null, schedule: "", location: "",
  quota: null, price: null, registration_deadline: null, status: "open", notes: "",
});

interface Props { courseId?: string; coursePrice?: number }

/** Kelola angkatan: per program (di editor program) atau semua program (menu Angkatan). */
const BatchesManager = ({ courseId, coursePrice }: Props) => {
  const { toast } = useToast();
  const [courses, setCourses] = useState<{ id: string; title: string; price: number; is_free: boolean }[]>([]);
  const [filter, setFilter] = useState<string>(courseId || "all");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [seats, setSeats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (courseId) return;
    supabase.from("courses").select("id,title,price,is_free").order("sort_order").then(({ data }) => setCourses((data as any) || []));
  }, [courseId]);

  const load = useCallback(async () => {
    setLoading(true);
    const cid = courseId || (filter === "all" ? undefined : filter);
    const [b, s] = await Promise.all([fetchBatches(cid, true), fetchSeats(cid)]);
    setBatches(b);
    setSeats(s);
    setLoading(false);
  }, [courseId, filter]);
  useEffect(() => { load(); }, [load]);

  const courseTitle = (id: string) => courses.find((c) => c.id === id)?.title || "";
  const basePrice = (id: string) => {
    if (courseId) return coursePrice ?? 0;
    const c = courses.find((x) => x.id === id);
    return c ? (c.is_free ? 0 : c.price) : 0;
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) return toast({ title: "Nama angkatan wajib diisi", variant: "destructive" });
    if (!draft.course_id) return toast({ title: "Pilih program dulu", variant: "destructive" });
    if (draft.start_date && draft.end_date && draft.end_date < draft.start_date) return toast({ title: "Tanggal selesai sebelum tanggal mulai", variant: "destructive" });
    setSaving(true);
    const payload = {
      course_id: draft.course_id, name: draft.name.trim(), start_date: draft.start_date || null, end_date: draft.end_date || null,
      schedule: draft.schedule?.trim() || null, location: draft.location?.trim() || null,
      quota: draft.quota || null, price: draft.price === null || (draft.price as any) === "" ? null : Number(draft.price),
      registration_deadline: draft.registration_deadline || null, status: draft.status, notes: draft.notes?.trim() || null,
    };
    const { error } = draft.id
      ? await db.from("batches").update(payload).eq("id", draft.id)
      : await db.from("batches").insert(payload);
    setSaving(false);
    if (error) return toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    toast({ title: draft.id ? "Angkatan diperbarui" : "Angkatan ditambahkan" });
    setDraft(null);
    load();
  };

  const remove = async (b: Batch) => {
    if ((seats[b.id] || 0) > 0) return toast({ title: "Tidak bisa dihapus", description: "Sudah ada pendaftar. Ubah statusnya menjadi Dibatalkan atau Selesai.", variant: "destructive" });
    if (!confirm(`Hapus angkatan "${b.name}"?`)) return;
    const { error } = await db.from("batches").delete().eq("id", b.id);
    if (error) return toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
    load();
  };

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!courseId ? (
          <select className="h-10 w-full sm:w-auto rounded-md border bg-background px-3 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Semua program</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        ) : <p className="text-sm text-muted-foreground">Calon peserta memilih salah satu angkatan yang statusnya "Pendaftaran dibuka".</p>}
        <Button variant="gold" onClick={() => setDraft(blank(courseId || (filter !== "all" ? filter : courses[0]?.id || "")))}>
          <Plus className="h-4 w-4 mr-1" />Tambah angkatan
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : batches.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Belum ada angkatan. Tanpa angkatan, calon peserta tetap bisa mendaftar sebagai <strong>daftar minat</strong> dan Anda pindahkan ke angkatan nanti.
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
          {batches.map((b) => {
            const taken = seats[b.id] || 0;
            const pct = b.quota ? Math.min(100, Math.round((taken / b.quota) * 100)) : 0;
            return (
              <div key={b.id} className="min-w-0 rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {!courseId && <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark truncate">{courseTitle(b.course_id)}</p>}
                    <h4 className="font-bold truncate">{b.name}</h4>
                  </div>
                  <Badge className={`shrink-0 ${STATUS_COLOR[b.status]}`}>{BATCH_STATUS_LABEL[b.status]}</Badge>
                </div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{formatDateRange(b.start_date, b.end_date)}{b.schedule && ` · ${b.schedule}`}</li>
                  {b.location && <li className="flex items-center gap-2"><MapPin className="h-4 w-4" />{b.location}</li>}
                  <li className="flex items-center gap-2"><Users className="h-4 w-4" />{taken} pendaftar{b.quota ? ` dari ${b.quota} kursi` : " (tanpa batas kuota)"}</li>
                </ul>
                {b.quota && (
                  <div className="h-2 rounded-full bg-muted overflow-hidden" aria-label={`${pct}% terisi`}>
                    <div className={`h-full ${pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-amber-500" : "bg-green-600"}`} style={{ width: `${pct}%` }} />
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{rupiah(b.price ?? basePrice(b.course_id))}{b.price != null && <span className="ml-1 text-xs font-normal text-muted-foreground">(harga khusus)</span>}</span>
                  {b.registration_deadline && <span className="text-xs text-muted-foreground">Tutup {formatDate(b.registration_deadline)}</span>}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => setDraft({ ...b })}><Pencil className="h-4 w-4 mr-1" />Ubah</Button>
                  <Button size="sm" variant="outline" onClick={() => setDraft({ ...b, id: undefined, name: `${b.name} (salinan)`, status: "draft" })}><Copy className="h-4 w-4 mr-1" />Salin</Button>
                  {taken > 0 && (
                    <Button size="sm" variant="ghost" asChild>
                      <Link to={`/admin?menu=pendaftar&filter=all&batch=${b.id}`}><Users className="h-4 w-4 mr-1" />Pendaftar</Link>
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => remove(b)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{draft?.id ? "Ubah angkatan" : "Angkatan baru"}</DialogTitle></DialogHeader>
          {draft && (
            <div className="grid gap-3">
              {!courseId && (
                <div><Label>Program</Label>
                  <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={draft.course_id} onChange={(e) => set({ course_id: e.target.value })}>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
              )}
              <div><Label>Nama angkatan</Label><Input value={draft.name} placeholder="Angkatan 1 — November 2026" onChange={(e) => set({ name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tanggal mulai</Label><Input type="date" value={draft.start_date || ""} onChange={(e) => set({ start_date: e.target.value || null })} /></div>
                <div><Label>Tanggal selesai</Label><Input type="date" value={draft.end_date || ""} onChange={(e) => set({ end_date: e.target.value || null })} /></div>
              </div>
              <div><Label>Jadwal pertemuan</Label><Input value={draft.schedule || ""} placeholder="Senin–Jumat, 08.00–12.00 WITA" onChange={(e) => set({ schedule: e.target.value })} /></div>
              <div><Label>Lokasi</Label><Input value={draft.location || ""} placeholder="Kantor LPK BCG, Bontang" onChange={(e) => set({ location: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Kuota kursi</Label><Input type="number" min={1} value={draft.quota ?? ""} placeholder="Tanpa batas" onChange={(e) => set({ quota: e.target.value ? parseInt(e.target.value) : null })} /></div>
                <div><Label>Batas pendaftaran</Label><Input type="date" value={draft.registration_deadline || ""} onChange={(e) => set({ registration_deadline: e.target.value || null })} /></div>
              </div>
              <div>
                <Label>Harga khusus angkatan (Rp)</Label>
                <Input type="number" min={0} value={draft.price ?? ""} placeholder={`Kosongkan = harga program (${rupiah(basePrice(draft.course_id))})`} onChange={(e) => set({ price: e.target.value === "" ? null : parseInt(e.target.value) })} />
              </div>
              <div><Label>Status</Label>
                <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={draft.status} onChange={(e) => set({ status: e.target.value as BatchStatus })}>
                  {(Object.keys(BATCH_STATUS_LABEL) as BatchStatus[]).map((k) => <option key={k} value={k}>{BATCH_STATUS_LABEL[k]}</option>)}
                </select>
              </div>
              <div><Label>Catatan untuk peserta (opsional)</Label><Textarea rows={2} value={draft.notes || ""} placeholder="Bawa laptop sendiri, seragam, dll." onChange={(e) => set({ notes: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>Batal</Button>
            <Button variant="gold" onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BatchesManager;
