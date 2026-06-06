import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Building2, Zap } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  course: { id: string; title: string; price: number };
  userId: string;
  onSuccess: () => void;
}

const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

declare global { interface Window { snap?: any } }

const loadSnap = (clientKey: string, isProd: boolean) =>
  new Promise<void>((resolve, reject) => {
    if (window.snap) return resolve();
    const src = isProd ? "https://app.midtrans.com/snap/snap.js" : "https://app.sandbox.midtrans.com/snap/snap.js";
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) { existing.addEventListener("load", () => resolve()); return; }
    const s = document.createElement("script");
    s.src = src; s.setAttribute("data-client-key", clientKey);
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Gagal memuat Midtrans"));
    document.body.appendChild(s);
  });

const CheckoutDialog = ({ open, onOpenChange, course, userId, onSuccess }: Props) => {
  const { toast } = useToast();
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [method, setMethod] = useState("Transfer Bank");
  const [amount, setAmount] = useState(course.price);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [midtransLoading, setMidtransLoading] = useState(false);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (!open) return;
    supabase.from("site_content").select("value").eq("key", "payment_info").maybeSingle()
      .then(({ data }) => setPaymentInfo(data?.value || null));
    setAmount(course.price);
  }, [open, course.price]);

  const handleMidtrans = async () => {
    setMidtransLoading(true);
    const { data, error } = await supabase.functions.invoke("midtrans-create-transaction", {
      body: { course_id: course.id },
    });
    if (error || (data as any)?.error) {
      setMidtransLoading(false);
      return toast({ title: "Midtrans gagal", description: (data as any)?.error || error?.message, variant: "destructive" });
    }
    try {
      await loadSnap((data as any).client_key, !!(data as any).is_production);
      window.snap.pay((data as any).token, {
        onSuccess: () => { toast({ title: "Pembayaran berhasil" }); onSuccessRef.current(); onOpenChange(false); },
        onPending: () => { toast({ title: "Menunggu pembayaran", description: "Status akan diperbarui setelah pembayaran masuk." }); onSuccessRef.current(); onOpenChange(false); },
        onError: () => toast({ title: "Pembayaran gagal", variant: "destructive" }),
        onClose: () => {},
      });
    } catch (e: any) {
      toast({ title: "Snap gagal dimuat", description: e.message, variant: "destructive" });
    }
    setMidtransLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast({ title: "Bukti pembayaran wajib diunggah", variant: "destructive" });
    if (file.size > 5 * 1024 * 1024) return toast({ title: "File maksimal 5MB", variant: "destructive" });

    setSubmitting(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${course.id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, file);
    if (upErr) { setSubmitting(false); return toast({ title: "Gagal upload bukti", description: upErr.message, variant: "destructive" }); }

    const { error: insErr } = await supabase.from("enrollments").insert({
      user_id: userId, course_id: course.id, status: "pending_payment",
      payment_method: method, payment_proof_url: path, payment_amount: amount, paid_at: new Date().toISOString(),
    });
    if (insErr) { setSubmitting(false); return toast({ title: "Gagal mendaftar", description: insErr.message, variant: "destructive" }); }

    supabase.functions.invoke("notify-payment", { body: { course_id: course.id, course_title: course.title, amount } }).catch(() => {});
    setSubmitting(false);
    toast({ title: "Pembayaran terkirim", description: "Admin akan verifikasi maksimal 1×24 jam." });
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pembayaran Kursus</DialogTitle>
          <DialogDescription>{course.title}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-secondary/40 p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-bold text-gold text-lg">{formatRp(course.price)}</span></div>
        </div>

        <Button variant="gold" className="w-full" disabled={midtransLoading || course.price <= 0} onClick={handleMidtrans}>
          {midtransLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
          Bayar Otomatis (QRIS / VA / E-Wallet)
        </Button>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">atau transfer manual</span></div>
        </div>

        {paymentInfo && (
          <div className="rounded-lg border bg-secondary/40 p-4 space-y-1 text-sm">
            <div className="flex items-center gap-2 font-semibold"><Building2 size={14} />{paymentInfo.bank_name}</div>
            <p className="font-mono text-base">{paymentInfo.account_number}</p>
            <p className="text-xs text-muted-foreground">a.n. {paymentInfo.account_holder}</p>
            {paymentInfo.instructions && <p className="text-xs text-muted-foreground pt-1">{paymentInfo.instructions}</p>}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Metode Pembayaran</Label>
            <select className="w-full p-2 border rounded-md bg-background" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option>Transfer Bank</option>
              <option>QRIS</option>
              <option>E-Wallet (GoPay/OVO/Dana)</option>
            </select>
          </div>
          <div>
            <Label>Nominal Transfer (Rp)</Label>
            <Input type="number" required value={amount} onChange={(e) => setAmount(parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <Label>Bukti Transfer (max 5MB)</Label>
            <Input type="file" accept="image/*,application/pdf" required onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <Button type="submit" variant="outline" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Kirim Bukti Transfer Manual
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutDialog;
