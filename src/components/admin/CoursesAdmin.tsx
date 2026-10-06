import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, ArrowLeft, Loader2, FileText, PlayCircle, FileQuestion, GripVertical, ArrowUp, ArrowDown, Upload, FolderOpen, Lock, Eye } from "lucide-react";
import { MediaPicker } from "./MediaPicker";
import { importStructureCSV, importQuizzesCSV, type ImportResult } from "@/lib/csvImport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageField } from "./config/SchemaForm";
import BatchesManager from "./BatchesManager";
import ProgramVisual from "@/components/site/ProgramVisual";
import { fetchBatches } from "@/lib/batches";
import { cn } from "@/lib/utils";

const lines = (v?: string[] | null) => (v || []).join("\n");
const toLines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

type Course = {
  id: string; slug: string; title: string; description: string | null; cover_image: string | null;
  type: string; category: string | null; level: string | null; duration: string | null; capacity: string | null;
  instructor_name: string | null; price: number; is_free: boolean; currency: string;
  is_published: boolean; sort_order: number;
  highlights?: string[]; requirements?: string[]; faq?: { q: string; a: string }[];
};
type Module = { id: string; course_id: string; title: string; description: string | null; sort_order: number; prerequisite_module_id: string | null };
type Lesson = {
  id: string; module_id: string; title: string; content_type: string | null;
  video_url: string | null; content_md: string | null; file_url: string | null; embed_html: string | null;
  duration_min: number | null; is_preview: boolean; sort_order: number;
};
type QuizQ = { question: string; options: string[]; correct: number };
type Quiz = {
  id: string; module_id: string; title: string; description: string | null;
  passing_score: number; questions: QuizQ[];
};

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const CoursesAdmin = () => {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Course | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const [stats, setStats] = useState<Record<string, { open: number; batches: number; registrants: number }>>({});

  const loadCourses = async () => {
    setLoading(true);
    const [{ data }, bs, { data: en }] = await Promise.all([
      supabase.from("courses").select("*").order("sort_order").order("title"),
      fetchBatches(undefined, true),
      supabase.from("enrollments").select("course_id,status"),
    ]);
    setCourses((data as Course[]) || []);
    const st: Record<string, { open: number; batches: number; registrants: number }> = {};
    const get = (id: string) => (st[id] ||= { open: 0, batches: 0, registrants: 0 });
    bs.forEach((b) => { const x = get(b.course_id); x.batches++; if (b.status === "open") x.open++; });
    ((en as { course_id: string; status: string }[]) || []).forEach((e) => { if (e.status !== "cancelled") get(e.course_id).registrants++; });
    setStats(st);
    setLoading(false);
  };
  useEffect(() => { loadCourses(); }, []);

  if (editing) return <CourseEditor course={editing} onBack={() => { setEditing(null); loadCourses(); }} />;

  const newCourse = () => setEditing({
    id: "", slug: "", title: "Program Baru", description: "", cover_image: "",
    type: "offline", category: "", level: "Pemula", duration: "", capacity: "",
    instructor_name: "", price: 0, is_free: false, currency: "IDR",
    is_published: false, sort_order: 0, highlights: [], requirements: [], faq: [],
  });

  const deleteCourse = async (c: Course) => {
    if (!confirm(`Hapus program "${c.title}" beserta angkatan, modul, pelajaran, dan kuis? Data pendaftar tetap tersimpan tetapi kehilangan programnya.`)) return;
    const { error } = await supabase.from("courses").delete().eq("id", c.id);
    if (error) return toast({ title: "Gagal hapus", description: error.message, variant: "destructive" });
    toast({ title: "Program dihapus" });
    loadCourses();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">{courses.length} program · {courses.filter((c) => c.is_published).length} terbit</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-1" />Import CSV</Button>
          <Button variant="gold" onClick={newCourse}><Plus className="h-4 w-4 mr-1" />Tambah Program</Button>
        </div>
      </div>
      <CSVImportDialog open={importOpen} onClose={() => setImportOpen(false)} onDone={loadCourses} />
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : courses.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">Belum ada program. Klik "Tambah Program".</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {courses.map((c) => {
            const st = stats[c.id] || { open: 0, batches: 0, registrants: 0 };
            const noPrice = !c.is_free && !(c.price > 0);
            return (
              <Card key={c.id} className="overflow-hidden shadow-none hover:shadow-md transition-shadow flex flex-col">
                <button type="button" onClick={() => setEditing(c)} className="relative aspect-[16/7] text-left" aria-label={`Edit ${c.title}`}>
                  <ProgramVisual title={c.title} category={c.category} image={c.cover_image} />
                  <span className="absolute top-2 left-2 flex gap-1">
                    {c.is_published
                      ? <Badge className="text-[11px] bg-emerald-600 hover:bg-emerald-600">Terbit</Badge>
                      : <Badge variant="secondary" className="text-[11px]">Draf</Badge>}
                    <Badge variant="secondary" className="text-[11px] bg-white/90 text-primary">{c.type === "online" ? "Online" : "Tatap muka"}</Badge>
                  </span>
                </button>
                <CardContent className="p-4 flex-1 flex flex-col gap-3">
                  <div className="min-w-0">
                    <h4 className="font-semibold leading-snug line-clamp-2">{c.title}</h4>
                    <p className={cn("text-sm mt-1 font-medium", noPrice ? "text-destructive" : "text-foreground")}>
                      {c.is_free ? "Gratis" : c.price > 0 ? `Rp ${c.price.toLocaleString("id-ID")}` : "Biaya belum diisi"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md bg-muted/60 px-2.5 py-1.5">
                      <div className="text-muted-foreground">Angkatan</div>
                      <div className="font-semibold">{c.type === "online" ? "—" : st.open ? `${st.open} dibuka` : st.batches ? `${st.batches} (tutup)` : "Belum ada"}</div>
                    </div>
                    <div className="rounded-md bg-muted/60 px-2.5 py-1.5">
                      <div className="text-muted-foreground">Pendaftar</div>
                      <div className="font-semibold">{st.registrants}</div>
                    </div>
                  </div>
                  <div className="mt-auto flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(c)}><Pencil className="h-4 w-4 mr-1.5" />Kelola</Button>
                    <Button size="sm" variant="ghost" asChild><a href={`/kursus/${c.slug}`} target="_blank" rel="noreferrer" aria-label="Lihat di situs"><Eye className="h-4 w-4" /></a></Button>
                    <Button size="sm" variant="ghost" aria-label="Hapus program" onClick={() => deleteCourse(c)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============ COURSE EDITOR ============
const CourseEditor = ({ course, onBack }: { course: Course; onBack: () => void }) => {
  const { toast } = useToast();
  const [c, setC] = useState<Course>(course);
  const [saving, setSaving] = useState(false);
  const [modules, setModules] = useState<Module[]>([]);
  const [loadingMods, setLoadingMods] = useState(false);
  const isNew = !c.id;

  const loadModules = async (courseId: string) => {
    setLoadingMods(true);
    const { data } = await supabase.from("modules").select("*").eq("course_id", courseId).order("sort_order");
    setModules((data as Module[]) || []);
    setLoadingMods(false);
  };

  useEffect(() => { if (c.id) loadModules(c.id); }, [c.id]);

  const saveCourse = async () => {
    setSaving(true);
    const payload: any = {
      slug: slugify(c.slug || c.title),
      title: c.title, description: c.description, cover_image: c.cover_image || null,
      type: c.type, category: c.category || null, level: c.level || null,
      duration: c.duration || null, capacity: c.capacity || null,
      instructor_name: c.instructor_name || null,
      price: c.is_free ? 0 : (c.price || 0), is_free: c.is_free, currency: c.currency || "IDR",
      is_published: c.is_published, sort_order: c.sort_order || 0,
      highlights: (c.highlights || []).filter(Boolean),
      requirements: (c.requirements || []).filter(Boolean),
      faq: (c.faq || []).filter((f) => f.q?.trim() && f.a?.trim()),
    };
    if (isNew) {
      const { data, error } = await supabase.from("courses").insert(payload).select().single();
      setSaving(false);
      if (error) return toast({ title: "Gagal", description: error.message, variant: "destructive" });
      toast({ title: "Program dibuat", description: "Sekarang Anda bisa menambah angkatan dan materi." });
      setC(data as Course);
    } else {
      const { error } = await supabase.from("courses").update(payload).eq("id", c.id);
      setSaving(false);
      if (error) return toast({ title: "Gagal", description: error.message, variant: "destructive" });
      toast({ title: "Tersimpan" });
    }
  };

  const addModule = async () => {
    if (isNew) return toast({ title: "Simpan kursus dulu", variant: "destructive" });
    const { error } = await supabase.from("modules").insert({
      course_id: c.id, title: "Modul Baru", sort_order: modules.length,
    });
    if (error) return toast({ title: "Gagal", description: error.message, variant: "destructive" });
    loadModules(c.id);
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" />Kembali ke daftar program</Button>

      <Card>
        <CardHeader><CardTitle>{isNew ? "Program Baru" : "Edit Program"}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>Judul</Label><Input value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} /></div>
            <div><Label>Slug (URL)</Label><Input value={c.slug} placeholder="otomatis dari judul" onChange={(e) => setC({ ...c, slug: e.target.value })} /></div>
          </div>
          <div><Label>Deskripsi</Label><Textarea rows={3} value={c.description || ""} onChange={(e) => setC({ ...c, description: e.target.value })} /></div>
          <div className="grid md:grid-cols-3 gap-3">
            <div><Label>Tipe</Label>
              <select className="w-full p-2 border rounded-md bg-background" value={c.type} onChange={(e) => setC({ ...c, type: e.target.value })}>
                <option value="offline">Tatap muka (pakai angkatan)</option>
                <option value="online">Online (materi LMS)</option>
              </select>
            </div>
            <div><Label>Kategori</Label><Input value={c.category || ""} onChange={(e) => setC({ ...c, category: e.target.value })} /></div>
            <div><Label>Level</Label><Input value={c.level || ""} onChange={(e) => setC({ ...c, level: e.target.value })} /></div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div><Label>Durasi</Label><Input placeholder="20 Jam" value={c.duration || ""} onChange={(e) => setC({ ...c, duration: e.target.value })} /></div>
            <div><Label>Kapasitas</Label><Input placeholder="30 Peserta" value={c.capacity || ""} onChange={(e) => setC({ ...c, capacity: e.target.value })} /></div>
            <div><Label>Instruktur</Label><Input value={c.instructor_name || ""} onChange={(e) => setC({ ...c, instructor_name: e.target.value })} /></div>
          </div>
          <div className="grid md:grid-cols-3 gap-3 items-end">
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="free" checked={c.is_free} onChange={(e) => setC({ ...c, is_free: e.target.checked })} />
              <Label htmlFor="free">Gratis / subsidi</Label>
            </div>
            <div>
              <Label>Harga (Rp)</Label>
              <Input type="number" disabled={c.is_free} value={c.price} onChange={(e) => setC({ ...c, price: parseInt(e.target.value) || 0 })} />
            </div>
            <div><Label>Urutan</Label><Input type="number" value={c.sort_order} onChange={(e) => setC({ ...c, sort_order: parseInt(e.target.value) || 0 })} /></div>
          </div>
          <div><Label>Foto cover (rasio 16:10)</Label><ImageField value={c.cover_image || ""} onChange={(v) => setC({ ...c, cover_image: v })} /></div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Yang akan dipelajari (satu per baris)</Label>
              <Textarea rows={5} value={lines(c.highlights)} onChange={(e) => setC({ ...c, highlights: e.target.value.split("\n") })} onBlur={(e) => setC({ ...c, highlights: toLines(e.target.value) })} placeholder={"Teknik dasar ...\nPraktik ..."} />
            </div>
            <div>
              <Label>Syarat peserta (satu per baris)</Label>
              <Textarea rows={5} value={lines(c.requirements)} onChange={(e) => setC({ ...c, requirements: e.target.value.split("\n") })} onBlur={(e) => setC({ ...c, requirements: toLines(e.target.value) })} placeholder={"Usia minimal 17 tahun\nFotokopi KTP"} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>FAQ khusus program ini (opsional — bila kosong, FAQ umum situs yang tampil)</Label>
            {(c.faq || []).map((f, i) => (
              <div key={i} className="grid gap-2 rounded-lg border p-3">
                <div className="flex gap-2">
                  <Input placeholder="Pertanyaan" value={f.q} onChange={(e) => setC({ ...c, faq: (c.faq || []).map((x, k) => k === i ? { ...x, q: e.target.value } : x) })} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setC({ ...c, faq: (c.faq || []).filter((_, k) => k !== i) })}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <Textarea rows={2} placeholder="Jawaban" value={f.a} onChange={(e) => setC({ ...c, faq: (c.faq || []).map((x, k) => k === i ? { ...x, a: e.target.value } : x) })} />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setC({ ...c, faq: [...(c.faq || []), { q: "", a: "" }] })}><Plus className="h-4 w-4 mr-1" />Tambah pertanyaan</Button>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="pub" checked={c.is_published} onChange={(e) => setC({ ...c, is_published: e.target.checked })} />
            <Label htmlFor="pub">Terbitkan (tampil di katalog)</Label>
          </div>
          <Button variant="gold" onClick={saveCourse} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Simpan Program
          </Button>
        </CardContent>
      </Card>

      {!isNew && (
        <Card>
          <CardHeader><CardTitle>Angkatan & jadwal</CardTitle></CardHeader>
          <CardContent><BatchesManager courseId={c.id} coursePrice={c.is_free ? 0 : c.price} /></CardContent>
        </Card>
      )}

      {!isNew && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Materi online (modul, pelajaran & kuis)</CardTitle>
            <Button variant="gold" size="sm" onClick={addModule}><Plus className="h-4 w-4 mr-1" />Tambah Modul</Button>
          </CardHeader>
          <CardContent>
            {loadingMods ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : modules.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-6">Belum ada modul.</p>
            ) : (
              <Accordion type="multiple" className="space-y-2">
                {modules.map((m, idx) => (
                  <ModuleSection
                    key={m.id}
                    module={m}
                    allModules={modules}
                    isFirst={idx === 0}
                    isLast={idx === modules.length - 1}
                    onReorder={async (dir) => {
                      const swapWith = modules[idx + (dir === "up" ? -1 : 1)];
                      if (!swapWith) return;
                      await Promise.all([
                        supabase.from("modules").update({ sort_order: swapWith.sort_order }).eq("id", m.id),
                        supabase.from("modules").update({ sort_order: m.sort_order }).eq("id", swapWith.id),
                      ]);
                      loadModules(c.id);
                    }}
                    onChange={() => loadModules(c.id)}
                  />
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ============ MODULE SECTION ============
const ModuleSection = ({ module, allModules, isFirst, isLast, onReorder, onChange }: {
  module: Module;
  allModules: Module[];
  isFirst: boolean;
  isLast: boolean;
  onReorder: (dir: "up" | "down") => void;
  onChange: () => void;
}) => {
  const { toast } = useToast();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [editModule, setEditModule] = useState(false);
  const [m, setM] = useState(module);
  const [editLesson, setEditLesson] = useState<Lesson | null>(null);
  const [editQuiz, setEditQuiz] = useState<Quiz | null>(null);

  const load = async () => {
    const [{ data: ls }, { data: qs }] = await Promise.all([
      supabase.from("lessons").select("*").eq("module_id", module.id).order("sort_order"),
      supabase.from("quizzes").select("*").eq("module_id", module.id),
    ]);
    setLessons((ls as Lesson[]) || []);
    setQuizzes(((qs as any[]) || []).map((x) => ({ ...x, questions: Array.isArray(x.questions) ? x.questions : [] })) as Quiz[]);
  };
  useEffect(() => { load(); }, [module.id]);

  const saveModule = async () => {
    const { error } = await supabase.from("modules").update({
      title: m.title, description: m.description, sort_order: m.sort_order,
      prerequisite_module_id: m.prerequisite_module_id || null,
    }).eq("id", m.id);
    if (error) return toast({ title: "Gagal", description: error.message, variant: "destructive" });
    setEditModule(false);
    onChange();
  };

  const prereqModule = allModules.find((x) => x.id === module.prerequisite_module_id);

  const deleteModule = async () => {
    if (!confirm("Hapus modul ini beserta pelajaran & kuis?")) return;
    await supabase.from("modules").delete().eq("id", module.id);
    onChange();
  };

  const addLesson = () => setEditLesson({
    id: "", module_id: module.id, title: "Pelajaran Baru",
    content_type: "video", video_url: "", content_md: "", file_url: "", embed_html: "",
    duration_min: null, is_preview: false, sort_order: lessons.length,
  });

  const addQuiz = () => setEditQuiz({
    id: "", module_id: module.id, title: "Kuis Baru", description: "",
    passing_score: 70, questions: [{ question: "", options: ["", ""], correct: 0 }],
  });

  return (
    <AccordionItem value={module.id} className="border rounded-md px-3">
      <div className="flex items-center gap-2">
        <AccordionTrigger className="flex-1 hover:no-underline">
          <div className="flex items-center gap-2 text-left flex-wrap">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{module.title}</span>
            <Badge variant="outline" className="text-xs">{lessons.length} pelajaran</Badge>
            <Badge variant="outline" className="text-xs">{quizzes.length} kuis</Badge>
            {prereqModule && (
              <Badge variant="secondary" className="text-xs gap-1"><Lock className="h-3 w-3" />Setelah: {prereqModule.title}</Badge>
            )}
          </div>
        </AccordionTrigger>
        <Button size="icon" variant="ghost" disabled={isFirst} onClick={() => onReorder("up")}><ArrowUp className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" disabled={isLast} onClick={() => onReorder("down")}><ArrowDown className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" onClick={() => setEditModule(true)}><Pencil className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" onClick={deleteModule}><Trash2 className="h-4 w-4" /></Button>
      </div>
      <AccordionContent className="space-y-3 pt-2">
        {module.description && <p className="text-sm text-muted-foreground">{module.description}</p>}

        <div className="space-y-1">
          {lessons.map((l) => (
            <div key={l.id} className="flex items-center gap-2 p-2 rounded border bg-muted/30">
              {l.content_type === "text" ? <FileText className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
              <span className="flex-1 text-sm">{l.title}</span>
              {l.duration_min ? <span className="text-xs text-muted-foreground">{l.duration_min}m</span> : null}
              <Button size="icon" variant="ghost" onClick={() => setEditLesson(l)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={async () => {
                if (!confirm("Hapus pelajaran?")) return;
                await supabase.from("lessons").delete().eq("id", l.id); load();
              }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {quizzes.map((q) => (
            <div key={q.id} className="flex items-center gap-2 p-2 rounded border bg-gold/5">
              <FileQuestion className="h-4 w-4 text-gold" />
              <span className="flex-1 text-sm">Kuis: {q.title}</span>
              <span className="text-xs text-muted-foreground">{(q.questions || []).length} soal</span>
              <Button size="icon" variant="ghost" onClick={() => setEditQuiz({ ...q, questions: Array.isArray(q.questions) ? q.questions : [] })}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={async () => {
                if (!confirm("Hapus kuis?")) return;
                await supabase.from("quizzes").delete().eq("id", q.id); load();
              }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addLesson}><Plus className="h-4 w-4 mr-1" />Pelajaran</Button>
          <Button size="sm" variant="outline" onClick={addQuiz}><Plus className="h-4 w-4 mr-1" />Kuis</Button>
        </div>

        <Dialog open={editModule} onOpenChange={setEditModule}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Modul</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Judul</Label><Input value={m.title} onChange={(e) => setM({ ...m, title: e.target.value })} /></div>
              <div><Label>Deskripsi</Label><Textarea value={m.description || ""} onChange={(e) => setM({ ...m, description: e.target.value })} /></div>
              <div><Label>Urutan</Label><Input type="number" value={m.sort_order} onChange={(e) => setM({ ...m, sort_order: parseInt(e.target.value) || 0 })} /></div>
              <div>
                <Label>Prasyarat (harus lulus dulu)</Label>
                <select
                  className="w-full p-2 border rounded-md bg-background"
                  value={m.prerequisite_module_id || ""}
                  onChange={(e) => setM({ ...m, prerequisite_module_id: e.target.value || null })}
                >
                  <option value="">— Tidak ada —</option>
                  {allModules.filter((x) => x.id !== m.id).map((x) => (
                    <option key={x.id} value={x.id}>{x.title}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">Peserta harus menyelesaikan modul prasyarat sebelum mengakses modul ini.</p>
              </div>
            </div>
            <DialogFooter><Button variant="gold" onClick={saveModule}>Simpan</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {editLesson && <LessonDialog lesson={editLesson} onClose={() => setEditLesson(null)} onSaved={() => { setEditLesson(null); load(); }} />}
        {editQuiz && <QuizDialog quiz={editQuiz} onClose={() => setEditQuiz(null)} onSaved={() => { setEditQuiz(null); load(); }} />}
      </AccordionContent>
    </AccordionItem>
  );
};

// ============ LESSON DIALOG ============
const LessonDialog = ({ lesson, onClose, onSaved }: { lesson: Lesson; onClose: () => void; onSaved: () => void }) => {
  const { toast } = useToast();
  const [l, setL] = useState(lesson);
  const [saving, setSaving] = useState(false);
  const [pickerFor, setPickerFor] = useState<null | "video" | "file">(null);

  const save = async () => {
    setSaving(true);
    const payload: any = {
      module_id: l.module_id, title: l.title, content_type: l.content_type,
      video_url: l.video_url || null, content_md: l.content_md || null,
      file_url: l.file_url || null, embed_html: l.embed_html || null,
      duration_min: l.duration_min, is_preview: l.is_preview, sort_order: l.sort_order,
    };
    const { error } = l.id
      ? await supabase.from("lessons").update(payload).eq("id", l.id)
      : await supabase.from("lessons").insert(payload);
    setSaving(false);
    if (error) return toast({ title: "Gagal", description: error.message, variant: "destructive" });
    onSaved();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{l.id ? "Edit Pelajaran" : "Tambah Pelajaran"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Judul</Label><Input value={l.title} onChange={(e) => setL({ ...l, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tipe Konten</Label>
              <select className="w-full p-2 border rounded-md bg-background" value={l.content_type || "video"} onChange={(e) => setL({ ...l, content_type: e.target.value })}>
                <option value="video">Video</option>
                <option value="text">Teks/Artikel</option>
                <option value="file">File/Dokumen</option>
                <option value="embed">Embed HTML</option>
              </select>
            </div>
            <div><Label>Durasi (menit)</Label><Input type="number" value={l.duration_min ?? ""} onChange={(e) => setL({ ...l, duration_min: e.target.value ? parseInt(e.target.value) : null })} /></div>
          </div>
          {(l.content_type === "video" || !l.content_type) && (
            <div>
              <Label>URL Video (YouTube / Vimeo / MP4)</Label>
              <div className="flex gap-2">
                <Input value={l.video_url || ""} onChange={(e) => setL({ ...l, video_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
                <Button type="button" variant="outline" onClick={() => setPickerFor("video")}><FolderOpen className="h-4 w-4 mr-1" />Media</Button>
              </div>
            </div>
          )}
          {l.content_type === "text" && (
            <div><Label>Isi Materi</Label><Textarea rows={8} value={l.content_md || ""} onChange={(e) => setL({ ...l, content_md: e.target.value })} placeholder="Tulis materi di sini..." /></div>
          )}
          {l.content_type === "file" && (
            <div>
              <Label>URL File (PDF/dll)</Label>
              <div className="flex gap-2">
                <Input value={l.file_url || ""} onChange={(e) => setL({ ...l, file_url: e.target.value })} placeholder="https://..." />
                <Button type="button" variant="outline" onClick={() => setPickerFor("file")}><FolderOpen className="h-4 w-4 mr-1" />Media</Button>
              </div>
            </div>
          )}
          {l.content_type === "embed" && (
            <div><Label>HTML Embed</Label><Textarea rows={5} value={l.embed_html || ""} onChange={(e) => setL({ ...l, embed_html: e.target.value })} placeholder="<iframe ...></iframe>" /></div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Urutan</Label><Input type="number" value={l.sort_order} onChange={(e) => setL({ ...l, sort_order: parseInt(e.target.value) || 0 })} /></div>
            <div className="flex items-end gap-2 pb-2">
              <input type="checkbox" id="prev" checked={l.is_preview} onChange={(e) => setL({ ...l, is_preview: e.target.checked })} />
              <Label htmlFor="prev">Pratinjau gratis</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button variant="gold" onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Simpan</Button>
        </DialogFooter>
      </DialogContent>
      <MediaPicker
        open={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        onPick={(url) => {
          if (pickerFor === "video") setL({ ...l, video_url: url });
          else if (pickerFor === "file") setL({ ...l, file_url: url });
        }}
      />
    </Dialog>
  );
};

// ============ QUIZ DIALOG ============
const QuizDialog = ({ quiz, onClose, onSaved }: { quiz: Quiz; onClose: () => void; onSaved: () => void }) => {
  const { toast } = useToast();
  const [q, setQ] = useState<Quiz>({ ...quiz, questions: Array.isArray(quiz.questions) ? quiz.questions : [] });
  const [saving, setSaving] = useState(false);

  const updateQ = (i: number, patch: Partial<QuizQ>) => {
    setQ({ ...q, questions: q.questions.map((x, idx) => idx === i ? { ...x, ...patch } : x) });
  };
  const addQuestion = () => setQ({ ...q, questions: [...q.questions, { question: "", options: ["", ""], correct: 0 }] });
  const removeQuestion = (i: number) => setQ({ ...q, questions: q.questions.filter((_, idx) => idx !== i) });
  const addOption = (i: number) => updateQ(i, { options: [...q.questions[i].options, ""] });
  const removeOption = (i: number, oi: number) => updateQ(i, {
    options: q.questions[i].options.filter((_, x) => x !== oi),
    correct: q.questions[i].correct >= oi && q.questions[i].correct > 0 ? q.questions[i].correct - 1 : q.questions[i].correct,
  });
  const updateOption = (i: number, oi: number, v: string) => updateQ(i, {
    options: q.questions[i].options.map((o, x) => x === oi ? v : o),
  });

  const save = async () => {
    // validate
    for (const [i, qq] of q.questions.entries()) {
      if (!qq.question.trim()) return toast({ title: `Soal ${i+1} kosong`, variant: "destructive" });
      if (qq.options.length < 2) return toast({ title: `Soal ${i+1} butuh minimal 2 pilihan`, variant: "destructive" });
      if (qq.options.some(o => !o.trim())) return toast({ title: `Soal ${i+1} ada pilihan kosong`, variant: "destructive" });
    }
    setSaving(true);
    const payload: any = {
      module_id: q.module_id, title: q.title, description: q.description || null,
      passing_score: q.passing_score, questions: q.questions,
    };
    const { error } = q.id
      ? await supabase.from("quizzes").update(payload).eq("id", q.id)
      : await supabase.from("quizzes").insert(payload);
    setSaving(false);
    if (error) return toast({ title: "Gagal", description: error.message, variant: "destructive" });
    onSaved();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{q.id ? "Edit Kuis" : "Tambah Kuis"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div><Label>Judul Kuis</Label><Input value={q.title} onChange={(e) => setQ({ ...q, title: e.target.value })} /></div>
            <div><Label>Nilai Lulus</Label><Input className="w-24" type="number" value={q.passing_score} onChange={(e) => setQ({ ...q, passing_score: parseInt(e.target.value) || 70 })} /></div>
          </div>
          <div><Label>Deskripsi</Label><Textarea rows={2} value={q.description || ""} onChange={(e) => setQ({ ...q, description: e.target.value })} /></div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold">Soal ({q.questions.length})</h4>
              <Button size="sm" variant="outline" onClick={addQuestion}><Plus className="h-4 w-4 mr-1" />Tambah Soal</Button>
            </div>
            {q.questions.map((qq, i) => (
              <Card key={i}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex gap-2">
                    <span className="font-semibold text-sm pt-2">{i + 1}.</span>
                    <Textarea rows={2} placeholder="Tulis soal..." value={qq.question} onChange={(e) => updateQ(i, { question: e.target.value })} />
                    <Button size="icon" variant="ghost" onClick={() => removeQuestion(i)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="space-y-1 pl-6">
                    {qq.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input type="radio" name={`correct-${i}`} checked={qq.correct === oi} onChange={() => updateQ(i, { correct: oi })} />
                        <Input value={opt} placeholder={`Pilihan ${oi + 1}`} onChange={(e) => updateOption(i, oi, e.target.value)} />
                        {qq.options.length > 2 && (
                          <Button size="icon" variant="ghost" onClick={() => removeOption(i, oi)}><Trash2 className="h-3 w-3" /></Button>
                        )}
                      </div>
                    ))}
                    <Button size="sm" variant="ghost" onClick={() => addOption(i)}><Plus className="h-3 w-3 mr-1" />Pilihan</Button>
                    <p className="text-xs text-muted-foreground">✓ Centang radio untuk jawaban benar</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button variant="gold" onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Simpan Kuis</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============ CSV IMPORT DIALOG ============
const STRUCT_TEMPLATE = `course_slug,course_title,module_title,module_sort,lesson_title,lesson_type,lesson_content,lesson_sort,lesson_duration
barista-101,Barista Dasar,Pengenalan Kopi,0,Sejarah Kopi,video,https://youtu.be/xxxx,0,8
barista-101,Barista Dasar,Pengenalan Kopi,0,Catatan Sejarah,text,"Kopi berasal dari ...",1,
barista-101,Barista Dasar,Teknik Espresso,1,Latihan Tamping,video,https://youtu.be/yyyy,0,12`;

const QUIZ_TEMPLATE = `course_slug,module_title,quiz_title,passing_score,question,option1,option2,option3,option4,correct_index
barista-101,Pengenalan Kopi,Kuis Sejarah,70,Asal kopi dari?,Etiopia,Brasil,Vietnam,Indonesia,0
barista-101,Pengenalan Kopi,Kuis Sejarah,70,Tahun penemuan?,1500,1600,1700,1800,1`;

const CSVImportDialog = ({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) => {
  const { toast } = useToast();
  const [tab, setTab] = useState("struct");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => setText(String(r.result || "")); r.readAsText(f);
  };

  const run = async () => {
    if (!text.trim()) return toast({ title: "CSV kosong", variant: "destructive" });
    setBusy(true);
    const res = tab === "quiz" ? await importQuizzesCSV(text) : await importStructureCSV(text);
    setBusy(false);
    setResult(res);
    toast({ title: "Import selesai", description: `${res.courses} kursus, ${res.modules} modul, ${res.lessons} pelajaran, ${res.quizzes} kuis` });
    onDone();
  };

  const useTemplate = () => setText(tab === "quiz" ? QUIZ_TEMPLATE : STRUCT_TEMPLATE);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Import CSV</DialogTitle></DialogHeader>
        <Tabs value={tab} onValueChange={(v) => { setTab(v); setResult(null); }}>
          <TabsList>
            <TabsTrigger value="struct">Kursus / Modul / Pelajaran</TabsTrigger>
            <TabsTrigger value="quiz">Kuis</TabsTrigger>
          </TabsList>
          <TabsContent value="struct" className="space-y-2">
            <p className="text-sm text-muted-foreground">Kolom: <code className="text-xs">course_slug, course_title, module_title, module_sort, lesson_title, lesson_type (video|text|file|embed), lesson_content, lesson_sort, lesson_duration</code></p>
          </TabsContent>
          <TabsContent value="quiz" className="space-y-2">
            <p className="text-sm text-muted-foreground">Kolom: <code className="text-xs">course_slug, module_title, quiz_title, passing_score, question, option1..option6, correct_index</code> (0-based). Baris dengan kuis sama akan digabung.</p>
          </TabsContent>
        </Tabs>
        <div className="flex gap-2 items-center">
          <Button asChild variant="outline" size="sm">
            <label className="cursor-pointer"><Upload className="h-4 w-4 mr-1" />Upload .csv<input type="file" accept=".csv" hidden onChange={onFile} /></label>
          </Button>
          <Button variant="outline" size="sm" onClick={useTemplate}>Pakai template</Button>
        </div>
        <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Tempel isi CSV di sini..." className="font-mono text-xs" />
        {result && (
          <div className="text-sm border rounded p-3 bg-muted/30 space-y-1">
            <p>✅ {result.courses} kursus, {result.modules} modul, {result.lessons} pelajaran, {result.quizzes} kuis ({result.questions} soal).</p>
            {result.errors.length > 0 && (
              <details className="text-xs text-destructive"><summary>{result.errors.length} error</summary>
                <ul className="list-disc pl-4">{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
              </details>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
          <Button variant="gold" onClick={run} disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Jalankan Import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CoursesAdmin;

