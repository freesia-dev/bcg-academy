import SectionHeader from "@/components/SectionHeader";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import ProgramRegistrationDialog from "./ProgramRegistrationDialog";
import { usePrograms } from "@/hooks/usePrograms";
import { useSiteConfig } from "@/hooks/useSiteConfig";

const Programs = () => {
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { programs } = usePrograms();
  const { brand, sections } = useSiteConfig();
  const c = sections.programs;

  const handleProgramRegister = (programTitle: string) => {
    setSelectedProgram(programTitle);
    setIsDialogOpen(true);
  };

  return (
    <section id="programs" className="py-20 md:py-24 bg-secondary/40">
      <div className="container mx-auto px-4">
        <SectionHeader eyebrow={c.eyebrow} title={c.title} highlight={c.titleHighlight} subtitle={c.subtitle} />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {programs.map((program) => (
            <Card key={program.id} className="group hover:shadow-strong transition-all duration-300 hover:-translate-y-2 border-0 bg-card/80 backdrop-blur-sm flex flex-col h-full">
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between">
                  <Badge variant="secondary" className="bg-gold/10 text-gold-dark border-gold/20">
                    {program.level}
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold group-hover:text-gold transition-colors min-h-[3.5rem]">
                  <Link to={`/program-pelatihan/${program.slug}`} className="hover:underline">{program.title}</Link>
                </CardTitle>
                <CardDescription className="text-muted-foreground leading-relaxed min-h-[4.5rem]">
                  {program.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6 flex flex-col flex-1">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2"><Clock size={16} className="text-muted-foreground" /><span>{program.duration}</span></div>
                  <div className="flex items-center gap-2"><Users size={16} className="text-muted-foreground" /><span>{program.capacity}</span></div>
                </div>

                <div className="space-y-2 min-h-[6rem]">
                  <h4 className="font-semibold text-sm text-primary">Yang Akan Dipelajari:</h4>
                  <div className="flex flex-wrap gap-2">
                    {program.highlights.map((highlight, index) => (
                      <Badge key={index} variant="outline" className="text-xs">{highlight}</Badge>
                    ))}
                  </div>
                </div>

                <Button variant="gold" className="w-full group-hover:shadow-glow transition-all duration-300 mt-auto"
                  onClick={() => handleProgramRegister(program.title)}>
                  Daftar Program
                  <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-16">
          <p className="text-muted-foreground mb-6">{c.ctaText}</p>
          <Button variant="corporate" size="lg" onClick={() => window.open(`https://wa.me/${brand.whatsapp}`, '_blank')}>
            {c.ctaButton}
          </Button>
        </div>
      </div>

      {selectedProgram && (
        <ProgramRegistrationDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} programTitle={selectedProgram} />
      )}
    </section>
  );
};

export default Programs;
