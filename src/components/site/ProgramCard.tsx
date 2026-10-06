import { Link } from "react-router-dom";
import { ArrowRight, Clock, Users } from "lucide-react";
import ProgramVisual from "./ProgramVisual";

export interface ProgramCardData {
  id: string; slug: string; title: string; description?: string | null; cover_image?: string | null;
  type?: string | null; category?: string | null; level?: string | null; duration?: string | null;
  capacity?: string | null; price?: number | null; is_free?: boolean | null;
}

export const formatPrice = (c: { price?: number | null; is_free?: boolean | null }) =>
  c.is_free || !c.price ? "Gratis" : `Rp ${Number(c.price).toLocaleString("id-ID")}`;

export const modeLabel = (t?: string | null) => (t === "online" ? "Online" : t === "blended" ? "Campuran" : "Tatap Muka");

const ProgramCard = ({ c }: { c: ProgramCardData }) => (
  <Link to={`/kursus/${c.slug}`}
    className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-medium hover:border-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <div className="relative aspect-[16/10] overflow-hidden">
      <ProgramVisual title={c.title} category={c.category} image={c.cover_image} className="transition-transform duration-500 group-hover:scale-[1.04]" />
      <span className="absolute top-3 left-3 rounded-full bg-card/95 px-2.5 py-1 text-xs font-semibold text-primary shadow-soft">{modeLabel(c.type)}</span>
    </div>
    <div className="flex flex-1 flex-col p-5">
      {c.level && <p className="text-xs font-semibold uppercase tracking-wider text-gold-dark mb-2">{c.level}</p>}
      <h3 className="text-lg font-bold leading-snug text-foreground group-hover:text-primary">{c.title}</h3>
      {c.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
      <div className="mt-4 mb-5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
        {c.duration && <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{c.duration}</span>}
        {c.capacity && <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{c.capacity}</span>}
      </div>
      <div className="mt-auto pt-4 flex items-center justify-between border-t border-border/70">
        <span className="font-bold text-primary">{formatPrice(c)}</span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
          Lihat detail <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </div>
  </Link>
);

export default ProgramCard;
