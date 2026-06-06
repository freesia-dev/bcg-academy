import { Link, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Construction } from "lucide-react";

const Learn = () => {
  const { slug } = useParams();
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card>
            <CardContent className="p-12 text-center space-y-4">
              <Construction className="h-16 w-16 mx-auto text-gold" />
              <h1 className="text-2xl font-bold text-primary">Portal Belajar Segera Hadir</h1>
              <p className="text-muted-foreground">
                Anda terdaftar di kursus <code className="text-gold">{slug}</code>. Player video, materi lengkap, dan uji kompetensi sedang dipersiapkan.
              </p>
              <div className="flex gap-2 justify-center">
                <Link to="/kursus-saya"><Button variant="outline">Kursus Saya</Button></Link>
                <Link to={`/kursus/${slug}`}><Button variant="gold">Lihat Silabus</Button></Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Learn;
