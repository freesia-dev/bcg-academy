import { cn } from "@/lib/utils";

interface Props {
  eyebrow?: string; title: string; highlight?: string; subtitle?: string;
  align?: "center" | "left"; light?: boolean; className?: string;
}

const SectionHeader = ({ eyebrow, title, highlight, subtitle, align = "center", light, className }: Props) => (
  <div className={cn("max-w-2xl mb-12 md:mb-14", align === "center" && "mx-auto text-center", className)}>
    {eyebrow && (
      <p className={cn("inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] mb-3", light ? "text-gold" : "text-gold-dark")}>
        <span className="h-1.5 w-1.5 rounded-full bg-gold" />{eyebrow}
      </p>
    )}
    <h2 className={cn("text-3xl md:text-[2.5rem] font-extrabold tracking-tight leading-[1.15] text-balance", light ? "text-primary-foreground" : "text-primary")}>
      {title} {highlight && <span className={light ? "text-gold" : "text-gold-dark"}>{highlight}</span>}
    </h2>
    {subtitle && <p className={cn("mt-4 text-base md:text-lg leading-relaxed", light ? "text-primary-foreground/70" : "text-muted-foreground")}>{subtitle}</p>}
  </div>
);

export default SectionHeader;
