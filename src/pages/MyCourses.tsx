import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, PlayCircle, Loader2, Clock, Award } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMyEnrollments } from "@/hooks/useEnrollments";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const statusLabel: Record<string, string> = {
  pending_payment: "Menunggu Verifikasi",
  active: "Aktif",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  rejected: "Ditolak",
};

const MyCourses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { enrollments, loading } = useMyEnrollments(user?.id);

  const filtered = (statuses: string[]) => enrollments.filter((e) => statuses.includes(e.status));

  const card = (e: any) => (
    <Card key={e.id} className="overflow-hidden hover:shadow-strong transition-all">
      <div className="aspect-video bg-gradient-to-br from-gold/20 to-corporate-blue/20 flex items-center justify-center">
        {e.course?.cover_image ? <img src={e.course.cover_image} alt="" className="w-full h-full object-cover" /> : <GraduationCap className="h-12 w-12 text-gold/40" />}
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant={e.status === "active" ? "default" : "secondary"} className={e.status === "active" ? "bg-gold text-primary" : ""}>{statusLabel[e.status]}</Badge>
          <Badge variant="outline" className="text-xs">{e.course?.type === "online" ? "Online" : "Offline"}</Badge>
        </div>
        <h3 className="font-bold text-primary line-clamp-2">{e.course?.title}</h3>
        {e.course?.duration && <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={12} />{e.course.duration}</p>}
        {e.status === "active" || e.status === "completed" ? (
          <div className="space-y-2">
            <Button variant="gold" className="w-full" onClick={() => navigate(`/learn/${e.course.slug}`)}><PlayCircle size={16} className="mr-2" />{e.status === "completed" ? "Lihat Materi" : "Mulai Belajar"}</Button>
            {e.certificate_url && (
              <Button variant="outline" className="w-full" onClick={async () => {
                const { data, error } = await supabase.storage.from("certificates").createSignedUrl(e.certificate_url!, 60 * 60);
                if (error || !data?.signedUrl) { toast.error("Gagal membuka sertifikat"); return; }
                window.open(data.signedUrl, "_blank");
              }}><Award size={16} className="mr-2" />Unduh Sertifikat</Button>
            )}
          </div>
        ) : e.status === "pending_payment" ? (
          <p className="text-xs text-muted-foreground text-center py-2">Admin sedang memverifikasi pembayaran Anda.</p>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => navigate(`/kursus/${e.course?.slug}`)}>Lihat Detail</Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-primary mb-2">Kursus <span className="text-gradient">Saya</span></h1>
          <p className="text-muted-foreground mb-8">Lanjutkan belajar dan pantau status pendaftaran Anda.</p>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div>
          ) : enrollments.length === 0 ? (
            <Card><CardContent className="p-12 text-center space-y-4">
              <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground">Anda belum mendaftar kursus apapun.</p>
              <Button variant="gold" onClick={() => navigate("/kursus")}>Jelajahi Katalog</Button>
            </CardContent></Card>
          ) : (
            <Tabs defaultValue="active">
              <TabsList>
                <TabsTrigger value="active">Aktif ({filtered(["active"]).length})</TabsTrigger>
                <TabsTrigger value="pending">Menunggu ({filtered(["pending_payment"]).length})</TabsTrigger>
                <TabsTrigger value="completed">Selesai ({filtered(["completed"]).length})</TabsTrigger>
              </TabsList>
              <TabsContent value="active" className="mt-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{filtered(["active"]).map(card)}</div>
                {filtered(["active"]).length === 0 && <p className="text-center text-muted-foreground py-12">Tidak ada kursus aktif.</p>}
              </TabsContent>
              <TabsContent value="pending" className="mt-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{filtered(["pending_payment"]).map(card)}</div>
                {filtered(["pending_payment"]).length === 0 && <p className="text-center text-muted-foreground py-12">Tidak ada yang menunggu verifikasi.</p>}
              </TabsContent>
              <TabsContent value="completed" className="mt-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{filtered(["completed"]).map(card)}</div>
                {filtered(["completed"]).length === 0 && <p className="text-center text-muted-foreground py-12">Belum ada kursus yang selesai.</p>}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MyCourses;
