import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useSiteConfig } from "@/hooks/useSiteConfig";

const Hero = () => {
  const { brand, sections } = useSiteConfig();
  const c = sections.hero;
  const wa = `https://wa.me/${brand.whatsapp}`;

  return (
    <section id="home" className="relative min-h-[88vh] flex items-center hero-gradient overflow-hidden pt-28 lg:pt-32 pb-16">
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(hsl(var(--gold)) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      <div className="absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-gold/10 blur-3xl pointer-events-none" />
      <div className="container mx-auto px-4 relative">
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-16 items-center">
          <div className="space-y-8">
            <div className="space-y-5">
              <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/30 bg-gold/10 text-gold text-xs sm:text-sm font-medium tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                {c.badge}
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-primary-foreground leading-[1.08]">
                {c.titleBefore} <span className="text-gradient">{c.titleHighlight}</span> {c.titleAfter}
              </h1>
              <p className="text-base sm:text-lg text-primary-foreground/75 max-w-xl leading-relaxed">{c.subtitle}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="hero" size="lg"
                onClick={() => document.getElementById("programs")?.scrollIntoView({ behavior: "smooth" })}>
                {c.primaryCta}
                <ArrowRight className="ml-2" size={18} />
              </Button>
              <Button variant="outline" size="lg"
                className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                onClick={() => window.open(wa, "_blank")}>
                {c.secondaryCta}
              </Button>
            </div>

            <dl className="grid grid-cols-3 gap-4 sm:gap-8 pt-8 border-t border-primary-foreground/15 max-w-xl">
              {c.stats.map((s, i) => (
                <div key={i}>
                  <dt className="text-2xl sm:text-3xl font-bold text-gold" style={{ fontFamily: "var(--font-heading)" }}>{s.value}</dt>
                  <dd className="text-xs sm:text-sm text-primary-foreground/65 mt-1">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            {c.image ? (
              <div className="rounded-2xl p-3 bg-primary-foreground/5 border border-primary-foreground/15 backdrop-blur-sm">
                <div className="aspect-[4/3] rounded-xl overflow-hidden">
                  <img src={c.image} alt={`Kegiatan pelatihan di ${brand.name}`} className="w-full h-full object-cover" />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl p-8 bg-primary-foreground/5 border border-primary-foreground/15 backdrop-blur-sm space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-primary-foreground/95 p-2 flex items-center justify-center shrink-0">
                    <img src={brand.logo} alt={brand.name} className="max-h-full max-w-full object-contain" />
                  </div>
                  <div>
                    <p className="text-primary-foreground font-semibold leading-tight">{brand.name}</p>
                    <p className="text-primary-foreground/60 text-sm">{brand.tagline}</p>
                  </div>
                </div>
                <ul className="space-y-3">
                  {c.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-3 text-primary-foreground/90">
                      <CheckCircle2 size={20} className="text-gold mt-0.5 shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
                {brand.nib && <p className="text-xs text-primary-foreground/50 pt-4 border-t border-primary-foreground/10">NIB {brand.nib}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
