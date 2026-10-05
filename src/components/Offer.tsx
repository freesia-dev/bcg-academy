import { GraduationCap, Award, Briefcase, Users, ShieldCheck, BookOpen } from "lucide-react";
import { useSiteConfig } from "@/hooks/useSiteConfig";

const ICONS = { graduation: GraduationCap, award: Award, briefcase: Briefcase, users: Users, shield: ShieldCheck, book: BookOpen };

const Offer = () => {
  const c = useSiteConfig().sections.offer;
  return (
    <section id="offer" className="py-20 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            {c.title} <span className="text-gradient">{c.titleHighlight}</span>
          </h2>
          <p className="text-lg text-muted-foreground">{c.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {c.items.map((it, i) => {
            const Icon = ICONS[it.icon] || GraduationCap;
            return (
              <div key={i} className="group relative rounded-2xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-medium hover:border-gold/40">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gold/10 text-gold mb-5 group-hover:bg-gold group-hover:text-primary transition-colors">
                  <Icon size={24} />
                </div>
                <h3 className="text-lg font-bold text-primary mb-2">{it.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-[15px]">{it.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Offer;
