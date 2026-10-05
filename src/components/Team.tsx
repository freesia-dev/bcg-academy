import { useSiteConfig } from "@/hooks/useSiteConfig";

const Team = () => {
  const c = useSiteConfig().sections.team;
  if (!c.members.length) return null;
  return (
    <section id="team" className="py-20 md:py-24 bg-secondary/40">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            {c.title} <span className="text-gradient">{c.titleHighlight}</span>
          </h2>
          <p className="text-lg text-muted-foreground">{c.subtitle}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {c.members.map((m, i) => (
            <article key={i} className="rounded-2xl border border-border bg-card p-7 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-medium">
              <div className="w-28 h-28 mx-auto rounded-full overflow-hidden ring-4 ring-gold/25 bg-muted">
                {m.photo && <img src={m.photo} alt={m.name} loading="lazy" className="w-full h-full object-cover" />}
              </div>
              <h3 className="mt-5 text-lg font-bold text-primary">{m.name}</h3>
              <p className="text-sm font-medium text-gold-dark mt-1">{m.role}</p>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{m.bio}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Team;
