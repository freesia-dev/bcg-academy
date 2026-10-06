import { Link } from "react-router-dom";
import { BadgeCheck, Building2, FileCheck2, MapPin, QrCode } from "lucide-react";
import { useSiteConfig } from "@/hooks/useSiteConfig";

/** Legalitas & lokasi: alasan calon peserta (dan HRD) bisa percaya. */
const Credentials = () => {
  const { brand } = useSiteConfig();
  const items = [
    brand.nib && {
      icon: FileCheck2, title: "Terdaftar resmi",
      body: <>Nomor Induk Berusaha (NIB) <span className="font-mono font-semibold text-foreground">{brand.nib}</span>.</>,
    },
    {
      icon: Building2, title: "Kantor & tempat pelatihan",
      body: <>{brand.address}{brand.city ? `, ${brand.city}` : ""}. <Link to="/kontak" className="font-semibold text-primary underline underline-offset-4">Lihat peta</Link></>,
    },
    brand.legalAddress && {
      icon: MapPin, title: "Alamat terdaftar",
      body: brand.legalAddress,
    },
    {
      icon: QrCode, title: "Sertifikat bisa dicek online",
      body: <>Setiap sertifikat punya QR dan nomor unik yang bisa diperiksa siapa pun di <Link to="/verifikasi" className="font-semibold text-primary underline underline-offset-4">halaman verifikasi</Link>.</>,
    },
  ].filter(Boolean) as { icon: typeof BadgeCheck; title: string; body: React.ReactNode }[];

  return (
    <section id="legalitas" className="py-16 md:py-20 bg-secondary/40 border-y border-border">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold-dark">Legalitas</p>
          <h2 className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight text-primary text-balance">Lembaga resmi, sertifikat yang bisa dipertanggungjawabkan</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <div key={it.title} className="rounded-2xl border border-border bg-card p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-gold"><it.icon className="h-5 w-5" /></span>
              <h3 className="mt-4 font-semibold text-primary">{it.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Credentials;
