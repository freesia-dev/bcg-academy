import { Button } from "@/components/ui/button";
import { ArrowRight, Award, Users, BookOpen } from "lucide-react";
import heroTraining from "@/assets/hero-training.jpg";
import { useSiteContent } from "@/hooks/useSiteContent";

const DEFAULTS = {
  badge: "Membangun Keterampilan, Mewujudkan Masa Depan Gemilang",
  title_part1: "Wujudkan",
  title_highlight: "Karier Impian",
  title_part2: "Anda Bersama Kami",
  subtitle:
    "LPK Borneo Citra Gemilang (BCG Academy) adalah lembaga pelatihan kerja terpercaya di Kota Bontang. Kami mencetak SDM kompeten dan profesional melalui pelatihan berbasis SKKNI dengan Sertifikasi resmi BNSP.",
  primary_cta: "Lihat Program Pelatihan",
  secondary_cta: "Konsultasi Gratis",
  secondary_cta_url: "https://wa.me/6282254187096",
  stat_alumni: "100+",
  stat_alumni_label: "Alumni Sukses",
  stat_programs: "6",
  stat_programs_label: "Program Unggulan",
  stat_year: "2025",
  stat_year_label: "Berdiri Sejak",
};

const Hero = () => {
  const c = useSiteContent("hero", DEFAULTS);
  return (
    <section id="home" className="relative min-h-screen flex items-center hero-gradient">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="inline-block px-4 py-1.5 rounded-full bg-gold/15 text-gold text-sm font-semibold tracking-wide">
                {c.badge}
              </p>
              <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground leading-tight">
                {c.title_part1}{" "}
                <span className="text-gradient">{c.title_highlight}</span>{" "}
                {c.title_part2}
              </h1>
              <p className="text-xl text-primary-foreground/80 max-w-2xl">{c.subtitle}</p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button
                variant="hero"
                size="lg"
                onClick={() => document.getElementById("programs")?.scrollIntoView({ behavior: "smooth" })}
              >
                {c.primary_cta}
                <ArrowRight className="ml-2" size={20} />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="bg-background/10 border-primary-foreground/20 text-primary-foreground hover:bg-background/20"
                onClick={() => window.open(c.secondary_cta_url, "_blank")}
              >
                {c.secondary_cta}
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-8 pt-8 border-t border-primary-foreground/20">
              {[
                { icon: Users, value: c.stat_alumni, label: c.stat_alumni_label },
                { icon: BookOpen, value: c.stat_programs, label: c.stat_programs_label },
                { icon: Award, value: c.stat_year, label: c.stat_year_label },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-gold/20 rounded-full mx-auto mb-2">
                    <s.icon className="text-gold" size={24} />
                  </div>
                  <div className="text-2xl font-bold text-primary-foreground">{s.value}</div>
                  <div className="text-sm text-primary-foreground/70">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="relative z-10 bg-background/10 backdrop-blur-sm rounded-2xl p-4 border border-primary-foreground/20">
              <div className="aspect-square rounded-xl overflow-hidden">
                <img src={heroTraining} alt="Pelatihan profesional di LPK Borneo Citra Gemilang" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-gold/20 rounded-full animate-pulse"></div>
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-corporate-blue/20 rounded-full animate-pulse delay-1000"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
