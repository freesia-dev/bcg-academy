import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Eye } from "lucide-react";

interface Row {
  id: string;
  status: string;
  payment_method: string | null;
  payment_amount: number | null;
  payment_proof_url: string | null;
  enrolled_at: string;
  user_id: string;
  course: { id: string; title: string } | null;
}

const PaymentsAdmin = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("enrollments")
      .select("id,status,payment_method,payment_amount,payment_proof_url,enrolled_at,user_id, course:courses(id,title)")
      .order("enrolled_at", { ascending: false });
    setRows((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const viewProof = async (path: string) => {
    const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 60 * 10);
    if (error || !data) return toast({ title: "Gagal membuka bukti", variant: "destructive" });
    window.open(data.signedUrl, "_blank");
  };

  const setStatus = async (id: string, status: "active" | "rejected") => {
    setActionId(id);
    const update: any = { status };
    if (status === "active") update.paid_at = new Date().toISOString();
    const { error } = await supabase.from("enrollments").update(update).eq("id", id);
    setActionId(null);
    if (error) return toast({ title: "Gagal", description: error.message, variant: "destructive" });
    if (status === "active") {
      supabase.functions.invoke("notify-enrollment-approved", { body: { enrollment_id: id } }).catch(() => {});
    }
    toast({ title: status === "active" ? "Pembayaran disetujui & email dikirim" : "Pembayaran ditolak" });
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const groups = {
    pending: rows.filter((r) => r.status === "pending_payment"),
    active: rows.filter((r) => r.status === "active" || r.status === "completed"),
    rejected: rows.filter((r) => r.status === "rejected"),
  };

  const card = (r: Row) => (
    <Card key={r.id}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-bold truncate">{r.course?.title || "-"}</h4>
            <p className="text-xs text-muted-foreground">User: {r.user_id.slice(0, 8)}…</p>
            <p className="text-xs text-muted-foreground">{new Date(r.enrolled_at).toLocaleString("id-ID")}</p>
          </div>
          <Badge variant={r.status === "active" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className={r.status === "active" ? "bg-gold text-primary" : ""}>{r.status}</Badge>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Nominal: </span>
          <span className="font-semibold">Rp {(r.payment_amount || 0).toLocaleString("id-ID")}</span>
          {r.payment_method && <span className="text-muted-foreground"> · {r.payment_method}</span>}
        </div>
        <div className="flex gap-2 flex-wrap">
          {r.payment_proof_url && (
            <Button size="sm" variant="outline" onClick={() => viewProof(r.payment_proof_url!)}><Eye className="h-4 w-4 mr-1" />Bukti</Button>
          )}
          {r.status === "pending_payment" && (
            <>
              <Button size="sm" variant="gold" disabled={actionId === r.id} onClick={() => setStatus(r.id, "active")}>
                {actionId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}Setujui
              </Button>
              <Button size="sm" variant="destructive" disabled={actionId === r.id} onClick={() => setStatus(r.id, "rejected")}>
                <XCircle className="h-4 w-4 mr-1" />Tolak
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
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
    </div>
  );
};

export default PaymentsAdmin;
