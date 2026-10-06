import { Quote } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";
import { useSiteConfig } from "@/hooks/useSiteConfig";

/** Tersembunyi otomatis selama belum ada testimoni asli. */
const Testimonials = () => {
  const c = useSiteConfig().sections.testimonials;
  const items = c.items.filter((t) => t.quote?.trim());
  if (!items.length) return null;
  return (
    <section id="testimonials" className="py-20 md:py-24 bg-card">
      <div className="container mx-auto px-4">
        <SectionHeader eyebrow={c.eyebrow} title={c.title} highlight={c.titleHighlight} subtitle={c.subtitle} />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((t, i) => (
            <figure key={i} className="flex flex-col rounded-2xl border border-border bg-background p-6">
              <Quote className="h-7 w-7 text-gold" />
              <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-foreground">"{t.quote}"</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                {t.photo
                  ? <img src={t.photo} alt={t.name} className="h-11 w-11 rounded-full object-cover" />
                  : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{t.name.slice(0, 1)}</span>}
                <span>
                  <span className="block font-semibold text-primary">{t.name}</span>
                  <span className="block text-sm text-muted-foreground">{t.program}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
