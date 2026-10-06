import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/site/PageHeader";
import Contact from "@/components/Contact";
import Faq from "@/components/Faq";
import { useSiteConfig } from "@/hooks/useSiteConfig";

const ContactPage = () => {
  const { sections } = useSiteConfig();
  return (
    <div className="min-h-screen">
      <Header />
      <PageHeader crumbs={[{ label: "Kontak" }]} title="Hubungi Kami" subtitle={sections.contact.subtitle} />
      <main>
        <Contact showHeader={false} />
        <Faq />
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;
