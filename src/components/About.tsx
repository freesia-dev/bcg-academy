import SectionHeader from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Eye, Flag } from "lucide-react";
import { useSiteConfig } from "@/hooks/useSiteConfig";

const About = () => {
  const { brand, sections } = useSiteConfig();
  const c = sections.about;
  const wa = `https://wa.me/${brand.whatsapp}`;

  return (
    <section id="about" className="py-20 md:py-24 bg-card">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div className="space-y-8">
            <div className="space-y-4">
              <SectionHeader align="left" eyebrow={c.eyebrow} title={c.title} highlight={c.titleHighlight} className="mb-5 md:mb-5" />
              <p className="text-lg text-muted-foreground leading-relaxed">{c.description}</p>
              <blockquote className="border-l-4 border-gold pl-4 text-muted-foreground italic">
                "{c.quote}"
                <footer className="not-italic mt-2 text-sm font-semibold text-primary">— {c.quoteAuthor}</footer>
              </blockquote>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-primary">{c.featuresTitle}</h3>
              <ul className="space-y-3">
                {c.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="text-gold mt-0.5 shrink-0" size={20} />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="gold" size="lg" onClick={() => window.open(wa, "_blank")}>Hubungi Kami</Button>
              <Button variant="outline" size="lg" onClick={() => window.open(wa, "_blank")}>Minta Brosur via WhatsApp</Button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-7 space-y-6 shadow-soft">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-gold/10 text-gold flex items-center justify-center shrink-0"><Eye size={20} /></div>
                <div>
                  <h4 className="font-semibold text-primary mb-1">Visi</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.vision}</p>
                </div>
              </div>
              <div className="h-px bg-border" />
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-gold/10 text-gold flex items-center justify-center shrink-0"><Flag size={20} /></div>
                <div>
                  <h4 className="font-semibold text-primary mb-1">Misi</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.mission}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {c.stats.map((s, i) => (
                <div key={i} className="rounded-xl border border-border bg-secondary/50 p-5 text-center">
                  <div className="text-2xl font-bold text-primary" style={{ fontFamily: "var(--font-heading)" }}>{s.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {c.closingQuote && (
          <div className="mt-20 max-w-3xl mx-auto text-center">
            <div className="w-12 h-1 bg-gold mx-auto mb-6 rounded-full" />
            <blockquote className="text-lg md:text-xl text-primary/90 italic leading-relaxed">"{c.closingQuote}"</blockquote>
            <p className="mt-5 text-gold-dark font-semibold">Tim {brand.name}</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default About;
