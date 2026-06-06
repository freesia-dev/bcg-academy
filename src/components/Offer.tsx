import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Award, Briefcase } from "lucide-react";

const items = [
  {
    icon: GraduationCap,
    title: "Pelatihan Berbasis Kompetensi",
    desc: "Program praktis yang disusun berdasarkan Standar Kompetensi Kerja Nasional Indonesia (SKKNI), siap kerja & wirausaha.",
    color: "gold",
  },
  {
    icon: Award,
    title: "Sertifikasi Resmi BNSP",
    desc: "Akses uji kompetensi dari Badan Nasional Sertifikasi Profesi. Sertifikat sah & diakui secara nasional.",
    color: "corporate-blue",
  },
  {
    icon: Briefcase,
    title: "Dukungan Karier & Wirausaha",
    desc: "Jejaring dengan perusahaan, UMKM, dan komunitas lokal untuk membuka peluang kerja serta lahirnya wirausaha muda.",
    color: "accent-red",
  },
];

const Offer = () => (
  <section className="py-20">
    <div className="container mx-auto px-4">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h2 className="text-4xl font-bold text-primary mb-4">
          Apa yang Kami <span className="text-gradient">Tawarkan</span>
        </h2>
        <p className="text-lg text-muted-foreground">
          BCG Academy menghadirkan pelatihan berkualitas dengan sertifikasi resmi dan dukungan
          menuju karier serta masa depan gemilang.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {items.map((it) => (
          <Card
            key={it.title}
            className={`p-6 hover:shadow-glow transition-all duration-300 border-${it.color}/20 hover:-translate-y-1`}
          >
            <CardContent className="p-0 space-y-4">
              <div
                className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-${it.color}/10`}
              >
                <it.icon className={`text-${it.color}`} size={28} />
              </div>
              <h3 className="text-xl font-bold text-primary">{it.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{it.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </section>
);

export default Offer;
