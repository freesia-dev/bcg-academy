import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Facebook, Instagram, Mail, MapPin, MessageCircle, Phone, Youtube } from "lucide-react";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { useCourses } from "@/hooks/useCourses";
import MobileBar from "@/components/site/MobileBar";

interface Props {
  /** false = sembunyikan bar bawah HP; elemen = ganti tombol utamanya */
  mobileBar?: false | ReactNode;
}

const Footer = ({ mobileBar }: Props) => {
  const { brand } = useSiteConfig();
  const { courses } = useCourses();

  const links = [
    { name: "Semua Program", to: "/kursus" },
    { name: "Tentang Kami", to: "/tentang-kami" },
    { name: "Kontak", to: "/kontak" },
    { name: "Verifikasi Sertifikat", to: "/verifikasi" },
    { name: "Masuk / Daftar Akun", to: "/auth" },
  ];
  const socials = [
    { url: brand.instagram, icon: Instagram, label: "Instagram" },
    { url: brand.facebook, icon: Facebook, label: "Facebook" },
    { url: brand.youtube, icon: Youtube, label: "YouTube" },
    { url: brand.tiktok, icon: null, label: "TikTok" },
  ].filter((s) => s.url);

  return (
    <>
      <footer className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-14 md:py-16">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
            <div className="space-y-5">
              <div className="inline-flex rounded-xl bg-white px-3 py-2">
                <img src={brand.logo} alt={brand.name} className="h-10 w-auto" />
              </div>
              <p className="text-sm leading-relaxed text-primary-foreground/70 max-w-xs">
                {brand.name} — {brand.tagline.toLowerCase()} di {brand.city.split(",")[0]}. Pelatihan berbasis kompetensi untuk siap kerja dan siap berwirausaha.
              </p>
              {socials.length > 0 && (
                <div className="flex gap-2">
                  {socials.map((s) => (
                    <a key={s.label} href={s.url} target="_blank" rel="noreferrer" aria-label={s.label}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-bold hover:bg-gold hover:text-primary transition-colors">
                      {s.icon ? <s.icon className="h-4 w-4" /> : "TT"}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gold mb-4">Program</h2>
              <ul className="space-y-2.5">
                {courses.map((c) => (
                  <li key={c.id}><Link to={`/kursus/${c.slug}`} className="text-sm text-primary-foreground/75 hover:text-white">{c.title}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gold mb-4">Tautan</h2>
              <ul className="space-y-2.5">
                {links.map((l) => (
                  <li key={l.to}><Link to={l.to} className="text-sm text-primary-foreground/75 hover:text-white">{l.name}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gold mb-4">Kontak</h2>
              <ul className="space-y-3 text-sm text-primary-foreground/80">
                <li className="flex gap-3"><MapPin className="h-4 w-4 mt-0.5 shrink-0 text-gold" /><span>{brand.address}<br />{brand.city}</span></li>
                <li className="flex gap-3"><Phone className="h-4 w-4 mt-0.5 shrink-0 text-gold" /><a href={`tel:${brand.phoneTel}`} className="hover:text-white">{brand.phoneDisplay}</a></li>
                <li className="flex gap-3"><Mail className="h-4 w-4 mt-0.5 shrink-0 text-gold" /><a href={`mailto:${brand.email}`} className="hover:text-white break-all">{brand.email}</a></li>
              </ul>
              <a href={`https://wa.me/${brand.whatsapp}`} target="_blank" rel="noreferrer"
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-gold px-5 text-sm font-semibold text-primary hover:bg-gold-light">
                <MessageCircle className="h-4 w-4" />Chat WhatsApp
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="container mx-auto px-4 py-5 flex flex-col gap-1 text-xs text-primary-foreground/55 md:flex-row md:justify-between">
            <span>© {new Date().getFullYear()} {brand.name}. Semua hak dilindungi.</span>
            <span>
              {brand.nib && <>NIB {brand.nib}</>}
              {brand.legalAddress && <> · Alamat terdaftar: {brand.legalAddress}</>}
            </span>
          </div>
        </div>
        {mobileBar !== false && <div className="h-[76px] md:hidden" />}
      </footer>
      {mobileBar !== false && <MobileBar primary={mobileBar || undefined} />}
    </>
  );
};

export default Footer;
