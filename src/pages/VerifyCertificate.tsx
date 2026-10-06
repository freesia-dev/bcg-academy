import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BadgeCheck, CalendarDays, GraduationCap, Hash, Loader2, QrCode, SearchX, ShieldCheck, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { formatDateRange } from "@/lib/batches";

interface Result {
  participant: string; course_title: string; issued_at: string | null; cert_code: string;
  cert_number: string | null; batch_name: string | null; batch_start: string | null; batch_end: string | null;
}

const longDate = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

const VerifyCertificate = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { brand } = useSiteConfig();
  const [input, setInput] = useState(code ? decodeURIComponent(code) : "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null | undefined>(undefined);

  const check = async (c: string) => {
    if (!c.trim()) return;
    setLoading(true);
    const { data } = await (supabase as any).rpc("verify_certificate", { _code: c.trim() });
    setResult(Array.isArray(data) && data.length ? (data[0] as Result) : null);
    setLoading(false);
  };

  useEffect(() => {
    if (code) { setInput(decodeURIComponent(code)); check(decodeURIComponent(code)); }
    else setResult(undefined);
  }, [code]);

  return (
    <div className="min-h-screen">
      <Header />
      <PageHeader crumbs={[{ label: "Verifikasi Sertifikat" }]} title="Verifikasi sertifikat"
        subtitle={`Pastikan sertifikat benar diterbitkan oleh ${brand.name}. Pindai QR pada sertifikat atau ketik nomornya.`} />
      <main className="py-10 md:py-14">
        <div className="container mx-auto px-4 max-w-2xl space-y-6">
          <form className="flex flex-col sm:flex-row gap-2" onSubmit={(e) => { e.preventDefault(); if (input.trim()) navigate(`/verifikasi/${encodeURIComponent(input.trim())}`); }}>
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Contoh: LPK-BCG/2026/AB12CD34 atau AB12CD34"
              className="h-12 bg-card text-base" aria-label="Nomor sertifikat" />
            <Button type="submit" size="lg" disabled={loading || !input.trim()}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Periksa"}</Button>
          </form>

          {loading && result === undefined && (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          )}

          {result && (
            <article className="overflow-hidden rounded-2xl border border-emerald-600/30 bg-card shadow-sm">
              <div className="bg-emerald-600 text-white px-6 py-4 flex items-center gap-3">
                <BadgeCheck className="h-7 w-7 shrink-0" />
                <div>
                  <p className="font-bold text-lg leading-tight">Sertifikat asli & berlaku</p>
                  <p className="text-sm text-white/85">Terdaftar di sistem {brand.name}</p>
                </div>
              </div>
              <dl className="p-6 grid sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2 flex gap-3">
                  <UserRound className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div><dt className="text-xs text-muted-foreground">Nama peserta</dt><dd className="text-xl font-bold text-primary">{result.participant}</dd></div>
                </div>
                <div className="sm:col-span-2 flex gap-3">
                  <GraduationCap className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Program pelatihan</dt>
                    <dd className="font-semibold">{result.course_title}</dd>
                    {result.batch_name && (
                      <dd className="text-sm text-muted-foreground">{result.batch_name}{result.batch_start ? ` · ${formatDateRange(result.batch_start, result.batch_end)}` : ""}</dd>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div><dt className="text-xs text-muted-foreground">Nomor sertifikat</dt><dd className="font-mono text-sm font-semibold break-all">{result.cert_number || result.cert_code}</dd></div>
                </div>
                {result.issued_at && (
                  <div className="flex gap-3">
                    <CalendarDays className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div><dt className="text-xs text-muted-foreground">Tanggal terbit</dt><dd className="font-semibold">{longDate(result.issued_at)}</dd></div>
                  </div>
                )}
              </dl>
              <p className="px-6 pb-6 text-xs text-muted-foreground">
                Pastikan nama dan program di atas sama dengan yang tertulis pada sertifikat. Ragu? Hubungi kami di{" "}
                <a href={`https://wa.me/${brand.whatsapp}`} className="underline underline-offset-2" target="_blank" rel="noreferrer">WhatsApp</a>.
              </p>
            </article>
          )}

          {result === null && !loading && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 flex gap-3">
              <SearchX className="h-6 w-6 text-destructive shrink-0" />
              <div>
                <p className="font-semibold text-destructive">Sertifikat tidak ditemukan</p>
                <p className="text-sm text-muted-foreground mt-1">Periksa kembali penulisan nomornya. Sertifikat yang dicabut juga tidak akan muncul. Bila yakin sertifikat ini asli, hubungi admin {brand.name}.</p>
              </div>
            </div>
          )}

          {result === undefined && !loading && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl border bg-card p-4 flex gap-3">
                <QrCode className="h-6 w-6 text-gold-dark shrink-0" />
                <p className="text-sm text-muted-foreground"><b className="text-foreground">Pindai QR</b> di pojok kiri bawah sertifikat dengan kamera HP. Halaman ini terbuka otomatis.</p>
              </div>
              <div className="rounded-xl border bg-card p-4 flex gap-3">
                <ShieldCheck className="h-6 w-6 text-gold-dark shrink-0" />
                <p className="text-sm text-muted-foreground"><b className="text-foreground">Untuk HRD:</b> nomor sertifikat cukup diketik, tanpa perlu akun atau login.</p>
              </div>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Ingin punya sertifikat sendiri? <Link to="/kursus" className="font-semibold text-primary underline underline-offset-4">Lihat program pelatihan</Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default VerifyCertificate;
