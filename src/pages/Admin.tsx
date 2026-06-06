import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Loader2, Plus, Trash2, Pencil, X, ArrowLeft } from "lucide-react";
import { usePrograms, type Program } from "@/hooks/usePrograms";
import PaymentsAdmin from "@/components/admin/PaymentsAdmin";

interface GalleryItem { id: string; title: string; description: string | null; category: string; image_url: string; sort_order: number; }

const emptyProgram: Partial<Program> = {
  title: "", slug: "", description: "", duration: "", capacity: "", level: "Pemula",
  highlights: [], color: "gold", sort_order: 0, is_active: true,
};

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const { programs, refetch } = usePrograms(false);
  const [editingProgram, setEditingProgram] = useState<Partial<Program> | null>(null);
  const [savingProgram, setSavingProgram] = useState(false);

  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [galTitle, setGalTitle] = useState(""); const [galDesc, setGalDesc] = useState("");
  const [galCat, setGalCat] = useState("training"); const [galFile, setGalFile] = useState<File | null>(null);
  const [uploadingGal, setUploadingGal] = useState(false);

  const loadGallery = async () => {
    const { data } = await supabase.from("gallery_items").select("*").order("sort_order");
    setGallery((data as GalleryItem[]) || []);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setUserEmail(session.user.email || "");
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      const admin = (roles || []).some((r: any) => r.role === "admin");
      setIsAdmin(admin);
      setChecking(false);
      if (admin) loadGallery();
    };
    init();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate("/auth");
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/auth"); };

  const saveProgram = async () => {
    if (!editingProgram) return;
    setSavingProgram(true);
    const payload = {
      title: editingProgram.title || "",
      slug: (editingProgram.slug || editingProgram.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      description: editingProgram.description || "",
      duration: editingProgram.duration || "",
      capacity: editingProgram.capacity || "",
      level: editingProgram.level || "Pemula",
      highlights: editingProgram.highlights || [],
      color: editingProgram.color || "gold",
      sort_order: editingProgram.sort_order || 0,
      is_active: editingProgram.is_active ?? true,
    };
    const { error } = editingProgram.id
      ? await supabase.from("programs").update(payload).eq("id", editingProgram.id)
      : await supabase.from("programs").insert(payload);
    setSavingProgram(false);
    if (error) return toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    toast({ title: "Program disimpan" });
    setEditingProgram(null); refetch();
  };

  const deleteProgram = async (id: string) => {
    if (!confirm("Hapus program ini?")) return;
    const { error } = await supabase.from("programs").delete().eq("id", id);
    if (error) return toast({ title: "Gagal", description: error.message, variant: "destructive" });
    refetch();
  };

  const uploadGallery = async () => {
    if (!galFile || !galTitle) return toast({ title: "Lengkapi judul & file" });
    setUploadingGal(true);
    const ext = galFile.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("gallery").upload(path, galFile);
    if (upErr) { setUploadingGal(false); return toast({ title: "Upload gagal", description: upErr.message, variant: "destructive" }); }
    const { data: pub } = supabase.storage.from("gallery").getPublicUrl(path);
    const { error: insErr } = await supabase.from("gallery_items").insert({
      title: galTitle, description: galDesc || null, category: galCat, image_url: pub.publicUrl,
    });
    setUploadingGal(false);
    if (insErr) return toast({ title: "Gagal", description: insErr.message, variant: "destructive" });
    toast({ title: "Foto ditambahkan" });
    setGalTitle(""); setGalDesc(""); setGalFile(null); loadGallery();
  };

  const deleteGallery = async (item: GalleryItem) => {
    if (!confirm("Hapus foto ini?")) return;
    await supabase.from("gallery_items").delete().eq("id", item.id);
    const path = item.image_url.split("/gallery/")[1];
    if (path) await supabase.storage.from("gallery").remove([path]);
    loadGallery();
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <h2 className="text-2xl font-bold">Akses Ditolak</h2>
            <p className="text-muted-foreground">Akun <strong>{userEmail}</strong> belum memiliki hak admin. Hubungi pengelola untuk diberi akses.</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={handleLogout}>Keluar</Button>
              <Link to="/"><Button variant="gold">Beranda</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/20">
      <header className="bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Situs</Button></Link>
            <h1 className="text-xl font-bold">Dashboard Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">{userEmail}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}><LogOut className="h-4 w-4 mr-1" />Keluar</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="programs">
          <TabsList>
            <TabsTrigger value="programs">Program Pelatihan</TabsTrigger>
            <TabsTrigger value="gallery">Galeri</TabsTrigger>
            <TabsTrigger value="payments">Pembayaran</TabsTrigger>
          </TabsList>

          <TabsContent value="programs" className="space-y-4 mt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Kelola Program</h2>
              <Button variant="gold" onClick={() => setEditingProgram({ ...emptyProgram })}><Plus className="h-4 w-4 mr-1" />Tambah</Button>
            </div>

            {editingProgram && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between"><CardTitle>{editingProgram.id ? "Edit" : "Tambah"} Program</CardTitle><Button variant="ghost" size="icon" onClick={() => setEditingProgram(null)}><X className="h-4 w-4" /></Button></CardHeader>
                <CardContent className="space-y-3">
                  <div><Label>Judul</Label><Input value={editingProgram.title || ""} onChange={(e) => setEditingProgram({ ...editingProgram, title: e.target.value })} /></div>
                  <div><Label>Slug (URL)</Label><Input value={editingProgram.slug || ""} placeholder="otomatis dari judul" onChange={(e) => setEditingProgram({ ...editingProgram, slug: e.target.value })} /></div>
                  <div><Label>Deskripsi</Label><Textarea value={editingProgram.description || ""} onChange={(e) => setEditingProgram({ ...editingProgram, description: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Durasi</Label><Input value={editingProgram.duration || ""} placeholder="20 Hari" onChange={(e) => setEditingProgram({ ...editingProgram, duration: e.target.value })} /></div>
                    <div><Label>Kapasitas</Label><Input value={editingProgram.capacity || ""} placeholder="30 Peserta" onChange={(e) => setEditingProgram({ ...editingProgram, capacity: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Level</Label><Input value={editingProgram.level || ""} onChange={(e) => setEditingProgram({ ...editingProgram, level: e.target.value })} /></div>
                    <div><Label>Warna</Label>
                      <select className="w-full p-2 border rounded-md bg-background" value={editingProgram.color || "gold"} onChange={(e) => setEditingProgram({ ...editingProgram, color: e.target.value })}>
                        <option value="gold">Gold</option><option value="corporate-blue">Biru</option><option value="accent-red">Merah</option>
                      </select>
                    </div>
                  </div>
                  <div><Label>Highlights (pisah dengan koma)</Label>
                    <Input value={(editingProgram.highlights || []).join(", ")} onChange={(e) => setEditingProgram({ ...editingProgram, highlights: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Urutan</Label><Input type="number" value={editingProgram.sort_order || 0} onChange={(e) => setEditingProgram({ ...editingProgram, sort_order: parseInt(e.target.value) || 0 })} /></div>
                    <div className="flex items-end gap-2"><input type="checkbox" id="active" checked={editingProgram.is_active ?? true} onChange={(e) => setEditingProgram({ ...editingProgram, is_active: e.target.checked })} /><Label htmlFor="active">Aktif (tampil di website)</Label></div>
                  </div>
                  <Button variant="gold" onClick={saveProgram} disabled={savingProgram}>{savingProgram && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Simpan</Button>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {programs.map((p) => (
                <Card key={p.id}>
                  <CardContent className="p-4 flex justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{p.title}</h3>
                        {!p.is_active && <Badge variant="secondary">Nonaktif</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                      <p className="text-xs mt-2">{p.duration} • {p.capacity}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button size="icon" variant="outline" onClick={() => setEditingProgram(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="outline" onClick={() => deleteProgram(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="gallery" className="space-y-4 mt-6">
            <h2 className="text-2xl font-bold">Kelola Galeri</h2>
            <Card>
              <CardHeader><CardTitle>Tambah Foto</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Judul</Label><Input value={galTitle} onChange={(e) => setGalTitle(e.target.value)} /></div>
                <div><Label>Deskripsi</Label><Textarea value={galDesc} onChange={(e) => setGalDesc(e.target.value)} /></div>
                <div><Label>Kategori</Label>
                  <select className="w-full p-2 border rounded-md bg-background" value={galCat} onChange={(e) => setGalCat(e.target.value)}>
                    <option value="training">Pelatihan</option><option value="graduation">Sertifikasi</option><option value="partnership">Kerjasama</option><option value="testimonial">Testimoni</option>
                  </select>
                </div>
                <div><Label>File Gambar</Label><Input type="file" accept="image/*" onChange={(e) => setGalFile(e.target.files?.[0] || null)} /></div>
                <Button variant="gold" onClick={uploadGallery} disabled={uploadingGal}>{uploadingGal && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Upload</Button>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-4">
              {gallery.map((g) => (
                <Card key={g.id} className="overflow-hidden">
                  <img src={g.image_url} alt={g.title} className="w-full aspect-square object-cover" />
                  <CardContent className="p-3 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div><h4 className="font-semibold text-sm">{g.title}</h4><Badge variant="outline" className="text-xs mt-1">{g.category}</Badge></div>
                      <Button size="icon" variant="outline" onClick={() => deleteGallery(g)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="payments" className="mt-6">
            <h2 className="text-2xl font-bold mb-4">Verifikasi Pembayaran</h2>
            <PaymentsAdmin />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
