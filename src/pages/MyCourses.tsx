import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
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

  const [pct, setPct] = useState<Record<string, number>>({});

  useEffect(() => {
    const live = enrollments.filter((e) => e.status === "active" || e.status === "completed");
    if (!user || live.length === 0) return;
    (async () => {
      const courseIds = live.map((e) => e.course_id);
      const { data: mods } = await supabase.from("modules").select("id,course_id").in("course_id", courseIds);
      const modIds = (mods || []).map((m: any) => m.id);
      if (!modIds.length) return;
      const [{ data: les }, { data: prog }] = await Promise.all([
        (supabase as any).from("lesson_outline").select("id,module_id").in("module_id", modIds),
        supabase.from("lesson_progress").select("lesson_id").eq("user_id", user.id),
      ]);
      const done = new Set((prog || []).map((p: any) => p.lesson_id));
      const modCourse: Record<string, string> = Object.fromEntries((mods || []).map((m: any) => [m.id, m.course_id]));
      const tot: Record<string, number> = {}, dn: Record<string, number> = {};
      (les || []).forEach((l: any) => {
        const c = modCourse[l.module_id];
        tot[c] = (tot[c] || 0) + 1;
        if (done.has(l.id)) dn[c] = (dn[c] || 0) + 1;
      });
      setPct(Object.fromEntries(courseIds.map((c) => [c, tot[c] ? Math.round(((dn[c] || 0) / tot[c]) * 100) : 0])));
    })();
  }, [enrollments, user]);

  const filtered = (statuses: string[]) => enrollments.filter((e) => statuses.includes(e.status));

  const card = (e: any) => (
    <Card key={e.id} className="overflow-hidden hover:shadow-strong transition-all">
      <div className="aspect-video bg-gradient-to-br from-gold/20 to-corporate-blue/20 flex items-center justify-center">
        {e.course?.cover_image ? <img src={e.course.cover_image} alt="" className="w-full h-full object-cover" /> : <GraduationCap className="h-12 w-12 text-gold/40" />}
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant={e.status === "rejected" ? "destructive" : e.status === "active" ? "default" : "secondary"} className={e.status === "active" ? "bg-gold text-primary" : ""}>{statusLabel[e.status]}</Badge>
          <Badge variant="outline" className="text-xs">{e.course?.type === "online" ? "Online" : "Offline"}</Badge>
        </div>
        <h3 className="font-bold text-primary line-clamp-2">{e.course?.title}</h3>
        {e.course?.duration && <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={12} />{e.course.duration}</p>}
        {e.status === "active" || e.status === "completed" ? (
          <div className="space-y-2">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground"><span>Progres belajar</span><span>{pct[e.course_id] ?? 0}%</span></div>
              <Progress value={pct[e.course_id] ?? 0} className="h-1.5" />
            </div>
            <Button variant="gold" className="w-full" onClick={() => navigate(`/learn/${e.course.slug}`)}><PlayCircle size={16} className="mr-2" />{e.status === "completed" ? "Lihat Materi" : (pct[e.course_id] ?? 0) > 0 ? "Lanjut Belajar" : "Mulai Belajar"}</Button>
            {e.certificate_url && (
              <Button variant="outline" className="w-full" onClick={async () => {
                const { data, error } = await supabase.storage.from("certificates").createSignedUrl(e.certificate_url!, 60 * 60);
                if (error || !data?.signedUrl) { toast.error("Gagal membuka sertifikat"); return; }
                window.open(data.signedUrl, "_blank");
              }}><Award size={16} className="mr-2" />Unduh Sertifikat</Button>
            )}
          </div>
        ) : e.status === "pending_payment" ? (
          <p className="text-xs text-muted-foreground text-center py-2">Admin sedang memverifikasi pembayaran Anda (maks. 1×24 jam). Kursus terbuka otomatis setelah disetujui.</p>
        ) : e.status === "rejected" ? (
          <div className="space-y-2">
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs">
              <p className="font-semibold text-destructive">Pembayaran belum dapat diverifikasi</p>
              {e.notes && <p className="text-muted-foreground mt-0.5">{e.notes}</p>}
            </div>
            <Button variant="gold" className="w-full" onClick={() => navigate(`/kursus/${e.course?.slug}`)}>Kirim Ulang Bukti</Button>
          </div>
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
            <Tabs defaultValue={filtered(["active"]).length ? "active" : filtered(["pending_payment", "rejected"]).length ? "pending" : filtered(["completed"]).length ? "completed" : "active"}>
              <TabsList>
                <TabsTrigger value="active">Aktif ({filtered(["active"]).length})</TabsTrigger>
                <TabsTrigger value="pending">Menunggu / Perlu Tindakan ({filtered(["pending_payment", "rejected"]).length})</TabsTrigger>
                <TabsTrigger value="completed">Selesai ({filtered(["completed"]).length})</TabsTrigger>
              </TabsList>
              <TabsContent value="active" className="mt-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{filtered(["active"]).map(card)}</div>
                {filtered(["active"]).length === 0 && <p className="text-center text-muted-foreground py-12">Tidak ada kursus aktif.</p>}
              </TabsContent>
              <TabsContent value="pending" className="mt-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{filtered(["pending_payment", "rejected"]).map(card)}</div>
                {filtered(["pending_payment", "rejected"]).length === 0 && <p className="text-center text-muted-foreground py-12">Tidak ada yang menunggu verifikasi.</p>}
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
