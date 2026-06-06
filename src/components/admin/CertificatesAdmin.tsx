import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, Save } from "lucide-react";

interface Course { id: string; title: string; slug: string; }

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
}

const defaults = (course_id: string): Template => ({
  course_id,
  heading: "SERTIFIKAT KELULUSAN",
  subheading: "Diberikan kepada",
  body_text: 'atas keberhasilan menyelesaikan kursus "{course}" dengan memenuhi seluruh modul, pelajaran, dan uji kompetensi yang dipersyaratkan.',
  organization_name: "LPK BORNEO CITRA GEMILANG",
  organization_location: "Bontang, Kalimantan Timur",
  signer_name: "Direktur LPK BCG",
  signer_title: "Direktur",
  cert_prefix: "LPK-BCG",
  date_format: "long",
  accent_color: "#C79E2E",
  bg_color: "#FCFBED",
  text_color: "#0F0F1A",
  footer_note: null,
});

const CertificatesAdmin = () => {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<string>("");
  const [tpl, setTpl] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("courses").select("id, title, slug").order("title");
      const list = (data as Course[]) || [];
      setCourses(list);
      if (list.length && !courseId) setCourseId(list[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!courseId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("certificate_templates").select("*").eq("course_id", courseId).maybeSingle();
      setTpl((data as Template) || defaults(courseId));
      setLoading(false);
    })();
  }, [courseId]);

  const update = (patch: Partial<Template>) => setTpl((t) => (t ? { ...t, ...patch } : t));

  const save = async () => {
    if (!tpl) return;
    setSaving(true);
    const payload: any = { ...tpl, course_id: courseId };
    delete payload.id;
    const { error } = tpl.id
      ? await supabase.from("certificate_templates").update(payload).eq("id", tpl.id)
      : await supabase.from("certificate_templates").insert(payload);
    setSaving(false);
    if (error) return toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    toast({ title: "Template tersimpan" });
    const { data } = await supabase.from("certificate_templates").select("*").eq("course_id", courseId).maybeSingle();
    setTpl(data as Template);
  };

  const preview = async () => {
    if (!tpl) return;
    setPreviewing(true);
    try {
      // Save first so preview reflects latest
      await save();
      const { data: sess } = await supabase.auth.getSession();
      const url = `https://ytzrrnpvezxrtzytycvd.supabase.co/functions/v1/issue-certificate`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sess.session?.access_token}`,
          apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0enJybnB2ZXp4cnR6eXR5Y3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNTYxOTQsImV4cCI6MjA3NDkzMjE5NH0.KFb4LX2Y9ivLZ6zYzSmRSRc_QMrovSGWDCk-DSuQVEE",
        },
        body: JSON.stringify({ course_id: courseId, preview: true, preview_name: "Nama Peserta Contoh" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } catch (e: any) {
      toast({ title: "Gagal pratinjau", description: e.message, variant: "destructive" });
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Pilih Kursus</Label>
        <select
          className="w-full p-2 border rounded-md bg-background"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      {loading || !tpl ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <Card>
            <CardHeader><CardTitle>Konten Sertifikat</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nama Organisasi</Label><Input value={tpl.organization_name} onChange={(e) => update({ organization_name: e.target.value })} /></div>
                <div><Label>Lokasi</Label><Input value={tpl.organization_location} onChange={(e) => update({ organization_location: e.target.value })} /></div>
              </div>
              <div><Label>Judul Sertifikat</Label><Input value={tpl.heading} onChange={(e) => update({ heading: e.target.value })} /></div>
              <div><Label>Subjudul</Label><Input value={tpl.subheading} onChange={(e) => update({ subheading: e.target.value })} /></div>
              <div>
                <Label>Teks Isi (gunakan <code className="text-xs bg-muted px-1 rounded">{`{name}`}</code> dan <code className="text-xs bg-muted px-1 rounded">{`{course}`}</code>)</Label>
                <Textarea rows={3} value={tpl.body_text} onChange={(e) => update({ body_text: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nama Penandatangan</Label><Input value={tpl.signer_name} onChange={(e) => update({ signer_name: e.target.value })} /></div>
                <div><Label>Jabatan Penandatangan</Label><Input value={tpl.signer_title} onChange={(e) => update({ signer_title: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Prefix Nomor Sertifikat</Label>
                  <Input value={tpl.cert_prefix} onChange={(e) => update({ cert_prefix: e.target.value })} />
                  <p className="text-xs text-muted-foreground mt-1">Contoh: <code>{tpl.cert_prefix}/{new Date().getFullYear()}/XXXXXXXX</code></p>
                </div>
                <div>
                  <Label>Format Tanggal</Label>
                  <select className="w-full p-2 border rounded-md bg-background" value={tpl.date_format} onChange={(e) => update({ date_format: e.target.value })}>
                    <option value="long">6 Juni 2026</option>
                    <option value="short">6/6/2026</option>
                    <option value="iso">2026-06-06</option>
                  </select>
                </div>
              </div>
              <div><Label>Catatan Footer (opsional)</Label><Input value={tpl.footer_note || ""} onChange={(e) => update({ footer_note: e.target.value || null })} /></div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Desain</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {([
                  ["accent_color", "Warna Aksen"],
                  ["bg_color", "Warna Latar"],
                  ["text_color", "Warna Teks"],
                ] as const).map(([key, label]) => (
                  <div key={key}>
                    <Label>{label}</Label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={tpl[key]} onChange={(e) => update({ [key]: e.target.value } as any)} className="h-10 w-14 border rounded cursor-pointer bg-transparent" />
                      <Input value={tpl[key]} onChange={(e) => update({ [key]: e.target.value } as any)} className="font-mono" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card style={{ background: tpl.bg_color, color: tpl.text_color }}>
              <CardContent className="p-6 text-center space-y-2 border-2" style={{ borderColor: tpl.accent_color }}>
                <p className="text-xs font-semibold tracking-wide" style={{ color: tpl.accent_color }}>{tpl.organization_name}</p>
                <p className="text-[10px] italic opacity-70">{tpl.organization_location}</p>
                <p className="text-lg font-bold mt-3" style={{ fontFamily: "serif" }}>{tpl.heading}</p>
                <div className="h-0.5 w-24 mx-auto" style={{ background: tpl.accent_color }} />
                <p className="text-[11px] italic opacity-70 mt-3">{tpl.subheading}</p>
                <p className="text-base font-bold">NAMA PESERTA</p>
                <p className="text-[10px] opacity-70 px-2">{tpl.body_text.replace("{course}", courses.find(c=>c.id===courseId)?.title || "Kursus").replace("{name}", "Nama Peserta")}</p>
                <p className="text-[9px] opacity-60 pt-2">{tpl.cert_prefix}/{new Date().getFullYear()}/XXXX</p>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="gold" onClick={save} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Simpan
              </Button>
              <Button variant="outline" onClick={preview} disabled={previewing}>
                {previewing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />} Pratinjau PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificatesAdmin;
