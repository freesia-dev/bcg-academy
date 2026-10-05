interface Props { eyebrow?: string; title: string; highlight?: string; subtitle?: string; align?: "center" | "left"; light?: boolean }

const SectionHeader = ({ eyebrow, title, highlight, subtitle, align = "center", light }: Props) => (
  <div className={`max-w-2xl mb-12 md:mb-14 ${align === "center" ? "mx-auto text-center" : ""}`}>
    {eyebrow && (
      <p className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] mb-3 ${light ? "text-gold" : "text-gold-dark"}`}>
        <span className="h-px w-6 bg-current opacity-60" />{eyebrow}<span className="h-px w-6 bg-current opacity-60" />
      </p>
    )}
    <h2 className={`text-3xl md:text-[2.5rem] font-extrabold tracking-tight leading-tight ${light ? "text-primary-foreground" : "text-primary"}`}>
      {title} {highlight && <span className="text-gradient-ink">{highlight}</span>}
    </h2>
    {subtitle && <p className={`mt-4 text-base md:text-lg leading-relaxed ${light ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{subtitle}</p>}
  </div>
);

export default SectionHeader;
