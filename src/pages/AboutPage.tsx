import Header from "@/components/Header";
import Footer from "@/components/Footer";
import About from "@/components/About";
import Team from "@/components/Team";

const AboutPage = () => (
  <div className="min-h-screen">
    <Header />
    <main className="pt-32">
      <About />
      <Team />
    </main>
    <Footer />
  </div>
);

export default AboutPage;
