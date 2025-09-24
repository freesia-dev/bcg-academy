import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Programs from "@/components/Programs";
import About from "@/components/About";
import Gallery from "@/components/Gallery";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <Programs />
        <About />
        <Gallery />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Index;