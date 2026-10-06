import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import Seo from "@/components/site/Seo";

const NotFound = () => (
  <div className="min-h-screen flex flex-col">
    <Seo title="Halaman tidak ditemukan" noindex />
    <Header />
    <main className="flex flex-1 items-center justify-center px-4 pt-[120px] pb-20">
      <div className="text-center max-w-md">
        <Compass className="mx-auto h-12 w-12 text-gold-dark" />
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-gold-dark">Halaman tidak ditemukan</p>
        <h1 className="mt-2 text-3xl font-extrabold text-primary">Sepertinya Anda tersesat</h1>
        <p className="mt-3 text-muted-foreground">Halaman yang Anda cari sudah dipindah atau tidak ada. Coba mulai dari beranda atau lihat daftar program.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild variant="outline"><Link to="/">Ke beranda</Link></Button>
          <Button asChild><Link to="/kursus">Lihat program</Link></Button>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default NotFound;
