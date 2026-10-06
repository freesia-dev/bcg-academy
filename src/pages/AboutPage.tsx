import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/site/PageHeader";
import Seo from "@/components/site/Seo";
import Credentials from "@/components/site/Credentials";
import About from "@/components/About";
import Offer from "@/components/Offer";
import Steps from "@/components/Steps";
import Team from "@/components/Team";
import Testimonials from "@/components/Testimonials";
import Gallery from "@/components/Gallery";
import CtaBand from "@/components/CtaBand";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { breadcrumbLd, organizationLd } from "@/lib/seo";

const AboutPage = () => {
  const cfg = useSiteConfig();
  const { brand, sections } = cfg;
  const on = (id: keyof typeof sections) => sections[id]?.enabled !== false;
  return (
    <div className="min-h-screen">
      <Seo title="Tentang Kami" description={sections.about.description}
        jsonLd={[organizationLd(cfg), breadcrumbLd([{ name: "Tentang Kami", path: "/tentang-kami" }])]} />
      <Header />
      <PageHeader crumbs={[{ label: "Tentang Kami" }]} title={`Tentang ${brand.name}`}
        subtitle={`Lembaga pelatihan kerja di ${brand.city.split(",")[0]} yang membekali peserta dengan keterampilan siap kerja dan siap berwirausaha.`} />
      <main>
        <About />
        <Credentials />
        {on("offer") && <Offer />}
        {on("steps") && <Steps />}
        {on("team") && <Team />}
        {on("testimonials") && <Testimonials />}
        {on("gallery") && <Gallery />}
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
};

export default AboutPage;
