import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, MessageCircle, Instagram, Facebook, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { usePrograms } from "@/hooks/usePrograms";

const Footer = () => {
  const { brand } = useSiteConfig();
  const { programs } = usePrograms();

  const quickLinks = [
    { name: "Tentang Kami", to: "/tentang-kami" },
    { name: "Program Pelatihan", to: "/kursus" },
    { name: "Galeri", to: "/#gallery" },
    { name: "Kontak", to: "/kontak" },
    { name: "Verifikasi Sertifikat", to: "/verifikasi" },
    { name: "Masuk / Daftar", to: "/auth" },
  ];
  const socials = [
    { url: brand.instagram, icon: Instagram, label: "Instagram" },
    { url: brand.facebook, icon: Facebook, label: "Facebook" },
    { url: brand.youtube, icon: Youtube, label: "YouTube" },
    { url: brand.tiktok, icon: null, label: "TikTok" },
  ].filter((s) => s.url);

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary-foreground/95 p-1.5 flex items-center justify-center shrink-0">
                <img src={brand.logo} alt={brand.name} className="max-h-full max-w-full object-contain" />
              </div>
              <div>
                <p className="text-lg font-bold leading-tight" style={{ fontFamily: "var(--font-heading)" }}>{brand.name}</p>
                <p className="text-xs text-primary-foreground/65">{brand.tagline}</p>
              </div>
            </div>
            <p className="text-primary-foreground/75 text-sm leading-relaxed">
              Pelatihan berbasis kompetensi di Bontang, membekali peserta dengan keterampilan siap kerja dan siap berwirausaha.
            </p>
            {socials.length > 0 && (
              <div className="flex gap-2">
                {socials.map((s) => (
                  <a key={s.label} href={s.url} target="_blank" rel="noreferrer" aria-label={s.label}
                    className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-gold hover:text-primary flex items-center justify-center text-xs font-bold transition-colors">
                    {s.icon ? <s.icon size={16} /> : "TT"}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <h4 className="text-base font-semibold text-gold">Program Pelatihan</h4>
            <ul className="space-y-2.5">
              {programs.map((p) => (
                <li key={p.id}>
                  <Link to={`/program-pelatihan/${p.slug}`} className="text-sm text-primary-foreground/75 hover:text-gold transition-colors">{p.title}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-5">
            <h4 className="text-base font-semibold text-gold">Tautan Cepat</h4>
            <ul className="space-y-2.5">
              {quickLinks.map((l) => (
                <li key={l.name}><Link to={l.to} className="text-sm text-primary-foreground/75 hover:text-gold transition-colors">{l.name}</Link></li>
              ))}
            </ul>
          </div>

          <div className="space-y-5">
            <h4 className="text-base font-semibold text-gold">Kontak</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/80">
              <li className="flex items-start gap-3"><MapPin size={16} className="text-gold mt-0.5 shrink-0" /><span>{brand.address}<br />{brand.city}</span></li>
              <li className="flex items-center gap-3"><Phone size={16} className="text-gold shrink-0" />{brand.phoneDisplay}</li>
              <li className="flex items-center gap-3"><Mail size={16} className="text-gold shrink-0" />{brand.email}</li>
            </ul>
            <Button variant="gold" className="w-full" onClick={() => window.open(`https://wa.me/${brand.whatsapp}`, "_blank")}>
              <MessageCircle size={16} className="mr-2" />Chat WhatsApp
            </Button>
          </div>
        </div>
      </div>

      <div className="border-t border-primary-foreground/15">
        <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row gap-2 md:justify-between text-xs text-primary-foreground/60 text-center md:text-left">
          <span>© {new Date().getFullYear()} {brand.name}. Semua hak dilindungi.</span>
          <span>
            {brand.nib && <>NIB {brand.nib}</>}
            {brand.legalAddress && <> • Alamat terdaftar: {brand.legalAddress}</>}
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
