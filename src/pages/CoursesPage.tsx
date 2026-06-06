import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Users, GraduationCap, Loader2 } from "lucide-react";
import { useCourses } from "@/hooks/useCourses";

const formatPrice = (p: number, free: boolean) => free || p === 0 ? "Gratis" : `Rp ${p.toLocaleString("id-ID")}`;

const CoursesPage = () => {
  const [type, setType] = useState<"all" | "online" | "offline">("all");
  const [price, setPrice] = useState<"all" | "free" | "paid">("all");
  const { courses, loading } = useCourses({
    type: type === "all" ? undefined : type,
    free: price === "all" ? undefined : price === "free",
  });

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h1 className="text-4xl font-bold text-primary mb-3">Katalog <span className="text-gradient">Kursus</span></h1>
            <p className="text-muted-foreground">Pilih kursus online atau pelatihan offline sesuai minat & tujuan karir Anda.</p>
          </div>

          <div className="flex flex-wrap gap-4 justify-center mb-10">
            <Tabs value={type} onValueChange={(v) => setType(v as any)}>
              <TabsList>
                <TabsTrigger value="all">Semua</TabsTrigger>
                <TabsTrigger value="online">Online</TabsTrigger>
                <TabsTrigger value="offline">Offline</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={price} onValueChange={(v) => setPrice(v as any)}>
              <TabsList>
                <TabsTrigger value="all">Semua Harga</TabsTrigger>
                <TabsTrigger value="free">Gratis</TabsTrigger>
                <TabsTrigger value="paid">Berbayar</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div>
          ) : courses.length === 0 ? (
            <p className="text-center text-muted-foreground py-20">Belum ada kursus yang sesuai filter.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((c) => (
                <Card key={c.id} className="overflow-hidden hover:shadow-strong hover:-translate-y-1 transition-all group">
                  <div className="aspect-video bg-gradient-to-br from-gold/20 to-corporate-blue/20 flex items-center justify-center relative">
                    {c.cover_image ? (
                      <img src={c.cover_image} alt={c.title} className="w-full h-full object-cover" />
                    ) : (
                      <GraduationCap className="h-16 w-16 text-gold/40" />
                    )}
                    <Badge className="absolute top-3 left-3 bg-background/90 text-foreground">{c.type === "online" ? "Online" : "Offline"}</Badge>
                    <Badge className="absolute top-3 right-3 bg-gold text-primary font-bold">{formatPrice(c.price, c.is_free)}</Badge>
                  </div>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline">{c.level}</Badge>
                      {c.category && <Badge variant="outline">{c.category}</Badge>}
                    </div>
                    <h3 className="text-lg font-bold text-primary group-hover:text-gold transition-colors line-clamp-2 min-h-[3.5rem]">{c.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">{c.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {c.duration && <span className="flex items-center gap-1"><Clock size={12} />{c.duration}</span>}
                      {c.capacity && <span className="flex items-center gap-1"><Users size={12} />{c.capacity}</span>}
                    </div>
                    <Link to={`/kursus/${c.slug}`}>
                      <Button variant="gold" className="w-full">Lihat Detail</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CoursesPage;
