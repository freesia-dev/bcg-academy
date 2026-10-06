import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trash2, ImagePlus } from "lucide-react";

interface GalleryItem { id: string; title: string; description: string | null; category: string; image_url: string; sort_order: number }

const CATEGORIES: Record<string, string> = {
  training: "Pelatihan", graduation: "Sertifikasi", partnership: "Kerja sama", testimonial: "Testimoni",
};

const GalleryAdmin = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("training");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("gallery_items").select("*").order("sort_order");
    setItems((data as GalleryItem[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const upload = async () => {
    if (!file || !title.trim()) return toast({ title: "Lengkapi judul dan pilih foto" });
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("gallery").upload(path, file);
    if (upErr) { setUploading(false); return toast({ title: "Unggah gagal", description: upErr.message, variant: "destructive" }); }
    const { data: pub } = supabase.storage.from("gallery").getPublicUrl(path);
    const { error } = await supabase.from("gallery_items").insert({
      title: title.trim(), description: desc.trim() || null, category: cat, image_url: pub.publicUrl,
    });
    setUploading(false);
    if (error) return toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    toast({ title: "Foto ditambahkan" });
    setTitle(""); setDesc(""); setFile(null);
    load();
  };

  const remove = async (item: GalleryItem) => {
    if (!confirm(`Hapus foto "${item.title}"?`)) return;
    await supabase.from("gallery_items").delete().eq("id", item.id);
    const path = item.image_url.split("/gallery/")[1];
    if (path) await supabase.storage.from("gallery").remove([path]);
    load();
  };

  return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-6 items-start">
      <Card className="lg:sticky lg:top-6">
        <CardHeader><CardTitle className="text-base">Tambah foto kegiatan</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Judul</Label><Input value={title} placeholder="Praktik K3 di lapangan" onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Keterangan (opsional)</Label><Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div>
            <Label>Kategori</Label>
            <select className="w-full h-10 px-3 border rounded-md bg-background text-sm" value={cat} onChange={(e) => setCat(e.target.value)}>
              {Object.entries(CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div><Label>File foto</Label><Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
          <Button variant="gold" className="w-full" onClick={upload} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImagePlus className="h-4 w-4 mr-2" />}Unggah
          </Button>
        </CardContent>
      </Card>

      <div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : items.length === 0 ? (
          <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Belum ada foto. Foto yang diunggah tampil di bagian Galeri beranda.</CardContent></Card>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((g) => (
              <Card key={g.id} className="overflow-hidden">
                <img src={g.image_url} alt={g.title} className="w-full aspect-[4/3] object-cover" loading="lazy" />
                <CardContent className="p-3 flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm truncate">{g.title}</h4>
                    <Badge variant="outline" className="text-xs mt-1">{CATEGORIES[g.category] || g.category}</Badge>
                  </div>
                  <Button size="icon" variant="ghost" aria-label="Hapus foto" onClick={() => remove(g)}><Trash2 className="h-4 w-4" /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryAdmin;
