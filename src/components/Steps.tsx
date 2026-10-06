import SectionHeader from "@/components/SectionHeader";
import { useSiteConfig } from "@/hooks/useSiteConfig";

const Steps = () => {
  const c = useSiteConfig().sections.steps;
  if (!c.items.length) return null;
  return (
    <section id="steps" className="py-20 md:py-24 bg-secondary/50">
      <div className="container mx-auto px-4">
        <SectionHeader eyebrow={c.eyebrow} title={c.title} highlight={c.titleHighlight} subtitle={c.subtitle} />
        <ol className="relative grid gap-6 md:gap-4 md:grid-cols-4">
          <div className="hidden md:block absolute top-7 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-primary/10 via-primary/30 to-primary/10" aria-hidden="true" />
          {c.items.map((s, i) => (
            <li key={i} className="relative flex md:flex-col md:items-center md:text-center gap-4">
              <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-extrabold text-primary-foreground shadow-medium ring-8 ring-secondary/50">
                {i + 1}
              </span>
              <div className="md:mt-2">
                <h3 className="text-lg font-bold text-primary">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground md:max-w-[15rem] md:mx-auto">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default Steps;
