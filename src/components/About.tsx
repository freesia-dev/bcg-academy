import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Target, Users, Briefcase, CheckCircle, Star } from "lucide-react";

const About = () => {
  const achievements = [
    { icon: Users, label: "Alumni Sukses", value: "100+", color: "gold" },
    { icon: Briefcase, label: "Mitra Industri", value: "50+", color: "corporate-blue" },
    { icon: Award, label: "Sertifikasi BNSP", value: "6", color: "accent-red" },
    { icon: Star, label: "Rating Kepuasan", value: "4.9/5", color: "gold" }
  ];

  const features = [
    "Kurikulum berbasis BNSP (Badan Nasional Sertifikasi Profesi)",
    "Tenaga pengajar profesional dengan pengalaman industri",
    "Fasilitas pelatihan modern dan lengkap",
    "Program magang dan penempatan kerja",
    "Sertifikat resmi yang diakui industri",
    "Pendampingan karir hingga 6 bulan setelah lulus"
  ];

  return (
    <section id="about" className="py-20">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-primary">
                Tentang{" "}
                <span className="text-gradient">LPK Borneo Citra Gemilang</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                LPK Borneo Citra Gemilang adalah lembaga pelatihan kerja yang berkomitmen mencetak sumber daya manusia unggul, berkompeten, dan siap bersaing di dunia kerja. Berlokasi di Kota Bontang, kami menghadirkan program pelatihan yang dirancang sesuai kebutuhan industri.
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-primary flex items-center gap-2">
                  <Target className="text-gold" size={24} />
                  Mengapa Memilih Kami?
                </h3>
                <div className="space-y-3">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="text-gold mt-0.5 flex-shrink-0" size={20} />
                      <p className="text-muted-foreground">{feature}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <Button variant="gold" size="lg" className="mr-4">
                  Hubungi Kami
                </Button>
                <Button variant="outline" size="lg">
                  Download Brosur
                </Button>
              </div>
            </div>
          </div>

          {/* Visual & Stats */}
          <div className="space-y-8">
            {/* Mission Vision Card */}
            <Card className="p-8 bg-gradient-to-br from-gold/5 to-corporate-blue/5 border-gold/20">
              <CardContent className="space-y-6 p-0">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-primary mb-4">Visi & Misi</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-primary mb-2">Visi</h4>
                    <p className="text-muted-foreground text-sm">
                      Menjadi lembaga pelatihan kerja terdepan yang menghasilkan SDM berkualitas dan berdaya saing tinggi.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-primary mb-2">Misi</h4>
                    <p className="text-muted-foreground text-sm">
                      Memberikan pendidikan dan pelatihan kerja berkualitas yang relevan dengan kebutuhan industri dan mengembangkan potensi peserta didik secara optimal.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Achievements Grid */}
            <div className="grid grid-cols-2 gap-4">
              {achievements.map((item, index) => (
                <Card key={index} className={`p-6 text-center hover:shadow-glow transition-all duration-300 border-${item.color}/20 bg-${item.color}/5`}>
                  <CardContent className="p-0 space-y-3">
                    <div className={`inline-flex items-center justify-center w-12 h-12 bg-${item.color}/10 rounded-full`}>
                      <item.icon className={`text-${item.color}`} size={24} />
                    </div>
                    <div>
                      <div className={`text-2xl font-bold text-${item.color}`}>{item.value}</div>
                      <div className="text-sm text-muted-foreground">{item.label}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Quote */}
        <div className="mt-20 text-center">
          <div className="max-w-4xl mx-auto">
            <blockquote className="text-xl font-medium text-primary italic">
              "Kami percaya bahwa pendidikan dan keterampilan adalah kunci untuk membuka peluang yang lebih luas. 
              Oleh karena itu, LPK Borneo Citra Gemilang hadir sebagai mitra terbaik bagi masyarakat yang ingin 
              meningkatkan kemampuan, mengembangkan karier, maupun membangun masa depan yang lebih gemilang."
            </blockquote>
            <div className="mt-6 text-gold font-semibold">- Tim LPK Borneo Citra Gemilang</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;