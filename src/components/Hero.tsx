import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { useCourses } from "@/hooks/useCourses";
import { iconFor } from "@/components/site/ProgramVisual";

const Hero = () => {
  const { brand, sections } = useSiteConfig();
  const c = sections.hero;
  const { courses } = useCourses();
  const wa = `https://wa.me/${brand.whatsapp}`;
  const list = courses.slice(0, 4);

  return (
    <section id="home" className="relative overflow-hidden pt-[112px] pb-16 md:pt-[128px] md:pb-24">
      <div className="absolute inset-0 bg-dots pointer-events-none [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
      <div className="absolute -top-24 -right-24 h-[420px] w-[420px] rounded-full bg-gold/15 blur-3xl pointer-events-none" />
      <div className="absolute top-40 -left-32 h-[320px] w-[320px] rounded-full bg-corporate-blue/10 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-card px-3.5 py-1.5 text-xs sm:text-sm font-medium text-primary shadow-soft">
              <span className="h-2 w-2 rounded-full bg-gold" />{c.badge}
            </p>
            <h1 className="mt-6 text-[2.15rem] leading-[1.1] sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-primary text-balance">
              {c.titleBefore}{" "}
              <span className="relative whitespace-nowrap">
                <span className="relative z-10">{c.titleHighlight}</span>
                <span className="absolute inset-x-0 bottom-1 h-3 sm:h-4 rounded-sm bg-gold/45 -z-0" aria-hidden="true" />
              </span>{" "}
              {c.titleAfter}
            </h1>
            <p className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground">{c.subtitle}</p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg"><Link to="/kursus">{c.primaryCta}<ArrowRight className="h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="outline"><a href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />{c.secondaryCta}</a></Button>
            </div>

            <ul className="mt-8 grid gap-2 sm:grid-cols-2 max-w-xl">
              {c.highlights.slice(0, 4).map((h, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-foreground/80">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-gold-dark" />{h}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            {c.image ? (
              <div className="relative">
                <img src={c.image} alt={`Kegiatan pelatihan di ${brand.name}`} className="aspect-[4/3] w-full rounded-3xl object-cover shadow-strong" />
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-3xl bg-navy-mesh p-6 pb-16 sm:p-8 sm:pb-16 text-primary-foreground shadow-strong">
                <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                <div className="relative">
                  <div className="flex items-center justify-between gap-4">
                    <div className="rounded-xl bg-white px-3 py-2"><img src={brand.logo} alt="" className="h-9 w-auto" /></div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">{brand.city.split(",")[0]}</span>
                  </div>
                  <p className="mt-7 text-sm font-medium text-primary-foreground/70">Program pelatihan tersedia</p>
                  <ul className="mt-3 space-y-2">
                    {list.map((p) => {
                      const Icon = iconFor(`${p.title} ${p.category ?? ""}`);
                      return (
                        <li key={p.id}>
                          <Link to={`/kursus/${p.slug}`} className="group flex items-center gap-3 rounded-xl bg-white/[0.07] px-3 py-2.5 hover:bg-white/[0.14] transition-colors">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold text-primary"><Icon className="h-[18px] w-[18px]" /></span>
                            <span className="flex-1 text-sm font-semibold">{p.title}</span>
                            <ArrowRight className="h-4 w-4 opacity-60 transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        </li>
                      );
                    })}
                    {list.length === 0 && [0, 1, 2].map((i) => <li key={i} className="h-[52px] rounded-xl bg-white/[0.07] animate-pulse" />)}
                  </ul>
                  {courses.length > list.length && (
                    <Link to="/kursus" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-gold hover:text-gold-light">
                      +{courses.length - list.length} program lainnya <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            )}

            <dl className="relative -mt-8 mx-4 sm:mx-8 grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card shadow-medium">
              {c.stats.slice(0, 3).map((s, i) => (
                <div key={i} className="px-3 py-4 text-center">
                  <dt className="text-xl sm:text-2xl font-extrabold text-primary" style={{ fontFamily: "var(--font-heading)" }}>{s.value}</dt>
                  <dd className="mt-0.5 text-[11px] sm:text-xs text-muted-foreground">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
