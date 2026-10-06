import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface Crumb { label: string; to?: string }

/** Header seragam untuk halaman dalam: jejak halaman + judul + subjudul. */
const PageHeader = ({ title, subtitle, crumbs = [], children }: { title: ReactNode; subtitle?: ReactNode; crumbs?: Crumb[]; children?: ReactNode }) => (
  <section className="relative overflow-hidden border-b border-border bg-secondary/60 pt-[104px] pb-10 md:pb-12">
    <div className="absolute inset-0 bg-dots opacity-60 pointer-events-none" />
    <div className="container mx-auto px-4 relative">
      <nav aria-label="Jejak halaman" className="mb-4">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <li><Link to="/" className="hover:text-primary">Beranda</Link></li>
          {crumbs.map((c, i) => (
            <li key={i} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5" />
              {c.to ? <Link to={c.to} className="hover:text-primary">{c.label}</Link> : <span className="text-foreground font-medium" aria-current="page">{c.label}</span>}
            </li>
          ))}
        </ol>
      </nav>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="max-w-3xl">
          <h1 className="text-3xl md:text-[2.75rem] font-extrabold tracking-tight leading-tight text-primary text-balance">{title}</h1>
          {subtitle && <p className="mt-3 text-base md:text-lg text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  </section>
);

export default PageHeader;
