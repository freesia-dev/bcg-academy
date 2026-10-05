import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Field } from "@/lib/siteConfigSchema";

export async function uploadSiteImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("File harus berupa gambar");
  if (file.size > 5 * 1024 * 1024) throw new Error("Ukuran maksimal 5 MB");
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `site/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("gallery").upload(path, file, { cacheControl: "31536000", upsert: false });
  if (error) throw error;
  return supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl;
}

export const ImageField = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const pick = async (f?: File | null) => {
    if (!f) return;
    setBusy(true);
    try { onChange(await uploadSiteImage(f)); }
    catch (e: any) { toast({ title: "Gagal unggah", description: e.message, variant: "destructive" }); }
    finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  };
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 h-20 rounded-lg border bg-muted/50 overflow-hidden flex items-center justify-center shrink-0">
        {value ? <img src={value} alt="" className="w-full h-full object-contain" /> : <ImagePlus className="text-muted-foreground" size={22} />}
      </div>
      <div className="flex-1 space-y-2 min-w-0">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://… atau unggah" />
        <div className="flex gap-2">
          <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => ref.current?.click()}>
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ImagePlus className="h-4 w-4 mr-1" />}Unggah
          </Button>
          {value && <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")}><X className="h-4 w-4 mr-1" />Hapus</Button>}
        </div>
      </div>
    </div>
  );
};

interface Props { fields: Field[]; value: any; onChange: (v: any) => void }

const SchemaForm = ({ fields, value, onChange }: Props) => {
  const set = (key: string, v: any) => onChange({ ...value, [key]: v });
  return (
    <div className="space-y-5">
      {fields.map((f) => (
        <FieldRow key={f.key} f={f} value={value?.[f.key]} onChange={(v) => set(f.key, v)} />
      ))}
    </div>
  );
};

const FieldRow = ({ f, value, onChange }: { f: Field; value: any; onChange: (v: any) => void }) => {
  const label = (
    <div className="flex items-baseline justify-between gap-2">
      <Label className="text-sm font-medium">{f.label}</Label>
      {f.max && typeof value === "string" && (
        <span className={`text-xs ${value.length > f.max ? "text-destructive" : "text-muted-foreground"}`}>{value.length}/{f.max}</span>
      )}
    </div>
  );
  const hint = f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>;

  if (f.type === "toggle") {
    return (
      <div className="flex items-center justify-between rounded-lg border p-3">
        <Label>{f.label}</Label>
        <Switch checked={!!value} onCheckedChange={onChange} />
      </div>
    );
  }

  if (f.type === "list") {
    const items: any[] = Array.isArray(value) ? value : [];
    const blank = () => Object.fromEntries((f.fields || []).map((x) => [x.key, x.type === "strings" ? [] : x.type === "select" ? x.options?.[0]?.value ?? "" : ""]));
    const move = (i: number, d: number) => {
      const j = i + d; if (j < 0 || j >= items.length) return;
      const n = [...items]; [n[i], n[j]] = [n[j], n[i]]; onChange(n);
    };
    return (
      <div className="space-y-2">
        {label}{hint}
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold truncate">{(f.itemTitleKey && it?.[f.itemTitleKey]) || `${f.itemLabel || "Item"} ${i + 1}`}</span>
                <div className="flex gap-1 shrink-0">
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} /></Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={i === items.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} /></Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onChange(items.filter((_, k) => k !== i))}><Trash2 size={14} /></Button>
                </div>
              </div>
              <SchemaForm fields={f.fields || []} value={it} onChange={(v) => onChange(items.map((x, k) => (k === i ? v : x)))} />
            </div>
          ))}
        </div>
        {(!f.max || items.length < f.max) && (
          <Button type="button" size="sm" variant="outline" onClick={() => onChange([...items, blank()])}>
            <Plus className="h-4 w-4 mr-1" />Tambah {f.itemLabel || "item"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {label}
      {f.type === "textarea" && <Textarea rows={f.rows || 3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />}
      {f.type === "strings" && (
        <Textarea rows={Math.max(4, (value?.length || 0) + 1)} value={(value || []).join("\n")}
          onChange={(e) => onChange(e.target.value.split("\n"))}
          onBlur={() => onChange((value || []).filter((s: string) => s.trim()))} />
      )}
      {(f.type === "text" || f.type === "url") && <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />}
      {f.type === "number" && <Input type="number" min={f.min} max={f.max} value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} />}
      {f.type === "image" && <ImageField value={value ?? ""} onChange={onChange} />}
      {f.type === "select" && (
        <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      {hint}
    </div>
  );
};

export default SchemaForm;
