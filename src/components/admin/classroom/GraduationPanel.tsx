import { useMemo, useState } from "react";
import { Award, Check, Download, GraduationCap, Link2, Loader2, MessageCircle, RotateCcw, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { regCode } from "@/lib/batches";
import { waUrl } from "@/lib/adminData";
import { verifyUrl, type Member } from "@/lib/classroom";

export interface Metric { value: number | null; label: string; eligible: boolean }

interface Props {
  members: Member[];
  metrics: Record<string, Metric>;
  metricTitle: string;
  requirement: string;
  courseTitle: string;
  onChanged: () => Promise<void>;
}

const CHUNK = 15;

const GraduationPanel = ({ members, metrics, metricTitle, requirement, courseTitle, onChanged }: Props) => {
  const { toast } = useToast();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [failures, setFailures] = useState<{ name: string; error: string }[] | null>(null);

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const eligibleIds = useMemo(() => members.filter((m) => metrics[m.id]?.eligible && m.status === "active").map((m) => m.id), [members, metrics]);
  const chosen = members.filter((m) => sel.has(m.id));
  const toGraduate = chosen.filter((m) => m.status === "active");
  const toIssue = chosen.filter((m) => m.status === "completed");
  const toRevoke = chosen.filter((m) => m.status === "completed");
  const pendingIssue = toIssue.filter((m) => !m.certificate_url);

  const stats = useMemo(() => ({
    active: members.filter((m) => m.status === "active").length,
    graduated: members.filter((m) => m.status === "completed").length,
    issued: members.filter((m) => m.certificate_url).length,
  }), [members]);

  const setGraduation = async (ids: string[], graduated: boolean) => {
    if (!ids.length) return;
    if (!graduated && !confirm(`Batalkan kelulusan ${ids.length} peserta? Sertifikat yang sudah terbit tidak berlaku lagi dan verifikasinya gagal.`)) return;
    setBusy(graduated ? "graduate" : "revoke");
    const { data, error } = await (supabase as any).rpc("set_graduation", { _enrollment_ids: ids, _graduated: graduated });
    setBusy(null);
    if (error) return toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    toast({ title: graduated ? `${data ?? ids.length} peserta dinyatakan lulus` : `Kelulusan ${data ?? ids.length} peserta dibatalkan` });
    setSel(new Set());
    await onChanged();
  };

  const issue = async (list: Member[], reissue = false) => {
    if (!list.length) return;
    setBusy("issue");
    let ok = 0;
    const failed: { name: string; error: string }[] = [];
    for (let i = 0; i < list.length; i += CHUNK) {
      const part = list.slice(i, i + CHUNK);
      setBusy(`issue:${Math.min(i + CHUNK, list.length)}/${list.length}`);
      const { data, error } = await supabase.functions.invoke("issue-certificate", { body: { enrollment_ids: part.map((m) => m.id), reissue } });
      if (error || (data as { error?: string })?.error) {
        part.forEach((m) => failed.push({ name: m.name, error: (data as { error?: string })?.error || error?.message || "Gagal" }));
        continue;
      }
      ((data as { results: { enrollment_id: string; ok: boolean; skipped?: boolean; error?: string }[] }).results || []).forEach((r) => {
        if (r.ok) ok++;
        else failed.push({ name: list.find((m) => m.id === r.enrollment_id)?.name || r.enrollment_id, error: r.error || "Gagal" });
      });
    }
    setBusy(null);
    if (ok) toast({ title: `${ok} sertifikat ${reissue ? "diterbitkan ulang" : "terbit"}` });
    if (failed.length) setFailures(failed);
    setSel(new Set());
    await onChanged();
  };

  const download = async (m: Member) => {
    if (!m.certificate_url) return;
    const { data, error } = await supabase.storage.from("certificates").createSignedUrl(m.certificate_url, 600);
    if (error || !data) return toast({ title: "Gagal membuka sertifikat", variant: "destructive" });
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const copyLink = async (m: Member) => {
    await navigator.clipboard.writeText(verifyUrl(m.id)).catch(() => {});
    toast({ title: "Link verifikasi disalin" });
  };

  const waText = (m: Member) =>
    `Halo ${m.name.split(" ")[0]}, selamat! Anda dinyatakan LULUS program "${courseTitle}". Sertifikat bisa diunduh di ${window.location.origin}/kursus-saya ` +
    `dan keasliannya dapat dicek di ${verifyUrl(m.id)}`;

  if (!members.length) return <p className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">Belum ada peserta aktif.</p>;

  const issuing = busy?.startsWith("issue");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Masih aktif", value: stats.active },
          { label: "Sudah lulus", value: stats.graduated },
          { label: "Sertifikat terbit", value: stats.issued },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card px-4 py-3">
            <div className="text-2xl font-bold tabular-nums">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground mr-auto">{requirement}</p>
          <Button size="sm" variant="outline" onClick={() => setSel(new Set(eligibleIds))} disabled={!eligibleIds.length}>
            <Check className="h-4 w-4 mr-1.5" />Pilih yang memenuhi syarat ({eligibleIds.length})
          </Button>
        </div>

        {chosen.length > 0 && (
          <div className="sticky top-14 lg:top-0 z-20 px-4 py-3 border-b bg-primary text-primary-foreground flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium mr-auto">{chosen.length} dipilih</span>
            <Button size="sm" variant="gold" disabled={!toGraduate.length || !!busy} onClick={() => setGraduation(toGraduate.map((m) => m.id), true)}>
              {busy === "graduate" ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <GraduationCap className="h-4 w-4 mr-1.5" />}Tandai lulus ({toGraduate.length})
            </Button>
            <Button size="sm" variant="secondary" disabled={!toIssue.length || !!busy}
              onClick={() => (pendingIssue.length ? issue(pendingIssue) : issue(toIssue, true))}>
              {issuing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Award className="h-4 w-4 mr-1.5" />}
              {issuing ? `Menerbitkan ${busy?.split(":")[1] || ""}…` : pendingIssue.length || !toIssue.length ? `Terbitkan sertifikat (${pendingIssue.length})` : `Terbitkan ulang (${toIssue.length})`}
            </Button>
            <Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" disabled={!toRevoke.length || !!busy}
              onClick={() => setGraduation(toRevoke.map((m) => m.id), false)}>
              <Undo2 className="h-4 w-4 mr-1.5" />Batalkan lulus
            </Button>
            <Button size="sm" variant="ghost" className="text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={() => setSel(new Set())}>Batal pilih</Button>
          </div>
        )}

        <ul className="divide-y">
          <li className="hidden md:flex items-center gap-3 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
            <Checkbox checked={sel.size === members.length} onCheckedChange={(v) => setSel(v ? new Set(members.map((m) => m.id)) : new Set())} aria-label="Pilih semua" />
            <span className="flex-1">Peserta</span>
            <span className="w-28 text-right">{metricTitle}</span>
            <span className="w-44">Status</span>
            <span className="w-[150px] text-right">Aksi</span>
          </li>
          {members.map((m) => {
            const met = metrics[m.id];
            const wa = waUrl(m.phone, waText(m));
            return (
              <li key={m.id} className={cn("flex flex-wrap md:flex-nowrap items-center gap-x-3 gap-y-2 px-4 py-3", sel.has(m.id) && "bg-primary/5")}>
                <Checkbox checked={sel.has(m.id)} onCheckedChange={() => toggle(m.id)} aria-label={`Pilih ${m.name}`} />
                <span className="min-w-0 flex-1 basis-[calc(100%-2.5rem)] md:basis-0">
                  <span className="block text-sm font-medium truncate">{m.name}</span>
                  <span className="block text-xs text-muted-foreground font-mono">{m.certificate_number || regCode(m.id)}</span>
                </span>
                <span className="pl-7 md:pl-0 md:w-28 md:text-right">
                  <span className={cn("text-xs font-bold tabular-nums rounded-full px-2 py-0.5",
                    met?.value == null ? "text-muted-foreground" : met.eligible ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                    {met?.label ?? "—"}
                  </span>
                </span>
                <span className="md:w-44 text-xs">
                  {m.certificate_url ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-primary"><Award className="h-3.5 w-3.5" />Sertifikat terbit</span>
                  ) : m.status === "completed" ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><GraduationCap className="h-3.5 w-3.5" />Lulus · belum terbit</span>
                  ) : (
                    <span className="text-muted-foreground">Masih aktif</span>
                  )}
                </span>
                <span className="ml-auto md:ml-0 md:w-[150px] flex md:justify-end gap-1 empty:hidden">
                  {m.certificate_url && (
                    <>
                      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Unduh sertifikat" title="Unduh" onClick={() => download(m)}><Download className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Salin link verifikasi" title="Salin link verifikasi" onClick={() => copyLink(m)}><Link2 className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Terbitkan ulang" title="Terbitkan ulang (mis. setelah nama diperbaiki)" disabled={!!busy} onClick={() => issue([m], true)}><RotateCcw className="h-4 w-4" /></Button>
                    </>
                  )}
                  {m.status === "completed" && wa && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" asChild><a href={wa} target="_blank" rel="noreferrer" aria-label="Kabari via WhatsApp" title="Kabari via WhatsApp"><MessageCircle className="h-4 w-4" /></a></Button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <Dialog open={!!failures} onOpenChange={(v) => !v && setFailures(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sebagian sertifikat belum terbit</DialogTitle>
            <DialogDescription>Periksa catatan berikut lalu coba lagi.</DialogDescription>
          </DialogHeader>
          <ul className="text-sm space-y-1.5 max-h-[50vh] overflow-y-auto">
            {failures?.map((f, i) => <li key={i}><b>{f.name}</b>: {f.error}</li>)}
          </ul>
          <DialogFooter><Button onClick={() => setFailures(null)}>Tutup</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GraduationPanel;
