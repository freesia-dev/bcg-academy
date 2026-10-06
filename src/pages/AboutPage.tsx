import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/site/PageHeader";
import About from "@/components/About";
import Offer from "@/components/Offer";
import Team from "@/components/Team";
import Gallery from "@/components/Gallery";
import CtaBand from "@/components/CtaBand";
import { useSiteConfig } from "@/hooks/useSiteConfig";

const AboutPage = () => {
  const { brand } = useSiteConfig();
  return (
    <div className="min-h-screen">
      <Header />
      <PageHeader crumbs={[{ label: "Tentang Kami" }]} title={`Tentang ${brand.name}`}
        subtitle="Lembaga pelatihan kerja di Bontang yang membekali peserta dengan keterampilan siap kerja dan siap berwirausaha." />
      <main>
        <About />
        <Offer />
        <Team />
        <Gallery />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
};

export default AboutPage;
