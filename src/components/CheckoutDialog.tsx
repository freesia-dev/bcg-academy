import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Building2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  course: { id: string; title: string; price: number };
  userId: string;
  onSuccess: () => void;
}

const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

const CheckoutDialog = ({ open, onOpenChange, course, userId, onSuccess }: Props) => {
  const { toast } = useToast();
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [method, setMethod] = useState("Transfer Bank");
  const [amount, setAmount] = useState(course.price);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.from("site_content").select("value").eq("key", "payment_info").maybeSingle()
      .then(({ data }) => setPaymentInfo(data?.value || null));
    setAmount(course.price);
  }, [open, course.price]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast({ title: "Bukti pembayaran wajib diunggah", variant: "destructive" });
    if (file.size > 5 * 1024 * 1024) return toast({ title: "File maksimal 5MB", variant: "destructive" });

    setSubmitting(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${course.id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, file);
    if (upErr) {
      setSubmitting(false);
      return toast({ title: "Gagal upload bukti", description: upErr.message, variant: "destructive" });
    }

    const { error: insErr } = await supabase.from("enrollments").insert({
      user_id: userId,
      course_id: course.id,
      status: "pending_payment",
      payment_method: method,
      payment_proof_url: path,
      payment_amount: amount,
      paid_at: new Date().toISOString(),
    });
    if (insErr) {
      setSubmitting(false);
      return toast({ title: "Gagal mendaftar", description: insErr.message, variant: "destructive" });
    }

    // Notify admin (best-effort, non-blocking)
    supabase.functions.invoke("notify-payment", { body: { course_id: course.id, course_title: course.title, amount } }).catch(() => {});

    setSubmitting(false);
    toast({ title: "Pembayaran terkirim", description: "Admin akan verifikasi maksimal 1×24 jam." });
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pembayaran Kursus</DialogTitle>
          <DialogDescription>{course.title}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-secondary/40 p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-bold text-gold text-lg">{formatRp(course.price)}</span></div>
          {paymentInfo && (
            <div className="pt-2 border-t space-y-1">
              <div className="flex items-center gap-2 font-semibold"><Building2 size={14} />{paymentInfo.bank_name}</div>
              <p className="font-mono text-base">{paymentInfo.account_number}</p>
              <p className="text-xs text-muted-foreground">a.n. {paymentInfo.account_holder}</p>
              {paymentInfo.instructions && <p className="text-xs text-muted-foreground pt-1">{paymentInfo.instructions}</p>}
            </div>
          )}
        </div>

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
          <Button type="submit" variant="gold" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Kirim Pembayaran
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutDialog;
