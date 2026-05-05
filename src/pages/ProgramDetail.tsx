import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Users, Award, ArrowLeft, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ProgramRegistrationDialog from "@/components/ProgramRegistrationDialog";
import type { Program } from "@/hooks/usePrograms";

const ProgramDetail = () => {
  const { slug } = useParams();
  const [program, setProgram] = useState<Program | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    supabase.from("programs").select("*").eq("slug", slug).maybeSingle().then(({ data }) => {
      setProgram(data as Program | null);
      setLoading(false);
    });
  }, [slug]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link to="/program-pelatihan"><Button variant="ghost" className="mb-6"><ArrowLeft className="mr-2 h-4 w-4" />Semua Program</Button></Link>

          {loading ? (
            <p className="text-muted-foreground">Memuat...</p>
          ) : !program ? (
            <p className="text-muted-foreground">Program tidak ditemukan.</p>
          ) : (
            <Card className="overflow-hidden">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Badge variant="secondary" className={`bg-${program.color}/10 text-${program.color} border-${program.color}/20`}>{program.level}</Badge>
                  <div className={`w-3 h-3 rounded-full bg-${program.color}`}></div>
                </div>
                <h1 className="text-4xl font-bold text-primary">{program.title}</h1>
                <p className="text-lg text-muted-foreground leading-relaxed">{program.description}</p>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/40">
                    <Clock className="text-gold" /><div><div className="text-sm text-muted-foreground">Durasi</div><div className="font-semibold">{program.duration}</div></div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/40">
                    <Users className="text-gold" /><div><div className="text-sm text-muted-foreground">Kapasitas</div><div className="font-semibold">{program.capacity}</div></div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/40">
                    <Award className="text-gold" /><div><div className="text-sm text-muted-foreground">Sertifikat</div><div className="font-semibold">BNSP</div></div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-primary mb-3">Yang Akan Dipelajari</h3>
                  <ul className="space-y-2">
                    {program.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2"><CheckCircle className="text-gold mt-0.5 flex-shrink-0" size={20} /><span>{h}</span></li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-3 flex-wrap pt-4">
                  <Button variant="gold" size="lg" onClick={() => setOpen(true)}>Daftar Program Ini</Button>
                  <Button variant="outline" size="lg" onClick={() => window.open('https://wa.me/6282254187096', '_blank')}>Konsultasi via WhatsApp</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
      {program && <ProgramRegistrationDialog open={open} onOpenChange={setOpen} programTitle={program.title} />}
    </div>
  );
};

export default ProgramDetail;
