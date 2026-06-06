import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Trash2, FileVideo, FileText, File as FileIcon, Image as ImageIcon } from "lucide-react";

type MediaFile = { name: string; id: string; metadata?: any; created_at?: string };

const BUCKET = "course-media";
const SIGN_EXPIRY = 60 * 60 * 24 * 365; // 1 year

export const MediaPicker = ({
  open,
  onClose,
  onPick,
  accept,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (url: string, name: string) => void;
  accept?: string;
}) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.storage.from(BUCKET).list("", {
      limit: 200,
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error) toast({ title: "Gagal memuat media", description: error.message, variant: "destructive" });
    setFiles((data as MediaFile[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open]);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
    setUploading(false);
    if (error) return toast({ title: "Upload gagal", description: error.message, variant: "destructive" });
    toast({ title: "File diupload" });
    load();
  };

  const pickFile = async (f: MediaFile) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(f.name, SIGN_EXPIRY);
    if (error || !data) return toast({ title: "Gagal buat URL", description: error?.message, variant: "destructive" });
    onPick(data.signedUrl, f.name);
    onClose();
  };

  const remove = async (f: MediaFile) => {
    if (!confirm(`Hapus ${f.name}?`)) return;
    const { error } = await supabase.storage.from(BUCKET).remove([f.name]);
    if (error) return toast({ title: "Gagal hapus", description: error.message, variant: "destructive" });
    load();
  };

  const filtered = files.filter((f) => f.name.toLowerCase().includes(filter.toLowerCase()));

  const iconFor = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (["mp4", "webm", "mov", "mkv"].includes(ext || "")) return <FileVideo className="h-4 w-4 text-blue-500" />;
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "")) return <ImageIcon className="h-4 w-4 text-purple-500" />;
    if (["pdf", "doc", "docx", "txt", "md"].includes(ext || "")) return <FileText className="h-4 w-4 text-red-500" />;
    return <FileIcon className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Media Library</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Cari file..." value={filter} onChange={(e) => setFilter(e.target.value)} />
            <Button asChild variant="gold" disabled={uploading}>
              <label className="cursor-pointer">
                {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                Upload
                <input type="file" hidden onChange={upload} accept={accept} />
              </label>
            </Button>
          </div>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Belum ada file. Klik Upload untuk menambah.</p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {filtered.map((f) => (
                <div key={f.id || f.name} className="flex items-center gap-2 p-2 border rounded hover:bg-muted/40">
                  {iconFor(f.name)}
                  <span className="flex-1 text-sm truncate">{f.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {f.metadata?.size ? `${(f.metadata.size / 1024).toFixed(0)} KB` : ""}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => pickFile(f)}>Pilih</Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(f)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Tutup</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MediaPicker;
