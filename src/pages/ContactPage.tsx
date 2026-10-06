import { useState } from "react";
import { Building2, Clock, ExternalLink, Facebook, Instagram, Mail, MapPin, MessageCircle, Music2, Phone, Send, Users, Youtube } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/site/PageHeader";
import Seo from "@/components/site/Seo";
import Faq from "@/components/Faq";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { useCourses } from "@/hooks/useCourses";
import { SITE_URL, breadcrumbLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

const TOPICS = [
  { id: "jadwal", label: "Jadwal angkatan terdekat", text: "Saya ingin tahu jadwal angkatan terdekat" },
  { id: "biaya", label: "Biaya & cara bayar", text: "Saya ingin bertanya tentang biaya dan cara pembayaran" },
  { id: "instansi", label: "Pelatihan untuk instansi", text: "Kami ingin mengadakan pelatihan untuk karyawan/anggota instansi kami" },
  { id: "bayar", label: "Konfirmasi pembayaran", text: "Saya ingin mengonfirmasi pembayaran pendaftaran" },
  { id: "lain", label: "Lainnya", text: "" },
];

const ContactPage = () => {
  const { brand, sections } = useSiteConfig();
  const { courses } = useCourses();
  const [topic, setTopic] = useState("jadwal");
  const [program, setProgram] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const city = brand.city.split(",")[0];
  const wa = (text: string) => `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(text)}`;
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${brand.name} ${brand.address} ${city}`)}`;

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const t = TOPICS.find((x) => x.id === topic);
    const lines = [
      `Halo ${brand.name}, saya ${form.name.trim()}${form.phone.trim() ? ` (${form.phone.trim()})` : ""}.`,
      [t?.text, program && `untuk program ${program}`].filter(Boolean).join(" ") + (t?.text ? "." : ""),
      form.message.trim(),
    ].filter((l) => l && l !== ".");
    window.open(wa(lines.join("\n\n")), "_blank", "noopener");
  };

  const cards = [
    { icon: MessageCircle, title: "WhatsApp", value: brand.phoneDisplay, note: "Respon tercepat", href: wa(`Halo ${brand.name}, saya ingin bertanya.`), cta: "Chat sekarang", primary: true },
    { icon: Phone, title: "Telepon", value: brand.phoneDisplay, note: brand.hoursWeekday, href: `tel:${brand.phoneTel}`, cta: "Telepon" },
    { icon: Mail, title: "Email", value: brand.email, note: "Untuk surat & penawaran resmi", href: `mailto:${brand.email}`, cta: "Kirim email" },
    { icon: Clock, title: "Jam operasional", value: brand.hoursWeekday, note: brand.hoursWeekend, href: "", cta: "" },
  ];
  const socials = [
    { url: brand.instagram, icon: Instagram, label: "Instagram" },
    { url: brand.facebook, icon: Facebook, label: "Facebook" },
    { url: brand.tiktok, icon: Music2, label: "TikTok" },
    { url: brand.youtube, icon: Youtube, label: "YouTube" },
  ].filter((s) => s.url);

  return (
    <div className="min-h-screen">
      <Seo title="Kontak" description={`Hubungi ${brand.name} di ${city}: WhatsApp ${brand.phoneDisplay}, email ${brand.email}, alamat ${brand.address}. Tanya jadwal, biaya, atau pelatihan untuk instansi.`}
        jsonLd={[
          {
            "@context": "https://schema.org", "@type": "ContactPage", url: `${SITE_URL}/kontak`, name: `Kontak ${brand.name}`,
            about: { "@id": `${SITE_URL}/#organization` },
          },
          breadcrumbLd([{ name: "Kontak", path: "/kontak" }]),
        ]} />
      <Header />
      <PageHeader crumbs={[{ label: "Kontak" }]} title="Hubungi kami" subtitle={sections.contact.subtitle} />

      <main>
        {/* Kartu kontak */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => (
              <div key={c.title} className={cn("rounded-2xl border p-6 flex flex-col", c.primary ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>
                <span className={cn("grid h-11 w-11 place-items-center rounded-xl", c.primary ? "bg-gold text-primary" : "bg-gold/15 text-gold-dark")}><c.icon className="h-5 w-5" /></span>
                <h2 className={cn("mt-4 text-sm font-semibold", c.primary ? "text-primary-foreground/80" : "text-muted-foreground")}>{c.title}</h2>
                <p className="mt-0.5 font-semibold break-words">{c.value}</p>
                {c.note && <p className={cn("text-sm mt-1", c.primary ? "text-primary-foreground/70" : "text-muted-foreground")}>{c.note}</p>}
                {c.href && (
                  <a href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
                    className={cn("mt-auto pt-4 text-sm font-semibold inline-flex items-center gap-1.5", c.primary ? "text-gold" : "text-primary")}>
                    {c.cta} →
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Form + lokasi */}
        <section className="pb-16 md:pb-20">
          <div className="container mx-auto px-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
              <h2 className="text-2xl font-bold text-primary">{sections.contact.formTitle || "Kirim pertanyaan"}</h2>
              <p className="mt-1 text-muted-foreground">{sections.contact.formNote || "Pesan Anda dikirim lewat WhatsApp, jadi balasan masuk langsung ke HP Anda."}</p>

              <form onSubmit={send} className="mt-6 space-y-5">
                <div>
                  <Label>Mau tanya tentang</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {TOPICS.map((t) => (
                      <button key={t.id} type="button" onClick={() => setTopic(t.id)} aria-pressed={topic === t.id}
                        className={cn("h-9 rounded-full border px-3.5 text-sm font-medium transition-colors",
                          topic === t.id ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-secondary")}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                {courses.length > 0 && topic !== "instansi" && (
                  <div>
                    <Label htmlFor="c-program">Program (opsional)</Label>
                    <select id="c-program" value={program} onChange={(e) => setProgram(e.target.value)} className="mt-1.5 h-11 w-full rounded-md border bg-background px-3 text-sm">
                      <option value="">Belum tahu / semua program</option>
                      {courses.map((c) => <option key={c.id} value={c.title}>{c.title}</option>)}
                    </select>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label htmlFor="c-name">Nama {topic === "instansi" ? "& instansi" : ""} *</Label><Input id="c-name" required className="mt-1.5 h-11" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={topic === "instansi" ? "Nama, jabatan, instansi" : "Nama lengkap"} /></div>
                  <div><Label htmlFor="c-phone">Nomor WhatsApp</Label><Input id="c-phone" inputMode="tel" className="mt-1.5 h-11" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08xxxxxxxxxx" /></div>
                </div>
                <div>
                  <Label htmlFor="c-msg">Pesan</Label>
                  <Textarea id="c-msg" rows={4} className="mt-1.5" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder={topic === "instansi" ? "Jumlah peserta, materi yang dibutuhkan, perkiraan waktu…" : "Tulis pertanyaan Anda…"} />
                </div>
                <Button type="submit" variant="gold" size="lg" className="w-full"><Send className="h-4 w-4 mr-2" />Kirim lewat WhatsApp</Button>
              </form>
            </div>

            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-muted">
                  <iframe src={brand.mapEmbed} title={`Lokasi ${brand.name}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                    className="absolute inset-0 h-full w-full border-0" allowFullScreen />
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex gap-3">
                    <Building2 className="h-5 w-5 shrink-0 text-gold-dark mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kantor & tempat pelatihan</p>
                      <p className="font-medium">{brand.address}</p>
                      <p className="text-sm text-muted-foreground">{brand.city}</p>
                    </div>
                  </div>
                  {brand.legalAddress && (
                    <div className="flex gap-3">
                      <MapPin className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alamat terdaftar</p>
                        <p className="text-sm text-muted-foreground">{brand.legalAddress}</p>
                      </div>
                    </div>
                  )}
                  <Button asChild variant="outline" className="w-full"><a href={mapsLink} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-2" />Buka di Google Maps</a></Button>
                </div>
              </div>
              {socials.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-sm font-semibold text-primary mb-3">Ikuti kegiatan kami</p>
                  <div className="flex flex-wrap gap-2">
                    {socials.map((s) => (
                      <a key={s.label} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border px-3.5 h-9 text-sm hover:bg-secondary">
                        <s.icon className="h-4 w-4" />{s.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Pelatihan untuk instansi */}
        <section className="pb-16 md:pb-20">
          <div className="container mx-auto px-4">
            <div className="relative overflow-hidden rounded-3xl bg-navy-mesh px-6 py-10 md:px-12 md:py-12 text-white">
              <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
                <div className="max-w-2xl">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold"><Users className="h-3.5 w-3.5" />Untuk perusahaan, sekolah & instansi</span>
                  <h2 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight text-balance">Butuh pelatihan untuk karyawan atau program CSR?</h2>
                  <p className="mt-2 text-white/80">Kami bisa menyusun kelas khusus sesuai kebutuhan: materi, jadwal, dan lokasi menyesuaikan. Peserta tetap mendapat sertifikat yang bisa diverifikasi online.</p>
                </div>
                <Button asChild variant="gold" size="lg">
                  <a href={wa(`Halo ${brand.name}, kami ingin mendiskusikan pelatihan untuk instansi kami.`)} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 mr-2" />Diskusikan kebutuhan</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <Faq />
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;
