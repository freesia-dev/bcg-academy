import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SectionHeader from "@/components/SectionHeader";
import ProgramCard from "@/components/site/ProgramCard";
import { useCourses } from "@/hooks/useCourses";
import { useSiteConfig } from "@/hooks/useSiteConfig";

const Programs = () => {
  const { brand, sections } = useSiteConfig();
  const c = sections.programs;
  const { courses, loading } = useCourses();

  return (
    <section id="programs" className="py-20 md:py-24 bg-card">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <SectionHeader align="left" eyebrow={c.eyebrow} title={c.title} highlight={c.titleHighlight} subtitle={c.subtitle} className="mb-0 md:mb-0" />
          <Button asChild variant="outline" className="shrink-0 self-start md:self-auto"><Link to="/kursus">Semua program<ArrowRight className="h-4 w-4" /></Link></Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? [0, 1, 2].map((i) => <div key={i} className="h-[380px] rounded-2xl bg-muted animate-pulse" />)
            : courses.slice(0, 6).map((p) => <ProgramCard key={p.id} c={p} />)}
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
          <p className="text-muted-foreground">{c.ctaText}</p>
          <a href={`https://wa.me/${brand.whatsapp}`} target="_blank" rel="noreferrer" className="font-semibold text-primary underline underline-offset-4 hover:text-gold-dark">
            {c.ctaButton}
          </a>
        </div>
      </div>
    </section>
  );
};

export default Programs;
