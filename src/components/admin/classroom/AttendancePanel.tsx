import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarPlus, CheckCheck, Loader2, Pencil, Plus, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { Batch } from "@/lib/batches";
import {
  MARKS, WEEKDAYS, datesBetween, dayLong, dayShort, todayIso, toDate, toIso,
  type AttendanceMap, type Mark, type Member, type Session,
} from "@/lib/classroom";

const db = supabase as any;

interface Props {
  batch: Batch;
  members: Member[];
  sessions: Session[];
  attendance: AttendanceMap;
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceMap>>;
  reloadSessions: () => Promise<void>;
}

type SessionDraft = { id?: string; session_date: string; title: string; topic: string };

const AttendancePanel = ({ batch, members, sessions, attendance, setAttendance, reloadSessions }: Props) => {
  const { toast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<SessionDraft | null>(null);
  const [gen, setGen] = useState<{ from: string; to: string; days: number[]; prefix: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [bulk, setBulk] = useState(false);

  // pilih pertemuan hari ini, atau yang terdekat
  useEffect(() => {
    if (selected && sessions.some((s) => s.id === selected)) return;
    const today = todayIso();
    const pick = sessions.find((s) => s.session_date === today)
      || [...sessions].reverse().find((s) => s.session_date < today)
      || sessions[0];
    setSelected(pick?.id || null);
  }, [sessions, selected]);

  // gulirkan daftar (bukan halaman) ke pertemuan terpilih
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>(`[data-session="${selected}"]`);
    if (list && el) list.scrollTop = el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2;
  }, [selected]);

  const session = sessions.find((s) => s.id === selected) || null;
  const marks = useMemo(() => (session ? attendance[session.id] || {} : {}), [attendance, session]);
  const counts = useMemo(() => {
    const c: Record<Mark | "none", number> = { hadir: 0, izin: 0, sakit: 0, alpa: 0, none: 0 };
    members.forEach((m) => { c[marks[m.id] || "none"]++; });
    return c;
  }, [marks, members]);

  const setMark = async (enrollmentId: string, mark: Mark | null) => {
    if (!session) return;
    const prev = attendance[session.id]?.[enrollmentId] || null;
    const apply = (val: Mark | null) => setAttendance((a) => {
      const row = { ...(a[session.id] || {}) };
      if (val) row[enrollmentId] = val; else delete row[enrollmentId];
      return { ...a, [session.id]: row };
    });
    apply(mark);
    const { error } = mark
      ? await db.from("attendance").upsert(
        { session_id: session.id, enrollment_id: enrollmentId, status: mark, marked_at: new Date().toISOString() },
        { onConflict: "session_id,enrollment_id" },
      )
      : await db.from("attendance").delete().eq("session_id", session.id).eq("enrollment_id", enrollmentId);
    if (error) { apply(prev); toast({ title: "Gagal menyimpan absen", description: error.message, variant: "destructive" }); }
  };

  const markRestPresent = async () => {
    if (!session) return;
    const rest = members.filter((m) => !marks[m.id]);
    if (!rest.length) return;
    setBulk(true);
    const rows = rest.map((m) => ({ session_id: session.id, enrollment_id: m.id, status: "hadir", marked_at: new Date().toISOString() }));
    const { error } = await db.from("attendance").upsert(rows, { onConflict: "session_id,enrollment_id" });
    setBulk(false);
    if (error) return toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    setAttendance((a) => ({ ...a, [session.id]: { ...(a[session.id] || {}), ...Object.fromEntries(rest.map((m) => [m.id, "hadir" as Mark])) } }));
    toast({ title: `${rest.length} peserta ditandai hadir` });
  };

  const saveSession = async () => {
    if (!draft) return;
    if (!draft.session_date) return toast({ title: "Tanggal wajib diisi", variant: "destructive" });
    setSaving(true);
    const payload = {
      batch_id: batch.id, session_date: draft.session_date,
      title: draft.title.trim() || `Pertemuan ${sessions.length + (draft.id ? 0 : 1)}`, topic: draft.topic.trim() || null,
    };
    const { data, error } = draft.id
      ? await db.from("batch_sessions").update(payload).eq("id", draft.id).select().maybeSingle()
      : await db.from("batch_sessions").insert(payload).select().maybeSingle();
    setSaving(false);
    if (error) return toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    setDraft(null);
    await reloadSessions();
    if (data?.id) setSelected(data.id);
  };

  const removeSession = async (s: Session) => {
    const n = Object.keys(attendance[s.id] || {}).length;
    if (!confirm(`Hapus ${s.title || "pertemuan"} (${dayShort(s.session_date)})?${n ? ` ${n} catatan absen ikut terhapus.` : ""}`)) return;
    const { error } = await db.from("batch_sessions").delete().eq("id", s.id);
    if (error) return toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
    setSelected(null);
    await reloadSessions();
  };

  const openGenerator = () => {
    const from = batch.start_date || todayIso();
    const fallbackEnd = new Date(toDate(from)); fallbackEnd.setDate(fallbackEnd.getDate() + 13);
    setGen({ from, to: batch.end_date || toIso(fallbackEnd), days: [1, 2, 3, 4, 5], prefix: "Pertemuan" });
  };

  const genDates = useMemo(() => {
    if (!gen || !gen.from || !gen.to || gen.to < gen.from) return [];
    const existing = new Set(sessions.map((s) => s.session_date));
    return datesBetween(gen.from, gen.to, gen.days).filter((d) => !existing.has(d));
  }, [gen, sessions]);

  const runGenerator = async () => {
    if (!gen || !genDates.length) return;
    setSaving(true);
    const all = [...sessions.map((s) => s.session_date), ...genDates].sort();
    const rows = genDates.map((d) => ({ batch_id: batch.id, session_date: d, title: `${gen.prefix.trim() || "Pertemuan"} ${all.indexOf(d) + 1}` }));
    const { error } = await db.from("batch_sessions").insert(rows);
    setSaving(false);
    if (error) return toast({ title: "Gagal membuat jadwal", description: error.message, variant: "destructive" });
    toast({ title: `${rows.length} pertemuan ditambahkan` });
    setGen(null);
    await reloadSessions();
  };

  const today = todayIso();

  return (
    <div className="grid lg:grid-cols-[300px_minmax(0,1fr)] gap-5 items-start">
      {/* Daftar pertemuan (desktop) */}
      <div className={cn("rounded-xl border bg-card", sessions.length > 0 && "hidden lg:block")}>
        <div className="flex items-center justify-between gap-2 p-4 border-b">
          <h3 className="font-semibold text-sm whitespace-nowrap">Pertemuan <span className="text-muted-foreground font-normal">({sessions.length})</span></h3>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={openGenerator} title="Buat jadwal otomatis"><Wand2 className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => setDraft({ session_date: today, title: "", topic: "" })}><Plus className="h-4 w-4 mr-1" />Tambah</Button>
          </div>
        </div>
        {sessions.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground space-y-3">
            <p>Belum ada pertemuan. Buat jadwal sekaligus dari tanggal angkatan.</p>
            <Button size="sm" variant="gold" onClick={openGenerator}><CalendarPlus className="h-4 w-4 mr-1.5" />Buat jadwal otomatis</Button>
          </div>
        ) : (
          <ul ref={listRef} className="max-h-[65vh] overflow-y-auto p-2 space-y-0.5">
            {sessions.map((s) => {
              const n = Object.keys(attendance[s.id] || {}).filter((id) => members.some((m) => m.id === id)).length;
              const active = s.id === selected;
              return (
                <li key={s.id} data-session={s.id}>
                  <button onClick={() => setSelected(s.id)}
                    className={cn("w-full text-left rounded-lg px-3 py-2.5 transition-colors flex items-center gap-3",
                      active ? "bg-primary text-primary-foreground" : "hover:bg-secondary")}>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium truncate">{s.title || "Pertemuan"}</span>
                      <span className={cn("block text-xs", active ? "text-primary-foreground/75" : "text-muted-foreground")}>
                        {dayShort(s.session_date)}{s.session_date === today && " · hari ini"}
                      </span>
                    </span>
                    <span className={cn("text-[11px] font-semibold tabular-nums rounded-full px-2 py-0.5",
                      n === members.length && n > 0 ? (active ? "bg-emerald-400/30" : "bg-emerald-50 text-emerald-700")
                        : active ? "bg-primary-foreground/15" : "bg-muted text-muted-foreground")}>
                      {n}/{members.length}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Absen pertemuan terpilih */}
      <div className={cn("rounded-xl border bg-card min-w-0", !sessions.length && "hidden lg:block")}>
        {sessions.length > 0 && (
          <div className="lg:hidden flex items-center gap-2 p-3 border-b bg-muted/30">
            <select aria-label="Pilih pertemuan" className="h-10 flex-1 min-w-0 rounded-md border bg-background px-2 text-sm" value={selected || ""} onChange={(e) => setSelected(e.target.value)}>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title || "Pertemuan"} · {dayShort(s.session_date)}{s.session_date === today ? " (hari ini)" : ""} · {Object.keys(attendance[s.id] || {}).length}/{members.length}
                </option>
              ))}
            </select>
            <Button size="icon" variant="outline" aria-label="Buat jadwal otomatis" onClick={openGenerator}><Wand2 className="h-4 w-4" /></Button>
            <Button size="icon" variant="outline" aria-label="Tambah pertemuan" onClick={() => setDraft({ session_date: today, title: "", topic: "" })}><Plus className="h-4 w-4" /></Button>
          </div>
        )}
        {!session ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Pilih atau buat pertemuan untuk mulai mengabsen.</div>
        ) : (
          <>
            <div className="p-4 sm:p-5 border-b flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold">{session.title || "Pertemuan"}</h3>
                <p className="text-sm text-muted-foreground">{dayLong(session.session_date)}{session.topic ? ` · ${session.topic}` : ""}</p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" aria-label="Ubah pertemuan"
                  onClick={() => setDraft({ id: session.id, session_date: session.session_date, title: session.title, topic: session.topic || "" })}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" aria-label="Hapus pertemuan" onClick={() => removeSession(session)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>

            {members.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">Belum ada peserta aktif di angkatan ini. Peserta muncul di sini setelah pendaftarannya aktif.</p>
            ) : (
              <>
                <div className="px-4 sm:px-5 py-3 border-b flex flex-wrap items-center gap-2">
                  {MARKS.map((m) => (
                    <span key={m.id} className={cn("text-xs font-semibold rounded-full border px-2.5 py-1", m.className)}>{m.label} {counts[m.id]}</span>
                  ))}
                  <span className="text-xs font-semibold rounded-full border px-2.5 py-1 text-muted-foreground">Belum {counts.none}</span>
                  <Button size="sm" variant="gold" className="ml-auto" disabled={!counts.none || bulk} onClick={markRestPresent}>
                    {bulk ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCheck className="h-4 w-4 mr-1.5" />}
                    {counts.none === members.length ? "Semua hadir" : "Sisanya hadir"}
                  </Button>
                </div>
                <ul className="divide-y">
                  {members.map((m, i) => {
                    const cur = marks[m.id];
                    return (
                      <li key={m.id} className="flex items-center gap-3 px-4 sm:px-5 py-2.5">
                        <span className="w-6 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                        <span className="flex-1 min-w-0 text-sm font-medium truncate">{m.name}</span>
                        <div className="flex gap-1" role="group" aria-label={`Kehadiran ${m.name}`}>
                          {MARKS.map((mk) => (
                            <button key={mk.id} onClick={() => setMark(m.id, cur === mk.id ? null : mk.id)} aria-pressed={cur === mk.id}
                              title={mk.label}
                              className={cn("h-9 min-w-9 px-2 sm:px-3 rounded-md border text-xs font-semibold transition-colors",
                                cur === mk.id ? mk.activeClass : "bg-background hover:bg-secondary text-muted-foreground")}>
                              <span className="sm:hidden">{mk.short}</span><span className="hidden sm:inline">{mk.label}</span>
                            </button>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </>
        )}
      </div>

      {/* Tambah / ubah pertemuan */}
      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{draft?.id ? "Ubah pertemuan" : "Pertemuan baru"}</DialogTitle></DialogHeader>
          {draft && (
            <div className="grid gap-3">
              <div><Label>Tanggal</Label><Input type="date" value={draft.session_date} onChange={(e) => setDraft({ ...draft, session_date: e.target.value })} /></div>
              <div><Label>Judul</Label><Input value={draft.title} placeholder={`Pertemuan ${sessions.length + 1}`} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
              <div><Label>Materi / topik (opsional)</Label><Input value={draft.topic} placeholder="Contoh: Pengenalan Microsoft Word" onChange={(e) => setDraft({ ...draft, topic: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>Batal</Button>
            <Button variant="gold" onClick={saveSession} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generator jadwal */}
      <Dialog open={!!gen} onOpenChange={(v) => !v && setGen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buat jadwal otomatis</DialogTitle>
            <DialogDescription>Pertemuan dibuat untuk setiap hari terpilih di rentang tanggal. Tanggal yang sudah ada dilewati.</DialogDescription>
          </DialogHeader>
          {gen && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Dari</Label><Input type="date" value={gen.from} onChange={(e) => setGen({ ...gen, from: e.target.value })} /></div>
                <div><Label>Sampai</Label><Input type="date" value={gen.to} onChange={(e) => setGen({ ...gen, to: e.target.value })} /></div>
              </div>
              <div>
                <Label>Hari kelas</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                    const on = gen.days.includes(d);
                    return (
                      <button key={d} type="button" aria-pressed={on}
                        onClick={() => setGen({ ...gen, days: on ? gen.days.filter((x) => x !== d) : [...gen.days, d] })}
                        className={cn("h-9 w-12 rounded-md border text-sm font-medium", on ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-secondary")}>
                        {WEEKDAYS[d].label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div><Label>Awalan judul</Label><Input value={gen.prefix} onChange={(e) => setGen({ ...gen, prefix: e.target.value })} /></div>
              <p className="text-sm rounded-md bg-muted/60 px-3 py-2">
                {genDates.length ? <><b>{genDates.length} pertemuan</b> akan dibuat, mulai {dayShort(genDates[0])} sampai {dayShort(genDates[genDates.length - 1])}.</> : "Tidak ada tanggal baru pada rentang dan hari ini."}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setGen(null)}>Batal</Button>
            <Button variant="gold" onClick={runGenerator} disabled={saving || !genDates.length}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Buat {genDates.length || ""} pertemuan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendancePanel;
