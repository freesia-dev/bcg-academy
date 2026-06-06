import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCourse } from "@/hooks/useCourses";
import { useAuth } from "@/hooks/useAuth";
import { useMyEnrollment } from "@/hooks/useEnrollments";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Users, GraduationCap, Lock, PlayCircle, FileText, BookOpen, Loader2, CheckCircle2 } from "lucide-react";
import CheckoutDialog from "@/components/CheckoutDialog";

const formatPrice = (p: number, free: boolean) => free || p === 0 ? "Gratis" : `Rp ${p.toLocaleString("id-ID")}`;

const CourseDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { course, modules, loading } = useCourse(slug);
  const { user } = useAuth();
  const { enrollment, refetch } = useMyEnrollment(user?.id, course?.id);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div>;
  if (!course) return <div className="min-h-screen flex items-center justify-center"><p>Kursus tidak ditemukan. <Link to="/kursus" className="text-gold underline">Kembali</Link></p></div>;

  const isFree = course.is_free || course.price === 0;
  const isActive = enrollment?.status === "active" || enrollment?.status === "completed";
  const isPending = enrollment?.status === "pending_payment";

  const handleEnrollFree = async () => {
    if (!user) return navigate(`/auth?redirect=/kursus/${slug}`);
    setEnrolling(true);
    const { error } = await supabase.from("enrollments").insert({
      user_id: user.id, course_id: course.id, status: "active", payment_amount: 0,
    });
    setEnrolling(false);
    if (error) return toast({ title: "Gagal mendaftar", description: error.message, variant: "destructive" });
    toast({ title: "Berhasil mendaftar!", description: "Anda bisa langsung mulai belajar." });
    refetch();
  };

  const renderActionButton = () => {
    if (!user) return <Button variant="gold" size="lg" className="w-full" onClick={() => navigate(`/auth?redirect=/kursus/${slug}`)}>Masuk untuk Daftar</Button>;
    if (isActive) return <Button variant="gold" size="lg" className="w-full" onClick={() => navigate(`/learn/${slug}`)}><PlayCircle className="mr-2" />Mulai Belajar</Button>;
    if (isPending) return <Button disabled size="lg" className="w-full"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menunggu Verifikasi Admin</Button>;
    if (enrollment?.status === "rejected") return <Button variant="destructive" size="lg" className="w-full" disabled>Pembayaran Ditolak — Hubungi Admin</Button>;
    if (isFree) return <Button variant="gold" size="lg" className="w-full" onClick={handleEnrollFree} disabled={enrolling}>{enrolling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Daftar Sekarang (Gratis)</Button>;
    return <Button variant="gold" size="lg" className="w-full" onClick={() => setCheckoutOpen(true)}>Beli Kursus — {formatPrice(course.price, false)}</Button>;
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="secondary">{course.type === "online" ? "Online" : "Offline"}</Badge>
                  <Badge variant="outline">{course.level}</Badge>
                  {course.category && <Badge variant="outline">{course.category}</Badge>}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-primary mb-3">{course.title}</h1>
                <p className="text-lg text-muted-foreground leading-relaxed">{course.description}</p>
              </div>

              <div className="aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-gold/20 to-corporate-blue/20 flex items-center justify-center">
                {course.cover_image ? <img src={course.cover_image} alt={course.title} className="w-full h-full object-cover" /> : <GraduationCap className="h-24 w-24 text-gold/40" />}
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2"><BookOpen className="text-gold" />Silabus Kursus</h2>
                {modules.length === 0 ? (
                  <p className="text-muted-foreground italic">Silabus akan diumumkan segera.</p>
                ) : (
                  <div className="space-y-3">
                    {modules.map((m, i) => (
                      <Card key={m.id}>
                        <CardContent className="p-4">
                          <h3 className="font-bold text-primary mb-2">Modul {i + 1}: {m.title}</h3>
                          {m.description && <p className="text-sm text-muted-foreground mb-3">{m.description}</p>}
                          <ul className="space-y-2">
                            {(m.lessons || []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((l: any) => {
                              const locked = !isActive && !l.is_preview;
                              return (
                                <li key={l.id} className="flex items-center gap-2 text-sm">
                                  {locked ? <Lock size={14} className="text-muted-foreground" /> : l.content_type === "video" ? <PlayCircle size={14} className="text-gold" /> : <FileText size={14} className="text-gold" />}
                                  <span className={locked ? "text-muted-foreground" : ""}>{l.title}</span>
                                  {l.is_preview && <Badge variant="outline" className="text-xs ml-auto">Preview</Badge>}
                                  {l.duration_min && <span className="text-xs text-muted-foreground ml-auto">{l.duration_min} mnt</span>}
                                </li>
                              );
                            })}
                          </ul>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-32">
                <CardContent className="p-6 space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gold mb-1">{formatPrice(course.price, isFree)}</div>
                    {!isFree && <p className="text-xs text-muted-foreground">Sekali bayar, akses selamanya</p>}
                  </div>

                  {renderActionButton()}

                  <div className="space-y-2 pt-4 border-t text-sm">
                    {course.duration && <div className="flex items-center gap-2"><Clock size={16} className="text-muted-foreground" />Durasi: {course.duration}</div>}
                    {course.capacity && <div className="flex items-center gap-2"><Users size={16} className="text-muted-foreground" />Kapasitas: {course.capacity}</div>}
                    {course.instructor_name && <div className="flex items-center gap-2"><GraduationCap size={16} className="text-muted-foreground" />Instruktur: {course.instructor_name}</div>}
                    <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-gold" />Sertifikat BNSP</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {user && course && (
        <CheckoutDialog
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          course={{ id: course.id, title: course.title, price: course.price }}
          userId={user.id}
          onSuccess={refetch}
        />
      )}
    </div>
  );
};

export default CourseDetail;
