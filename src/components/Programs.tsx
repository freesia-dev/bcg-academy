import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Award, ArrowRight } from "lucide-react";
import ProgramRegistrationDialog from "./ProgramRegistrationDialog";

const Programs = () => {
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleProgramRegister = (programTitle: string) => {
    setSelectedProgram(programTitle);
    setIsDialogOpen(true);
  };
  const programs = [
    {
      id: 1,
      title: "Administrasi Perkantoran",
      description: "Pelajari keterampilan administrasi modern untuk menunjang karir di bidang perkantoran dan manajemen.",
      duration: "3 Bulan",
      capacity: "20 Peserta",
      level: "Pemula - Menengah",
      highlights: ["Microsoft Office", "Manajemen Dokumen", "Komunikasi Bisnis"],
      color: "corporate-blue"
    },
    {
      id: 2,
      title: "Barista Professional",
      description: "Kuasai seni membuat kopi dan manajemen café untuk berkarir di industri F&B yang berkembang pesat.",
      duration: "2 Bulan",
      capacity: "15 Peserta",
      level: "Pemula",
      highlights: ["Coffee Making", "Latte Art", "Café Management"],
      color: "accent-red"
    },
    {
      id: 3,
      title: "Rias Pengantin Gaun Panjang",
      description: "Pelajari teknik rias pengantin modern dan tradisional untuk membangun bisnis wedding organizer.",
      duration: "4 Bulan",
      capacity: "12 Peserta",
      level: "Pemula - Mahir",
      highlights: ["Makeup Artistry", "Hair Styling", "Wedding Planning"],
      color: "gold"
    },
    {
      id: 4,
      title: "Desainer Grafis",
      description: "Kembangkan kreativitas dan technical skills untuk berkarir sebagai desainer grafis profesional.",
      duration: "4 Bulan",
      capacity: "18 Peserta",
      level: "Pemula - Menengah",
      highlights: ["Adobe Creative Suite", "Branding", "Digital Design"],
      color: "corporate-blue"
    },
    {
      id: 5,
      title: "Operator Komputer",
      description: "Kuasai keterampilan dasar komputer dan aplikasi perkantoran untuk meningkatkan daya saing kerja.",
      duration: "2 Bulan",
      capacity: "25 Peserta",
      level: "Pemula",
      highlights: ["Basic Computing", "Office Apps", "Data Entry"],
      color: "accent-red"
    },
    {
      id: 6,
      title: "Digital Marketing",
      description: "Pelajari strategi pemasaran digital terkini untuk mengembangkan bisnis di era digital.",
      duration: "3 Bulan",
      capacity: "20 Peserta",
      level: "Pemula - Menengah",
      highlights: ["Social Media", "SEO/SEM", "Content Strategy"],
      color: "gold"
    }
  ];

  return (
    <section id="programs" className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-primary mb-4">
            Program Pelatihan <span className="text-gradient">Unggulan</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Pilih program pelatihan yang sesuai dengan minat dan tujuan karir Anda. 
            Semua program dilengkapi dengan sertifikat SKKNI dan pendampingan penempatan kerja.
          </p>
        </div>

        {/* Programs Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {programs.map((program) => (
            <Card key={program.id} className="group hover:shadow-strong transition-all duration-300 hover:-translate-y-2 border-0 bg-card/80 backdrop-blur-sm">
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between">
                  <Badge 
                    variant="secondary" 
                    className={`bg-${program.color}/10 text-${program.color} border-${program.color}/20`}
                  >
                    {program.level}
                  </Badge>
                  <div className={`w-3 h-3 rounded-full bg-${program.color}`}></div>
                </div>
                <CardTitle className="text-xl font-bold group-hover:text-gold transition-colors">
                  {program.title}
                </CardTitle>
                <CardDescription className="text-muted-foreground leading-relaxed">
                  {program.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Program Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-muted-foreground" />
                    <span>{program.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-muted-foreground" />
                    <span>{program.capacity}</span>
                  </div>
                </div>

                {/* Highlights */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-primary">Yang Akan Dipelajari:</h4>
                  <div className="flex flex-wrap gap-2">
                    {program.highlights.map((highlight, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {highlight}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <Button 
                  variant="gold" 
                  className="w-full group-hover:shadow-glow transition-all duration-300"
                  onClick={() => handleProgramRegister(program.title)}
                >
                  Daftar Program
                  <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground mb-6">
            Tidak menemukan program yang sesuai? Hubungi kami untuk konsultasi gratis!
          </p>
          <Button 
            variant="corporate" 
            size="lg"
            onClick={() => window.open('https://wa.me/6282254187096', '_blank')}
          >
            Konsultasi Program
          </Button>
        </div>
      </div>

      {selectedProgram && (
        <ProgramRegistrationDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          programTitle={selectedProgram}
        />
      )}
    </section>
  );
};

export default Programs;