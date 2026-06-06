import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, TrendingUp, CheckCircle2, Clock, XCircle } from "lucide-react";

type Pay = {
  id: string; user_id: string; course_id: string; status: string;
  payment_method: string | null; payment_amount: number | null;
  paid_at: string | null; enrolled_at: string;
  course: { title: string } | null;
};

const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10);

const ReportsAdmin = () => {
  const [rows, setRows] = useState<Pay[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data }, { data: profs }] = await Promise.all([
        supabase.from("enrollments").select("id,user_id,course_id,status,payment_method,payment_amount,paid_at,enrolled_at, course:courses(title)"),
        supabase.from("profiles").select("id, full_name"),
      ]);
      setRows((data as any) || []);
      setProfiles(new Map((profs || []).map((p: any) => [p.id, p])));
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const fromT = new Date(from).getTime();
    const toT = new Date(to).getTime() + 86400_000;
    return rows.filter((r) => {
      const t = new Date(r.paid_at || r.enrolled_at).getTime();
      return t >= fromT && t < toT;
    });
  }, [rows, from, to]);

  const stats = useMemo(() => {
    const approved = filtered.filter((r) => r.status === "active" || r.status === "completed");
    const pending = filtered.filter((r) => r.status === "pending_payment");
    const rejected = filtered.filter((r) => r.status === "rejected");
    const revenue = approved.reduce((s, r) => s + (r.payment_amount || 0), 0);
    return { approved: approved.length, pending: pending.length, rejected: rejected.length, revenue };
  }, [filtered]);

  const exportCsv = () => {
    const header = ["Tanggal", "Peserta", "Kursus", "Metode", "Nominal", "Status"];
    const lines = filtered.map((r) => [
      new Date(r.paid_at || r.enrolled_at).toLocaleString("id-ID"),
      (profiles.get(r.user_id) as any)?.full_name || r.user_id.slice(0, 8),
      r.course?.title || "-",
      r.payment_method || "-",
      r.payment_amount || 0,
      r.status,
    ]);
    const csv = [header, ...lines].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-pembayaran-${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const setPreset = (days: number) => { setFrom(daysAgo(days)); setTo(today()); };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Filter Periode</CardTitle></CardHeader>
        <CardContent className="flex gap-3 flex-wrap items-end">
          <div><Label>Dari</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Sampai</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setPreset(7)}>7 hari</Button>
            <Button variant="outline" size="sm" onClick={() => setPreset(30)}>30 hari</Button>
            <Button variant="outline" size="sm" onClick={() => setPreset(90)}>90 hari</Button>
          </div>
          <Button variant="gold" onClick={exportCsv} className="ml-auto"><Download className="h-4 w-4 mr-1" />Ekspor CSV</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground text-xs"><TrendingUp className="h-4 w-4" />Pendapatan</div><div className="text-2xl font-bold text-gold mt-1">{formatRp(stats.revenue)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground text-xs"><CheckCircle2 className="h-4 w-4" />Disetujui</div><div className="text-2xl font-bold mt-1">{stats.approved}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground text-xs"><Clock className="h-4 w-4" />Menunggu</div><div className="text-2xl font-bold mt-1">{stats.pending}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground text-xs"><XCircle className="h-4 w-4" />Ditolak</div><div className="text-2xl font-bold mt-1">{stats.rejected}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Transaksi ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground border-b">
                <tr><th className="py-2 pr-3">Tanggal</th><th className="py-2 pr-3">Peserta</th><th className="py-2 pr-3">Kursus</th><th className="py-2 pr-3">Metode</th><th className="py-2 pr-3 text-right">Nominal</th><th className="py-2 pr-3">Status</th></tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-muted/40">
                    <td className="py-2 pr-3 text-xs">{new Date(r.paid_at || r.enrolled_at).toLocaleString("id-ID")}</td>
                    <td className="py-2 pr-3">{(profiles.get(r.user_id) as any)?.full_name || r.user_id.slice(0, 8)}</td>
                    <td className="py-2 pr-3">{r.course?.title || "-"}</td>
                    <td className="py-2 pr-3 text-xs">{r.payment_method || "-"}</td>
                    <td className="py-2 pr-3 text-right font-semibold">{formatRp(r.payment_amount || 0)}</td>
                    <td className="py-2 pr-3"><Badge variant={r.status === "active" || r.status === "completed" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className={r.status === "active" || r.status === "completed" ? "bg-gold text-primary" : ""}>{r.status}</Badge></td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Tidak ada transaksi pada periode ini.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsAdmin;
