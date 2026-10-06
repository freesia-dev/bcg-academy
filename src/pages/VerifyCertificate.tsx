import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { BadgeCheck, Loader2, SearchX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Result { participant: string; course_title: string; issued_at: string | null; cert_code: string }

const VerifyCertificate = () => {
  const { code } = useParams();
  const navigate = useNavigate();
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

  useEffect(() => { if (code) check(decodeURIComponent(code)); /* eslint-disable-next-line */ }, [code]);

  return (
    <div className="min-h-screen">
      <Header />
      <PageHeader crumbs={[{ label: "Verifikasi Sertifikat" }]} title="Verifikasi Sertifikat"
        subtitle="Masukkan nomor sertifikat (contoh: LPK-BCG/2026/AB12CD34) untuk memastikan keasliannya." />
      <main className="py-10 md:py-14">
        <div className="container mx-auto px-4 max-w-xl space-y-6">

          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); navigate(`/verifikasi/${encodeURIComponent(input.trim())}`); }}>
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Nomor sertifikat" className="h-11 bg-card" aria-label="Nomor sertifikat" />
            <Button type="submit" className="h-11" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Periksa"}</Button>
          </form>

          {result && (
            <Card className="border-green-600/30 bg-green-500/5">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-2 text-green-700 font-semibold"><BadgeCheck className="h-5 w-5" />Sertifikat valid</div>
                <dl className="text-sm space-y-2">
                  <div><dt className="text-muted-foreground">Nama peserta</dt><dd className="font-semibold text-base">{result.participant}</dd></div>
                  <div><dt className="text-muted-foreground">Kursus</dt><dd className="font-semibold">{result.course_title}</dd></div>
                  {result.issued_at && <div><dt className="text-muted-foreground">Diterbitkan</dt><dd>{new Date(result.issued_at).toLocaleDateString("id-ID", { dateStyle: "long" })}</dd></div>}
                  <div><dt className="text-muted-foreground">Kode</dt><dd className="font-mono">{result.cert_code}</dd></div>
                </dl>
              </CardContent>
            </Card>
          )}
          {result === null && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-6 flex items-center gap-3 text-destructive">
                <SearchX className="h-5 w-5" />Nomor sertifikat tidak ditemukan. Periksa kembali penulisannya.
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default VerifyCertificate;
