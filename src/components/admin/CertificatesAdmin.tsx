import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Copy, Eye, Loader2, QrCode, Save } from "lucide-react";
import { ImageField } from "./config/SchemaForm";

interface Course { id: string; title: string; slug: string }

interface Template {
  id?: string;
  course_id: string;
  heading: string;
  subheading: string;
  body_text: string;
  organization_name: string;
  organization_location: string;
  signer_name: string;
  signer_title: string;
  cert_prefix: string;
  date_format: string;
  accent_color: string;
  bg_color: string;
  text_color: string;
  footer_note: string | null;
  logo_url: string | null;
  signature_url: string | null;
  show_qr: boolean;
}

const defaults = (course_id: string): Template => ({
  course_id,
  heading: "SERTIFIKAT KELULUSAN",
  subheading: "Diberikan kepada",
  body_text: 'atas keberhasilan menyelesaikan pelatihan "{course}" yang diselenggarakan oleh LPK Borneo Citra Gemilang.',
  organization_name: "LPK BORNEO CITRA GEMILANG",
  organization_location: "Bontang, Kalimantan Timur",
  signer_name: "Direktur LPK BCG",
  signer_title: "Direktur",
  cert_prefix: "LPK-BCG",
  date_format: "long",
  accent_color: "#C79E2E",
  bg_color: "#FCFBF5",
  text_color: "#0B2447",
  footer_note: null,
  logo_url: null,
  signature_url: null,
  show_qr: true,
});

const db = supabase as any;

const payloadOf = (t: Template, courseId: string) => {
  const { id: _id, ...rest } = t;
  return { ...rest, course_id: courseId };
};

const CertificatesAdmin = () => {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<string>("");
  const [tpl, setTpl] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    supabase.from("courses").select("id, title, slug").order("sort_order").then(({ data }) => {
      const list = (data as Course[]) || [];
      setCourses(list);
      if (list.length) setCourseId((cur) => cur || list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    db.from("certificate_templates").select("*").eq("course_id", courseId).maybeSingle().then(({ data }: { data: Template | null }) => {
      setTpl(data ? { ...defaults(courseId), ...data } : defaults(courseId));
      setLoading(false);
    });
  }, [courseId]);

  const update = (patch: Partial<Template>) => setTpl((t) => (t ? { ...t, ...patch } : t));

  const save = async (silent = false) => {
    if (!tpl) return false;
    setSaving(true);
    const { data, error } = await db.from("certificate_templates")
      .upsert(payloadOf(tpl, courseId), { onConflict: "course_id" }).select().maybeSingle();
    setSaving(false);
    if (error) { toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" }); return false; }
    if (data) setTpl({ ...defaults(courseId), ...data });
    if (!silent) toast({ title: "Template tersimpan" });
    return true;
  };

  const copyToAll = async () => {
    if (!tpl) return;
    if (!confirm(`Pakai desain ini untuk semua ${courses.length} program? Template program lain akan ditimpa.`)) return;
    setCopying(true);
    const rows = courses.map((c) => payloadOf(tpl, c.id));
    const { error } = await db.from("certificate_templates").upsert(rows, { onConflict: "course_id" });
    setCopying(false);
    if (error) return toast({ title: "Gagal menyalin", description: error.message, variant: "destructive" });
    toast({ title: "Template dipakai di semua program" });
  };

  const preview = async () => {
    if (!tpl) return;
    setPreviewing(true);
    try {
      if (!(await save(true))) return;
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/issue-certificate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sess.session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ course_id: courseId, preview: true, preview_name: "Nama Peserta Contoh" }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `Gagal (${res.status})`);
      window.open(URL.createObjectURL(await res.blob()), "_blank");
    } catch (e) {
      toast({ title: "Gagal membuat pratinjau", description: (e as Error).message, variant: "destructive" });
    } finally {
      setPreviewing(false);
    }
  };

  const courseTitle = courses.find((c) => c.id === courseId)?.title || "Nama Program";

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 max-w-md">
          <Label>Program</Label>
          <select className="w-full h-10 px-3 border rounded-md bg-background text-sm" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <Button variant="outline" onClick={copyToAll} disabled={!tpl || copying || courses.length < 2}>
          {copying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Copy className="h-4 w-4 mr-2" />}Pakai untuk semua program
        </Button>
      </div>

      {loading || !tpl ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="grid xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
          <div className="space-y-6 min-w-0">
            <Card className="shadow-none">
              <CardHeader><CardTitle className="text-base">Isi sertifikat</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label>Nama lembaga</Label><Input value={tpl.organization_name} onChange={(e) => update({ organization_name: e.target.value })} /></div>
                  <div><Label>Kota, provinsi</Label><Input value={tpl.organization_location} onChange={(e) => update({ organization_location: e.target.value })} /></div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label>Judul</Label><Input value={tpl.heading} onChange={(e) => update({ heading: e.target.value })} /></div>
                  <div><Label>Kalimat pembuka</Label><Input value={tpl.subheading} onChange={(e) => update({ subheading: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Teks isi</Label>
                  <Textarea rows={3} value={tpl.body_text} onChange={(e) => update({ body_text: e.target.value })} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Kode otomatis: <code className="bg-muted px-1 rounded">{"{course}"}</code> nama program,{" "}
                    <code className="bg-muted px-1 rounded">{"{name}"}</code> nama peserta,{" "}
                    <code className="bg-muted px-1 rounded">{"{batch}"}</code> angkatan & tanggal (bila tidak dipakai, angkatan tampil di bawah teks).
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label>Nama penandatangan</Label><Input value={tpl.signer_name} onChange={(e) => update({ signer_name: e.target.value })} /></div>
                  <div><Label>Jabatan</Label><Input value={tpl.signer_title} onChange={(e) => update({ signer_title: e.target.value })} /></div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Awalan nomor sertifikat</Label>
                    <Input value={tpl.cert_prefix} onChange={(e) => update({ cert_prefix: e.target.value })} />
                    <p className="text-xs text-muted-foreground mt-1">Hasil: <code>{tpl.cert_prefix}/{new Date().getFullYear()}/A1B2C3D4</code></p>
                  </div>
                  <div>
                    <Label>Format tanggal</Label>
                    <select className="w-full h-10 px-3 border rounded-md bg-background text-sm" value={tpl.date_format} onChange={(e) => update({ date_format: e.target.value })}>
                      <option value="long">6 Juni 2026</option>
                      <option value="short">06/06/2026</option>
                      <option value="iso">2026-06-06</option>
                    </select>
                  </div>
                </div>
                <div><Label>Catatan kaki (opsional)</Label><Input value={tpl.footer_note || ""} placeholder="Contoh: Terdaftar di Dinas Tenaga Kerja Kota Bontang" onChange={(e) => update({ footer_note: e.target.value || null })} /></div>
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader><CardTitle className="text-base">Logo, tanda tangan & warna</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <Label>Logo lembaga</Label>
                    <ImageField value={tpl.logo_url || ""} onChange={(v) => update({ logo_url: v || null })} />
                  </div>
                  <div>
                    <Label>Tanda tangan (hasil scan)</Label>
                    <ImageField value={tpl.signature_url || ""} onChange={(v) => update({ signature_url: v || null })} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">Gunakan PNG atau JPG. Tanda tangan paling rapi berupa PNG dengan latar transparan.</p>
                <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <span>
                    <span className="flex items-center gap-2 text-sm font-medium"><QrCode className="h-4 w-4" />Tampilkan QR verifikasi</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">Siapa pun bisa memindai QR untuk memastikan sertifikat asli.</span>
                  </span>
                  <Switch checked={tpl.show_qr} onCheckedChange={(v) => update({ show_qr: v })} />
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {([["accent_color", "Aksen"], ["bg_color", "Latar"], ["text_color", "Teks"]] as const).map(([key, label]) => (
                    <div key={key}>
                      <Label>{label}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" value={tpl[key]} onChange={(e) => update({ [key]: e.target.value } as Partial<Template>)}
                          className="h-10 w-12 shrink-0 border rounded cursor-pointer bg-transparent" aria-label={`Warna ${label}`} />
                        <Input value={tpl[key]} onChange={(e) => update({ [key]: e.target.value } as Partial<Template>)} className="font-mono text-xs min-w-0" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pratinjau cepat */}
          <div className="space-y-3 xl:sticky xl:top-6">
            <div className="rounded-lg shadow-sm overflow-hidden border" style={{ background: tpl.bg_color, color: tpl.text_color }}>
              <div className="aspect-[842/595] relative p-[3.2%]">
                <div className="absolute inset-[2.2%] border-2" style={{ borderColor: tpl.accent_color }} />
                <div className="absolute inset-[3.4%] border" style={{ borderColor: tpl.text_color, opacity: 0.6 }} />
                <div className="relative h-full flex flex-col items-center text-center pt-[3%]">
                  {tpl.logo_url && <img src={tpl.logo_url} alt="" className="h-[11%] w-auto object-contain mb-[1.5%]" />}
                  <p className="text-[8px] font-bold tracking-wide" style={{ color: tpl.accent_color }}>{tpl.organization_name}</p>
                  <p className="text-[6px] italic opacity-60">{tpl.organization_location}</p>
                  <p className="text-[17px] font-bold mt-[3%] leading-none" style={{ fontFamily: "Times New Roman, serif" }}>{tpl.heading}</p>
                  <div className="h-[2px] w-16 mt-1" style={{ background: tpl.accent_color }} />
                  <p className="text-[7px] italic opacity-60 mt-[3%]">{tpl.subheading}</p>
                  <p className="text-[15px] font-bold italic mt-[1%]" style={{ fontFamily: "Times New Roman, serif" }}>Nama Peserta Contoh</p>
                  <p className="text-[6.5px] opacity-70 px-[12%] mt-[2%] leading-snug">
                    {tpl.body_text.replace(/\{course\}/g, courseTitle).replace(/\{name\}/g, "Nama Peserta").replace(/\{batch\}/g, "Angkatan 1")}
                  </p>
                  <div className="absolute bottom-[4%] left-[4%] right-[4%] flex items-end justify-between">
                    <div className="flex items-end gap-1.5">
                      {tpl.show_qr && <div className="h-9 w-9 bg-white grid place-items-center border"><QrCode className="h-7 w-7" /></div>}
                      <div className="text-left text-[5.5px] leading-tight opacity-80">
                        <div>No. Sertifikat</div>
                        <div className="font-bold text-[6.5px]">{tpl.cert_prefix}/{new Date().getFullYear()}/A1B2C3D4</div>
                      </div>
                    </div>
                    <div className="text-center w-[30%]">
                      {tpl.signature_url ? <img src={tpl.signature_url} alt="" className="h-6 mx-auto object-contain" /> : <div className="h-6" />}
                      <div className="border-t" style={{ borderColor: tpl.text_color }} />
                      <div className="text-[6.5px] font-bold mt-0.5">{tpl.signer_name}</div>
                      <div className="text-[5.5px] opacity-70">{tpl.signer_title}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Gambaran kasar. Klik <b>Pratinjau PDF</b> untuk melihat hasil akhirnya.</p>
            <div className="flex gap-2">
              <Button variant="gold" onClick={() => save()} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Simpan
              </Button>
              <Button variant="outline" onClick={preview} disabled={previewing} className="flex-1">
                {previewing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}Pratinjau PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificatesAdmin;
