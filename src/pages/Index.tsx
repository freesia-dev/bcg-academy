import type React from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Offer from "@/components/Offer";
import Programs from "@/components/Programs";
import Steps from "@/components/Steps";
import About from "@/components/About";
import Team from "@/components/Team";
import Testimonials from "@/components/Testimonials";
import Gallery from "@/components/Gallery";
import Faq from "@/components/Faq";
import CtaBand from "@/components/CtaBand";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import Seo from "@/components/site/Seo";
import { organizationLd, websiteLd } from "@/lib/seo";
import type { SectionId } from "@/lib/siteConfig";

const SECTIONS: Record<SectionId, React.ComponentType> = {
  hero: Hero, programs: Programs, steps: Steps, offer: Offer, about: About, team: Team,
  testimonials: Testimonials, gallery: Gallery, faq: Faq, cta: CtaBand, contact: Contact,
};

const Index = () => {
  const cfg = useSiteConfig();
  const { sectionOrder, sections } = cfg;
  return (
    <div className="min-h-screen">
      <Seo path="/" jsonLd={[organizationLd(cfg), websiteLd(cfg)]} />
      <Header />
      <main>
        {sectionOrder.filter((id) => sections[id]?.enabled).map((id) => {
          const S = SECTIONS[id];
          return <S key={id} />;
        })}
      </main>
      <Footer />
    </div>
  );
};

export default Index;
