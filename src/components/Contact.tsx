import SectionHeader from "@/components/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, Clock, Send, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useSiteConfig } from "@/hooks/useSiteConfig";

const Contact = ({ showHeader = true }: { showHeader?: boolean }) => {
  const { brand, sections } = useSiteConfig();
  const c = sections.contact;
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const contactInfo = [
    { icon: Phone, title: "Telepon / WhatsApp", details: brand.phoneDisplay, subtitle: brand.hoursWeekday.replace(/^[^:]+:\s*/, "") ? brand.hoursWeekday : "" },
    { icon: Mail, title: "Email", details: brand.email, subtitle: "" },
    { icon: MapPin, title: "Alamat", details: brand.address, subtitle: brand.city },
    { icon: Clock, title: "Jam Operasional", details: brand.hoursWeekday, subtitle: brand.hoursWeekend },
  ];

  const sendWa = (e: React.FormEvent) => {
    e.preventDefault();
    const text = `Halo ${brand.name}, saya ${form.name}${form.phone ? ` (${form.phone})` : ""}.\n\n${form.message || "Saya ingin bertanya tentang program pelatihan."}`;
    window.open(`https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <section id="contact" className="py-20 md:py-24 bg-card">
      <div className="container mx-auto px-4">
        {showHeader && <SectionHeader eyebrow={c.eyebrow} title={c.title} highlight={c.titleHighlight} subtitle={c.subtitle} />}

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-primary mb-6">Informasi Kontak</h3>
              <div className="space-y-6">
                {contactInfo.map((info, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <info.icon className="text-gold" size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-primary">{info.title}</h4>
                      <p className="text-foreground">{info.details}</p>
                      {info.subtitle && <p className="text-sm text-muted-foreground">{info.subtitle}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Card className="p-6 bg-gradient-to-br from-gold/5 to-corporate-blue/5 border-gold/20">
              <CardContent className="p-0 space-y-4">
                <h4 className="font-semibold text-primary">Hubungi Cepat</h4>
                <div className="space-y-3">
                  <Button variant="gold" className="w-full justify-start" onClick={() => (window.location.href = `tel:${brand.phoneTel}`)}>
                    <Phone size={16} className="mr-2" />Telepon Sekarang
                  </Button>
                  <Button variant="corporate" className="w-full justify-start" onClick={() => window.open(`https://wa.me/${brand.whatsapp}`, "_blank")}>
                    <MessageCircle size={16} className="mr-2" />Chat WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="p-6 md:p-8">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-2xl font-bold text-primary">{c.formTitle}</CardTitle>
                <p className="text-muted-foreground">{c.formNote}</p>
              </CardHeader>
              <CardContent className="p-0">
                <form className="space-y-6" onSubmit={sendWa}>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-sm font-medium text-primary">Nama Lengkap *</label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama lengkap Anda" /></div>
                    <div className="space-y-2"><label className="text-sm font-medium text-primary">Nomor Telepon</label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08xxxxxxxxxx" /></div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-primary">Pesan</label>
                    <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tuliskan pertanyaan Anda, misalnya program yang diminati..." rows={4} />
                  </div>
                  <Button type="submit" variant="hero" size="lg" className="w-full">
                    <Send size={16} className="mr-2" />Kirim via WhatsApp
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-16">
          <Card className="overflow-hidden">
            <div className="relative w-full h-[320px] md:h-[400px]">
              <iframe src={brand.mapEmbed} className="absolute top-0 left-0 w-full h-full border-0" allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={`Lokasi ${brand.name}`} />
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Contact;
