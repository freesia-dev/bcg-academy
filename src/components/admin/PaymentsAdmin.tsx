import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Eye, MessageCircle, Search } from "lucide-react";

interface Row {
  id: string;
  status: string;
  payment_method: string | null;
  payment_amount: number | null;
  payment_proof_url: string | null;
  enrolled_at: string;
  paid_at: string | null;
  notes: string | null;
  user_id: string;
  course: { id: string; title: string; slug: string } | null;
}
interface Profile { id: string; full_name: string | null; phone: string | null }

const statusLabel: Record<string, string> = {
  pending_payment: "Menunggu", active: "Aktif", completed: "Selesai", rejected: "Ditolak", cancelled: "Dibatalkan",
};

const toWa = (phone: string | null | undefined) => {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  return d.length >= 9 ? d : null;
};

const PaymentsAdmin = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [rejecting, setRejecting] = useState<Row | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("enrollments")
      .select("id,status,payment_method,payment_amount,payment_proof_url,enrolled_at,paid_at,notes,user_id, course:courses(id,title,slug)")
      .order("enrolled_at", { ascending: false });
    const list = (data as any as Row[]) || [];
    setRows(list);
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id,full_name,phone").in("id", ids);
      setProfiles(Object.fromEntries(((ps as Profile[]) || []).map((p) => [p.id, p])));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const viewProof = async (path: string) => {
    const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 60 * 10);
    if (error || !data) return toast({ title: "Gagal membuka bukti", variant: "destructive" });
    window.open(data.signedUrl, "_blank");
  };

  const approve = async (r: Row) => {
    setActionId(r.id);
    const { error } = await supabase.from("enrollments")
      .update({ status: "active", paid_at: new Date().toISOString(), notes: null }).eq("id", r.id);
    setActionId(null);
    if (error) return toast({ title: "Gagal", description: error.message, variant: "destructive" });
    supabase.functions.invoke("notify-enrollment-approved", { body: { enrollment_id: r.id } }).catch(() => {});
    toast({ title: "Pembayaran disetujui", description: "Peserta sudah bisa belajar. Kabari via WhatsApp bila perlu." });
    load();
  };

  const reject = async () => {
    if (!rejecting) return;
    setActionId(rejecting.id);
    const { error } = await supabase.from("enrollments")
      .update({ status: "rejected", notes: reason.trim() || "Bukti pembayaran tidak sesuai" }).eq("id", rejecting.id);
    setActionId(null);
    if (error) return toast({ title: "Gagal", description: error.message, variant: "destructive" });
    toast({ title: "Pembayaran ditolak", description: "Peserta dapat mengirim ulang bukti." });
    setRejecting(null); setReason("");
    load();
  };

  const waLink = (r: Row, kind: "approved" | "rejected") => {
    const p = profiles[r.user_id];
    const num = toWa(p?.phone);
    if (!num) return null;
    const origin = window.location.origin;
    const text = kind === "approved"
      ? `Halo ${p?.full_name || ""}, pembayaran Anda untuk kursus "${r.course?.title}" sudah kami verifikasi. Silakan mulai belajar di ${origin}/learn/${r.course?.slug}. Selamat belajar!`
      : `Halo ${p?.full_name || ""}, pembayaran Anda untuk kursus "${r.course?.title}" belum dapat kami verifikasi${r.notes ? ` (${r.notes})` : ""}. Silakan kirim ulang bukti pembayaran di ${origin}/kursus/${r.course?.slug}.`;
    return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  };

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => {
      const p = profiles[r.user_id];
      return [r.course?.title, p?.full_name, p?.phone].some((x) => (x || "").toLowerCase().includes(t));
    });
  }, [rows, profiles, q]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const groups = {
    pending: filtered.filter((r) => r.status === "pending_payment"),
    active: filtered.filter((r) => r.status === "active" || r.status === "completed"),
    rejected: filtered.filter((r) => r.status === "rejected"),
  };

  const card = (r: Row) => {
    const p = profiles[r.user_id];
    const wa = r.status === "active" || r.status === "completed" ? waLink(r, "approved") : r.status === "rejected" ? waLink(r, "rejected") : null;
    return (
      <Card key={r.id}>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-bold truncate">{r.course?.title || "-"}</h4>
              <p className="text-sm">{p?.full_name || "Tanpa nama"} <span className="text-muted-foreground">· {p?.phone || "tanpa no. WA"}</span></p>
              <p className="text-xs text-muted-foreground">{new Date(r.enrolled_at).toLocaleString("id-ID")}</p>
            </div>
            <Badge variant={r.status === "rejected" ? "destructive" : r.status === "pending_payment" ? "secondary" : "default"}
              className={r.status === "active" || r.status === "completed" ? "bg-gold text-primary" : ""}>{statusLabel[r.status] || r.status}</Badge>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Nominal: </span>
            <span className="font-semibold">Rp {(r.payment_amount || 0).toLocaleString("id-ID")}</span>
            {r.payment_method && <span className="text-muted-foreground"> · {r.payment_method}</span>}
          </div>
          {r.status === "rejected" && r.notes && <p className="text-xs text-destructive">Alasan: {r.notes}</p>}
          <div className="flex gap-2 flex-wrap">
            {r.payment_proof_url && (
              <Button size="sm" variant="outline" onClick={() => viewProof(r.payment_proof_url!)}><Eye className="h-4 w-4 mr-1" />Bukti</Button>
            )}
            {r.status === "pending_payment" && (
              <>
                <Button size="sm" variant="gold" disabled={actionId === r.id} onClick={() => approve(r)}>
                  {actionId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}Setujui
                </Button>
                <Button size="sm" variant="destructive" disabled={actionId === r.id} onClick={() => { setRejecting(r); setReason(""); }}>
                  <XCircle className="h-4 w-4 mr-1" />Tolak
                </Button>
              </>
            )}
            {wa && (
              <Button size="sm" variant="outline" asChild>
                <a href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 mr-1" />Kabari via WA</a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Cari nama, no. WA, atau kursus…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <section>
        <h3 className="text-lg font-bold mb-3">Menunggu Verifikasi ({groups.pending.length})</h3>
        {groups.pending.length === 0 ? <p className="text-sm text-muted-foreground">Tidak ada pembayaran menunggu.</p> :
          <div className="grid md:grid-cols-2 gap-3">{groups.pending.map(card)}</div>}
      </section>
      <section>
        <h3 className="text-lg font-bold mb-3">Aktif ({groups.active.length})</h3>
        <div className="grid md:grid-cols-2 gap-3">{groups.active.map(card)}</div>
      </section>
      {groups.rejected.length > 0 && (
        <section>
          <h3 className="text-lg font-bold mb-3">Ditolak ({groups.rejected.length})</h3>
          <div className="grid md:grid-cols-2 gap-3">{groups.rejected.map(card)}</div>
        </section>
      )}

      <Dialog open={!!rejecting} onOpenChange={(v) => !v && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak pembayaran</DialogTitle>
            <DialogDescription>Alasan akan ditampilkan kepada peserta agar bisa mengirim ulang bukti yang benar.</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} placeholder="Contoh: Nominal transfer kurang / bukti tidak terbaca" value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Batal</Button>
            <Button variant="destructive" disabled={actionId === rejecting?.id} onClick={reject}>Tolak pembayaran</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsAdmin;
