import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowUp, Download, ExternalLink, Layers, Loader2, Monitor, Palette, RotateCcw, Save, Smartphone, Upload, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { loadSiteConfig } from "@/hooks/useSiteConfig";
import { CONFIG_KEY, DEFAULT_CONFIG, SECTION_LABELS, normalizeConfig, type SectionId, type SiteConfig } from "@/lib/siteConfig";
import { GROUPS } from "@/lib/siteConfigSchema";
import SchemaForm from "@/components/admin/config/SchemaForm";
import ThemePanel from "@/components/admin/config/ThemePanel";

type Panel = string; // "theme" | "order" | "backup" | group id

const getAt = (o: any, path: string[]) => path.reduce((a, k) => a?.[k], o);
const setAt = (o: any, path: string[], v: any): any =>
  path.length === 0 ? v : { ...o, [path[0]]: setAt(o?.[path[0]], path.slice(1), v) };

const SiteConfigAdmin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loading, user, isSuperadmin } = useAuth();
  const [saved, setSaved] = useState<SiteConfig | null>(null);
  const [draft, setDraft] = useState<SiteConfig | null>(null);
  const [panel, setPanel] = useState<Panel>("theme");
  const [saving, setSaving] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [showPreview, setShowPreview] = useState(true);
  const [mobilePreview, setMobilePreview] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const draftRef = useRef<SiteConfig | null>(null);
  draftRef.current = draft;
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/auth");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!isSuperadmin) return;
    loadSiteConfig(true).then((c) => { setSaved(c); setDraft(c); });
  }, [isSuperadmin]);

  const dirty = useMemo(() => !!draft && !!saved && JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);

  // iframe preview
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "bcg-preview-ready") setReady(true);
      if (e.data?.type === "bcg-select" && typeof e.data.panel === "string") { setPanel(e.data.panel); setMobilePreview(false); }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);
  useEffect(() => {
    if (ready && draft) frame.current?.contentWindow?.postMessage({ type: "bcg-config", config: draft }, window.location.origin);
  }, [ready, draft]);
  useEffect(() => {
    if (!ready) return;
    const map: Record<string, string> = { hero: "home", offer: "offer", programs: "programs", about: "about", team: "team", gallery: "gallery", contact: "contact" };
    if (map[panel]) frame.current?.contentWindow?.postMessage({ type: "bcg-scroll", id: map[panel] }, window.location.origin);
    else if (["theme", "brand", "seo", "order"].includes(panel)) frame.current?.contentWindow?.postMessage({ type: "bcg-scroll", id: "home" }, window.location.origin);
  }, [panel, ready]);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const update = useCallback((path: string[], v: any) => setDraft((d) => (d ? setAt(d, path, v) : d)), []);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    const { error } = await supabase.from("site_content").upsert({ key: CONFIG_KEY, value: draft as any });
    setSaving(false);
    if (error) return toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    await loadSiteConfig(true);
    setSaved(draft);
    toast({ title: "Tersimpan", description: "Perubahan sudah tampil di situs publik." });
  };

  const resetGroup = (path: string[]) => {
    if (!confirm("Kembalikan bagian ini ke isi bawaan? (belum disimpan sebelum Anda klik Simpan)")) return;
    update(path, getAt(DEFAULT_CONFIG, path));
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bcg-site-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importJson = async (f?: File | null) => {
    if (!f) return;
    try {
      const raw = JSON.parse(await f.text());
      if (typeof raw !== "object" || !raw.sections) throw new Error("Format berkas tidak dikenali");
      setDraft(normalizeConfig(raw));
      toast({ title: "Berkas dimuat", description: "Periksa preview, lalu klik Simpan." });
    } catch (e: any) {
      toast({ title: "Gagal membaca berkas", description: e.message, variant: "destructive" });
    } finally { if (fileRef.current) fileRef.current.value = ""; }
  };

  if (loading || (isSuperadmin && !draft)) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!isSuperadmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">Khusus Superadmin</h1>
        <p className="text-muted-foreground max-w-sm">Halaman konfigurasi situs hanya dapat dibuka oleh pengguna dengan role superadmin.</p>
        <Button asChild variant="outline"><Link to="/admin"><ArrowLeft className="h-4 w-4 mr-2" />Kembali ke Dashboard</Link></Button>
      </div>
    );
  }
  const cfg = draft!;
  const group = GROUPS.find((g) => g.id === panel);
  const isSection = (id: string): id is SectionId => id in SECTION_LABELS;

  const navBtn = (id: string, label: string, icon?: React.ReactNode, off?: boolean) => (
    <button key={id} onClick={() => setPanel(id)}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${panel === id ? "bg-primary text-primary-foreground" : "hover:bg-muted"} ${off ? "opacity-50" : ""}`}>
      {icon}<span className="truncate">{label}</span>{off && <span className="ml-auto text-[10px] uppercase">off</span>}
    </button>
  );

  return (
    <div className="h-screen flex flex-col bg-muted/30">
      <header className="h-14 shrink-0 bg-background border-b flex items-center gap-3 px-4">
        <Button asChild variant="ghost" size="sm"><Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1" />Dashboard</Link></Button>
        <div className="font-semibold hidden sm:block">Konfigurasi Situs</div>
        <div className="ml-auto flex items-center gap-2">
          {dirty && <span className="text-xs text-amber-600 font-medium hidden sm:inline">● Belum disimpan</span>}
          <div className="hidden lg:flex border rounded-md overflow-hidden">
            <button className={`px-2.5 py-1.5 ${device === "desktop" ? "bg-muted" : ""}`} onClick={() => setDevice("desktop")} aria-label="Desktop"><Monitor size={16} /></button>
            <button className={`px-2.5 py-1.5 ${device === "mobile" ? "bg-muted" : ""}`} onClick={() => setDevice("mobile")} aria-label="Mobile"><Smartphone size={16} /></button>
          </div>
          <Button variant="outline" size="sm" className="hidden lg:inline-flex" onClick={() => setShowPreview((v) => !v)}>{showPreview ? "Sembunyikan preview" : "Tampilkan preview"}</Button>
          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setMobilePreview(true)}><Monitor className="h-4 w-4 mr-1" />Preview</Button>
          <Button asChild variant="outline" size="sm"><a href="/" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1" />Lihat situs</a></Button>
          <Button variant="outline" size="sm" disabled={!dirty || saving} onClick={() => saved && setDraft(saved)}><Undo2 className="h-4 w-4 mr-1" />Batal</Button>
          <Button variant="gold" size="sm" disabled={!dirty || saving} onClick={save}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}Simpan
          </Button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex">
        <nav className="w-56 shrink-0 bg-background border-r overflow-y-auto p-3 space-y-1 hidden md:block">
          <p className="px-3 pt-1 pb-1 text-[11px] font-semibold uppercase text-muted-foreground">Tampilan</p>
          {navBtn("theme", "Tema & Warna", <Palette size={15} />)}
          {navBtn("order", "Susunan Halaman", <Layers size={15} />)}
          <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase text-muted-foreground">Umum</p>
          {GROUPS.filter((g) => g.id === "brand" || g.id === "seo").map((g) => navBtn(g.id, g.label))}
          <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase text-muted-foreground">Section</p>
          {cfg.sectionOrder.map((id) => navBtn(id, SECTION_LABELS[id], undefined, !cfg.sections[id].enabled))}
          <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase text-muted-foreground">Lanjutan</p>
          {navBtn("backup", "Cadangan & Reset", <RotateCcw size={15} />)}
        </nav>

        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="md:hidden p-3 border-b bg-background">
            <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={panel} onChange={(e) => setPanel(e.target.value)}>
              <option value="theme">Tema & Warna</option><option value="order">Susunan Halaman</option>
              {GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
              <option value="backup">Cadangan & Reset</option>
            </select>
          </div>
          <div className="max-w-2xl mx-auto p-5 md:p-8 space-y-6 pb-24">
            {panel === "theme" && (
              <>
                <Heading title="Tema & Warna" desc="Warna, font, dan sudut berlaku ke seluruh situs, termasuk halaman kursus." />
                <ThemePanel theme={cfg.theme} onChange={(t) => update(["theme"], t)} />
              </>
            )}

            {panel === "order" && (
              <>
                <Heading title="Susunan Halaman Beranda" desc="Atur urutan dan tampilkan/sembunyikan section di halaman beranda." />
                <div className="space-y-2">
                  {cfg.sectionOrder.map((id, i) => (
                    <div key={id} className="flex items-center gap-3 rounded-lg border bg-background p-3">
                      <span className="w-6 text-center text-sm text-muted-foreground">{i + 1}</span>
                      <span className={`flex-1 font-medium ${cfg.sections[id].enabled ? "" : "text-muted-foreground line-through"}`}>{SECTION_LABELS[id]}</span>
                      <Button size="icon" variant="ghost" className="h-8 w-8" disabled={i === 0}
                        onClick={() => { const o = [...cfg.sectionOrder]; [o[i - 1], o[i]] = [o[i], o[i - 1]]; update(["sectionOrder"], o); }}><ArrowUp size={15} /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" disabled={i === cfg.sectionOrder.length - 1}
                        onClick={() => { const o = [...cfg.sectionOrder]; [o[i + 1], o[i]] = [o[i], o[i + 1]]; update(["sectionOrder"], o); }}><ArrowDown size={15} /></Button>
                      <Switch checked={cfg.sections[id].enabled} onCheckedChange={(v) => update(["sections", id, "enabled"], v)} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {group && (
              <>
                <div className="flex items-start justify-between gap-4">
                  <Heading title={group.label} desc={group.description} />
                  <Button variant="ghost" size="sm" className="shrink-0" onClick={() => resetGroup(group.path)}><RotateCcw className="h-4 w-4 mr-1" />Bawaan</Button>
                </div>
                {isSection(group.id) && (
                  <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                    <span className="text-sm font-medium">Tampilkan section ini di beranda</span>
                    <Switch checked={cfg.sections[group.id].enabled} onCheckedChange={(v) => update(["sections", group.id, "enabled"], v)} />
                  </div>
                )}
                <SchemaForm fields={group.fields} value={getAt(cfg, group.path)} onChange={(v) => update(group.path, v)} />
              </>
            )}

            {panel === "backup" && (
              <>
                <Heading title="Cadangan & Reset" desc="Unduh konfigurasi sebagai berkas JSON, pulihkan dari cadangan, atau kembalikan seluruh situs ke tampilan bawaan." />
                <div className="rounded-lg border bg-background p-4 space-y-3">
                  <h3 className="font-semibold">Ekspor / Impor</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={exportJson}><Download className="h-4 w-4 mr-2" />Unduh cadangan</Button>
                    <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => importJson(e.target.files?.[0])} />
                    <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-2" />Pulihkan dari berkas</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Berkas yang dimuat masuk sebagai draf. Klik Simpan untuk menerapkannya.</p>
                </div>
                <div className="rounded-lg border border-destructive/30 bg-background p-4 space-y-3">
                  <h3 className="font-semibold text-destructive">Reset ke bawaan</h3>
                  <p className="text-sm text-muted-foreground">Mengembalikan semua teks, tema, dan susunan ke isi bawaan. Foto galeri dan program tidak terpengaruh.</p>
                  <Button variant="destructive" onClick={() => { if (confirm("Reset SELURUH konfigurasi ke bawaan?")) setDraft(DEFAULT_CONFIG); }}>
                    <RotateCcw className="h-4 w-4 mr-2" />Reset semua
                  </Button>
                </div>
              </>
            )}
          </div>
        </main>

        {(showPreview || mobilePreview) && (
          <aside className={mobilePreview ? "fixed inset-0 z-50 bg-muted flex flex-col items-center p-3" : "w-[44%] max-w-[760px] shrink-0 border-l bg-muted hidden lg:flex flex-col items-center p-3"}>
            {mobilePreview && <Button size="sm" variant="outline" className="self-end mb-2" onClick={() => setMobilePreview(false)}>Tutup preview</Button>}
            <p className="text-[11px] text-muted-foreground mb-2">Klik bagian mana pun di preview untuk langsung mengeditnya</p>
            <div className={`flex-1 min-h-0 w-full bg-background shadow-lg rounded-lg overflow-hidden border transition-all ${device === "mobile" && !mobilePreview ? "max-w-[390px]" : ""}`}>
              <iframe ref={frame} src="/?preview=1" title="Preview situs" className="w-full h-full" onLoad={() => { setReady(true); frame.current?.contentWindow?.postMessage({ type: "bcg-config", config: draftRef.current }, window.location.origin); }} />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

const Heading = ({ title, desc }: { title: string; desc?: string }) => (
  <div>
    <h2 className="text-xl font-bold">{title}</h2>
    {desc && <p className="text-sm text-muted-foreground mt-1">{desc}</p>}
  </div>
);

export default SiteConfigAdmin;
