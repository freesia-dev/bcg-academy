import type { ReactElement } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Offer from "@/components/Offer";
import Programs from "@/components/Programs";
import About from "@/components/About";
import Team from "@/components/Team";
import Gallery from "@/components/Gallery";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import type { SectionId } from "@/lib/siteConfig";

const SECTIONS: Record<SectionId, () => ReactElement> = {
  hero: Hero, offer: Offer, programs: Programs, about: About, team: Team, gallery: Gallery, contact: Contact,
};

const Index = () => {
  const { sectionOrder, sections } = useSiteConfig();
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        {sectionOrder.filter((id) => sections[id].enabled).map((id) => {
          const S = SECTIONS[id];
          return <S key={id} />;
        })}
      </main>
      <Footer />
    </div>
  );
};

export default Index;
