import { Phone, Mail, MapPin, Clock, MessageCircle, ArrowRight, Award, Users, BookOpen, CheckCircle, Target } from "lucide-react";

type Props = { contentKey: string; value: any };

const SiteContentPreview = ({ contentKey, value: c }: Props) => {
  if (!c) return null;

  if (contentKey === "hero") {
    return (
      <div className="rounded-lg overflow-hidden border bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground">
        <span className="inline-block px-3 py-1 rounded-full bg-gold/20 text-gold text-xs font-semibold mb-3">
          {c.badge}
        </span>
        <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-2">
          {c.title_part1} <span className="text-gold">{c.title_highlight}</span> {c.title_part2}
        </h1>
        <p className="text-sm text-primary-foreground/80 mb-4">{c.subtitle}</p>
        <div className="flex flex-wrap gap-2 mb-6">
          <button className="px-4 py-2 rounded-md bg-gold text-primary text-sm font-semibold inline-flex items-center gap-1">
            {c.primary_cta} <ArrowRight size={14} />
          </button>
          <button className="px-4 py-2 rounded-md border border-primary-foreground/30 text-sm">
            {c.secondary_cta}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-primary-foreground/20">
          {[
            { icon: Users, v: c.stat_alumni, l: c.stat_alumni_label },
            { icon: BookOpen, v: c.stat_programs, l: c.stat_programs_label },
            { icon: Award, v: c.stat_year, l: c.stat_year_label },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <s.icon className="text-gold mx-auto mb-1" size={18} />
              <div className="font-bold">{s.v}</div>
              <div className="text-xs text-primary-foreground/70">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (contentKey === "about") {
    const features: string[] = Array.isArray(c.features) ? c.features : [];
    return (
      <div className="rounded-lg border p-6 bg-background space-y-4">
        <h2 className="text-2xl font-bold text-primary">
          {c.title_part1} <span className="text-gold">{c.title_highlight}</span>
        </h2>
        <p className="text-sm text-muted-foreground">{c.description}</p>
        <blockquote className="border-l-4 border-gold pl-3 italic text-sm text-muted-foreground">
          "{c.quote}"
          <footer className="not-italic mt-1 text-xs font-semibold text-primary">— {c.quote_author}</footer>
        </blockquote>
        <div>
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2 mb-2">
            <Target className="text-gold" size={16} /> Keunggulan
          </h3>
          <div className="space-y-1.5">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle className="text-gold mt-0.5 flex-shrink-0" size={14} />
                <span className="text-muted-foreground">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-md border p-3 bg-muted/30">
            <div className="text-xs font-semibold text-primary mb-1">Visi</div>
            <p className="text-xs text-muted-foreground">{c.vision}</p>
          </div>
          <div className="rounded-md border p-3 bg-muted/30">
            <div className="text-xs font-semibold text-primary mb-1">Misi</div>
            <p className="text-xs text-muted-foreground">{c.mission}</p>
          </div>
        </div>
        <blockquote className="italic text-sm text-primary text-center pt-2">"{c.footer_quote}"</blockquote>
      </div>
    );
  }

  if (contentKey === "contact") {
    const items = [
      { icon: Phone, t: "Telepon", d: c.phone, s: c.phone_hours },
      { icon: Mail, t: "Email", d: c.email, s: c.email_note },
      { icon: MapPin, t: "Alamat", d: c.address, s: c.city },
      { icon: Clock, t: "Jam", d: c.hours_weekday, s: c.hours_weekend },
    ];
    return (
      <div className="rounded-lg border p-6 bg-background space-y-4">
        <h2 className="text-2xl font-bold text-primary">
          {c.title_part1} <span className="text-gold">{c.title_highlight}</span>
        </h2>
        <p className="text-sm text-muted-foreground">{c.subtitle}</p>
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-md bg-gold/10 flex items-center justify-center flex-shrink-0">
                <it.icon className="text-gold" size={16} />
              </div>
              <div className="text-sm">
                <div className="font-semibold text-primary">{it.t}</div>
                <div className="text-foreground">{it.d}</div>
                <div className="text-xs text-muted-foreground">{it.s}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2 border-t">
          <button className="flex-1 px-3 py-2 rounded-md bg-gold text-primary text-xs font-semibold inline-flex items-center justify-center gap-1">
            <Phone size={12} /> {c.phone_tel}
          </button>
          <button className="flex-1 px-3 py-2 rounded-md bg-corporate-blue text-white text-xs font-semibold inline-flex items-center justify-center gap-1">
            <MessageCircle size={12} /> wa.me/{c.whatsapp}
          </button>
        </div>
        {c.map_embed_url && (
          <div className="rounded-md overflow-hidden border" style={{ paddingBottom: "40%", position: "relative" }}>
            <iframe src={c.map_embed_url} className="absolute inset-0 w-full h-full border-0" loading="lazy" title="Map preview" />
          </div>
        )}
      </div>
    );
  }

  if (contentKey === "payment_info") {
    return (
      <div className="rounded-lg border p-6 bg-background space-y-3">
        <h3 className="font-bold text-primary">Info Pembayaran</h3>
        <div className="rounded-md border-2 border-dashed border-gold/40 p-4 bg-gold/5">
          <div className="text-xs text-muted-foreground mb-1">Bank</div>
          <div className="font-semibold text-primary mb-3">{c.bank_name}</div>
          <div className="text-xs text-muted-foreground mb-1">No. Rekening</div>
          <div className="font-mono text-lg text-primary mb-3">{c.account_number}</div>
          <div className="text-xs text-muted-foreground mb-1">Atas Nama</div>
          <div className="font-semibold text-primary">{c.account_holder}</div>
        </div>
        <p className="text-sm text-muted-foreground whitespace-pre-line">{c.instructions}</p>
      </div>
    );
  }

  return null;
};

export default SiteContentPreview;
