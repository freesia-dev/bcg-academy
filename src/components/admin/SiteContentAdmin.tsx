import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save } from "lucide-react";
import { invalidateSiteContent } from "@/hooks/useSiteContent";
import SiteContentPreview from "./SiteContentPreview";
import { Eye } from "lucide-react";

type ContentMap = Record<string, any>;

const KEYS = ["hero", "about", "contact", "payment_info"] as const;

const PAYMENT_DEFAULT = {
  bank_name: "BCA - LPK BORNEO CITRA GEMILANG",
  account_number: "1234567890",
  account_holder: "LPK Borneo Citra Gemilang",
  instructions: "Transfer ke rekening di atas lalu unggah bukti pembayaran. Verifikasi maksimal 1×24 jam.",
};

const FIELD_LABELS: Record<string, Record<string, string>> = {
  hero: {
    badge: "Badge", title_part1: "Judul (sebelum)", title_highlight: "Judul (highlight)", title_part2: "Judul (sesudah)",
    subtitle: "Subjudul", primary_cta: "Tombol Utama", secondary_cta: "Tombol Sekunder", secondary_cta_url: "URL Tombol Sekunder",
    stat_alumni: "Statistik Alumni", stat_alumni_label: "Label Alumni",
    stat_programs: "Statistik Program", stat_programs_label: "Label Program",
    stat_year: "Statistik Tahun", stat_year_label: "Label Tahun",
  },
  about: {
    title_part1: "Judul (sebelum)", title_highlight: "Judul (highlight)", description: "Deskripsi",
    quote: "Kutipan", quote_author: "Penulis Kutipan", features: "Keunggulan (satu per baris)",
    vision: "Visi", mission: "Misi", footer_quote: "Kutipan Penutup",
  },
  contact: {
    title_part1: "Judul (sebelum)", title_highlight: "Judul (highlight)", subtitle: "Subjudul",
    phone: "No. Telepon", phone_hours: "Jam Telepon", phone_tel: "Telepon (tel:)", whatsapp: "WhatsApp (628…)",
    email: "Email", email_note: "Catatan Email", address: "Alamat", city: "Kota",
    hours_weekday: "Jam Hari Kerja", hours_weekend: "Jam Akhir Pekan", map_embed_url: "URL Embed Maps",
  },
  payment_info: {
    bank_name: "Nama Bank", account_number: "No. Rekening", account_holder: "Atas Nama", instructions: "Instruksi",
  },
};

const TEXTAREA_FIELDS = new Set([
  "subtitle", "description", "quote", "vision", "mission", "footer_quote", "instructions", "map_embed_url",
]);

const SiteContentAdmin = () => {
  const { toast } = useToast();
  const [data, setData] = useState<Record<string, ContentMap>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase.from("site_content").select("*");
      const map: Record<string, ContentMap> = {};
      (rows || []).forEach((r: any) => { map[r.key] = r.value || {}; });
      if (!map.payment_info) map.payment_info = PAYMENT_DEFAULT;
      setData(map);
      setLoading(false);
    })();
  }, []);

  const updateField = (k: string, field: string, value: any) => {
    setData((d) => ({ ...d, [k]: { ...d[k], [field]: value } }));
  };

  const save = async (k: string) => {
    setSaving(k);
    const value = data[k] || {};
    const { error } = await supabase.from("site_content").upsert({ key: k, value });
    setSaving(null);
    if (error) return toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    invalidateSiteContent(k);
    toast({ title: "Tersimpan" });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const renderField = (k: string, field: string) => {
    const label = FIELD_LABELS[k]?.[field] || field;
    const value = data[k]?.[field] ?? "";
    if (field === "features") {
      const arr = Array.isArray(value) ? value : [];
      return (
        <div key={field} className="space-y-1">
          <Label>{label}</Label>
          <Textarea
            rows={6}
            value={arr.join("\n")}
            onChange={(e) => updateField(k, field, e.target.value.split("\n").map((s) => s).filter((s) => s.trim()))}
          />
        </div>
      );
    }
    const isLong = TEXTAREA_FIELDS.has(field);
    return (
      <div key={field} className="space-y-1">
        <Label>{label}</Label>
        {isLong ? (
          <Textarea rows={field === "map_embed_url" ? 2 : 3} value={String(value)} onChange={(e) => updateField(k, field, e.target.value)} />
        ) : (
          <Input value={String(value)} onChange={(e) => updateField(k, field, e.target.value)} />
        )}
      </div>
    );
  };

  return (
    <Tabs defaultValue="hero">
      <TabsList className="flex-wrap h-auto">
        {KEYS.map((k) => <TabsTrigger key={k} value={k}>{k === "payment_info" ? "Pembayaran" : k.charAt(0).toUpperCase() + k.slice(1)}</TabsTrigger>)}
      </TabsList>
      {KEYS.map((k) => {
        const fields = Object.keys(FIELD_LABELS[k] || {});
        return (
          <TabsContent value={k} key={k} className="mt-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="capitalize">{k === "payment_info" ? "Info Pembayaran" : k}</CardTitle>
                  <Button variant="gold" size="sm" onClick={() => save(k)} disabled={saving === k}>
                    {saving === k ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}Simpan
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[70vh] overflow-y-auto">
                  {fields.map((f) => renderField(k, f))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                    <Eye className="h-4 w-4" /> Preview Langsung
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-[70vh] overflow-y-auto">
                  <SiteContentPreview contentKey={k} value={data[k]} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
};

export default SiteContentAdmin;
