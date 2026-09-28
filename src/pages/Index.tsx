import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Offer from "@/components/Offer";
import Programs from "@/components/Programs";
import About from "@/components/About";
import Team from "@/components/Team";
import Gallery from "@/components/Gallery";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <Offer />
        <Programs />
        <About />
        <Team />
        <Gallery />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Index;