import { Button } from "@/components/ui/button";
import { ArrowRight, Award, Users, BookOpen } from "lucide-react";
import heroTraining from "@/assets/hero-training.jpg";

const Hero = () => {
  return (
    <section id="home" className="relative min-h-screen flex items-center hero-gradient">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Hero Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground leading-tight">
                Wujudkan{" "}
                <span className="text-gradient">Karier Impian</span>{" "}
                Anda Bersama Kami
              </h1>
              <p className="text-xl text-primary-foreground/80 max-w-2xl">
                LPK Borneo Citra Gemilang adalah lembaga pelatihan kerja terpercaya yang mencetak SDM unggul dan berkompeten di Kota Bontang. Bergabunglah dengan ribuan alumni sukses kami!
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <Button 
                variant="hero" 
                size="lg"
                onClick={() => {
                  const programsSection = document.getElementById('programs');
                  programsSection?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Lihat Program Pelatihan
                <ArrowRight className="ml-2" size={20} />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="bg-background/10 border-primary-foreground/20 text-primary-foreground hover:bg-background/20"
                onClick={() => window.open('https://wa.me/6282254187096', '_blank')}
              >
                Konsultasi Gratis
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-8 border-t border-primary-foreground/20">
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-gold/20 rounded-full mx-auto mb-2">
                  <Users className="text-gold" size={24} />
                </div>
                <div className="text-2xl font-bold text-primary-foreground">100+</div>
                <div className="text-sm text-primary-foreground/70">Alumni Sukses</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-gold/20 rounded-full mx-auto mb-2">
                  <BookOpen className="text-gold" size={24} />
                </div>
                <div className="text-2xl font-bold text-primary-foreground">6</div>
                <div className="text-sm text-primary-foreground/70">Program Unggulan</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-gold/20 rounded-full mx-auto mb-2">
                  <Award className="text-gold" size={24} />
                </div>
                <div className="text-2xl font-bold text-primary-foreground">2025</div>
                <div className="text-sm text-primary-foreground/70">Berdiri Sejak</div>
              </div>
            </div>
          </div>

          {/* Hero Image/Visual */}
          <div className="relative">
            <div className="relative z-10 bg-background/10 backdrop-blur-sm rounded-2xl p-4 border border-primary-foreground/20">
              <div className="aspect-square rounded-xl overflow-hidden">
                <img 
                  src={heroTraining} 
                  alt="Professional Training at LPK Borneo Citra Gemilang" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-gold/20 rounded-full animate-pulse"></div>
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-corporate-blue/20 rounded-full animate-pulse delay-1000"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;