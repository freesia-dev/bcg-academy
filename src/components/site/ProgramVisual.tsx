import { Briefcase, Coffee, GraduationCap, Megaphone, Monitor, Palette, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const RULES: { match: RegExp; icon: LucideIcon }[] = [
  { match: /barista|kopi|coffee/i, icon: Coffee },
  { match: /rias|make ?up|pengantin|kecantikan|beauty/i, icon: Sparkles },
  { match: /desain|design|grafis/i, icon: Palette },
  { match: /komputer|operator|it\b|office/i, icon: Monitor },
  { match: /digital|marketing|pemasaran/i, icon: Megaphone },
  { match: /administrasi|perkantoran|sekretaris/i, icon: Briefcase },
];

export const iconFor = (text: string): LucideIcon => RULES.find((r) => r.match.test(text))?.icon ?? GraduationCap;

/** Gambar program: foto cover bila ada, selain itu ilustrasi bermerek (bukan kotak kosong). */
const ProgramVisual = ({ title, category, image, className, size = "md" }: {
  title: string; category?: string | null; image?: string | null; className?: string; size?: "md" | "lg";
}) => {
  if (image) {
    return <img src={image} alt={title} loading="lazy" className={cn("w-full h-full object-cover", className)} />;
  }
  const Icon = iconFor(`${title} ${category ?? ""}`);
  return (
    <div className={cn("relative w-full h-full overflow-hidden bg-navy-mesh", className)} aria-hidden="true">
      <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
      <div className="absolute -right-10 -bottom-12 w-48 h-48 rounded-full border border-white/10" />
      <div className="absolute -right-2 -bottom-4 w-28 h-28 rounded-full border border-white/10" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={cn("rounded-2xl bg-gold/95 text-primary flex items-center justify-center shadow-glow", size === "lg" ? "w-24 h-24" : "w-16 h-16")}>
          <Icon className={size === "lg" ? "w-12 h-12" : "w-8 h-8"} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
};

export default ProgramVisual;
