import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, Clock, Send, MessageCircle } from "lucide-react";
import { useSiteContent } from "@/hooks/useSiteContent";

const DEFAULTS = {
  title_part1: "Hubungi",
  title_highlight: "Kami",
  subtitle: "Siap memulai perjalanan karir Anda? Hubungi kami untuk konsultasi gratis dan informasi lengkap tentang program pelatihan yang tersedia.",
  phone: "0822 54187096",
  phone_hours: "Senin - Jumat, 08:00 - 17:00",
  email: "lpk.borneocg@gmail.com",
  email_note: "Respon dalam 24 jam",
  address: "Jl. Brigjend Katamso No. 41B",
  city: "Bontang, Kalimantan Timur",
  hours_weekday: "Senin - Jumat: 08:00 - 17:00",
  hours_weekend: "Sabtu: 08:00 - 12:00",
  whatsapp: "6282254187096",
  phone_tel: "082254187096",
  map_embed_url: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3989.8070829105063!2d117.46605467546635!3d0.13598616394783314!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x320a130010d879fd%3A0x65547125d8c222f5!2sBorneo%20Citra%20Gemilang!5e0!3m2!1sen!2sid!4v1759376856862!5m2!1sen!2sid",
};

const Contact = () => {
  const c = useSiteContent("contact", DEFAULTS);
  const contactInfo = [
    { icon: Phone, title: "Telepon", details: c.phone, subtitle: c.phone_hours, color: "gold" },
    { icon: Mail, title: "Email", details: c.email, subtitle: c.email_note, color: "corporate-blue" },
    { icon: MapPin, title: "Alamat", details: c.address, subtitle: c.city, color: "accent-red" },
    { icon: Clock, title: "Jam Operasional", details: c.hours_weekday, subtitle: c.hours_weekend, color: "gold" },
  ];

  return (
    <section id="contact" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-primary mb-4">
            {c.title_part1} <span className="text-gradient">{c.title_highlight}</span>
          </h2>
          <p className="text-lg text-muted-foreground">{c.subtitle}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-primary mb-6">Informasi Kontak</h3>
              <div className="space-y-6">
                {contactInfo.map((info, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className={`w-12 h-12 bg-${info.color}/10 rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <info.icon className={`text-${info.color}`} size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-primary">{info.title}</h4>
                      <p className="text-foreground">{info.details}</p>
                      <p className="text-sm text-muted-foreground">{info.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Card className="p-6 bg-gradient-to-br from-gold/5 to-corporate-blue/5 border-gold/20">
              <CardContent className="p-0 space-y-4">
                <h4 className="font-semibold text-primary">Hubungi Cepat</h4>
                <div className="space-y-3">
                  <Button variant="gold" className="w-full justify-start" onClick={() => (window.location.href = `tel:${c.phone_tel}`)}>
                    <Phone size={16} className="mr-2" />Telepon Sekarang
                  </Button>
                  <Button variant="corporate" className="w-full justify-start" onClick={() => window.open(`https://wa.me/${c.whatsapp}`, "_blank")}>
                    <MessageCircle size={16} className="mr-2" />Chat WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="p-8">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-2xl font-bold text-primary">Kirim Pesan</CardTitle>
                <p className="text-muted-foreground">Isi form di bawah ini dan tim kami akan menghubungi Anda dalam 24 jam.</p>
              </CardHeader>
              <CardContent className="p-0">
                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); window.open(`https://wa.me/${c.whatsapp}`, "_blank"); }}>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-sm font-medium text-primary">Nama Lengkap *</label><Input placeholder="Masukkan nama lengkap Anda" /></div>
                    <div className="space-y-2"><label className="text-sm font-medium text-primary">Nomor Telepon *</label><Input placeholder="08xxxxxxxxxx" /></div>
                  </div>
                  <div className="space-y-2"><label className="text-sm font-medium text-primary">Email *</label><Input type="email" placeholder="nama@email.com" /></div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-primary">Pesan</label>
                    <Textarea placeholder="Tuliskan pertanyaan atau pesan Anda di sini..." rows={4} />
                  </div>
                  <Button type="submit" variant="hero" size="lg" className="w-full">
                    <Send size={16} className="mr-2" />Kirim Pesan
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">Dengan mengirim pesan ini, Anda menyetujui kebijakan privasi kami.</p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-16">
          <Card className="overflow-hidden">
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe src={c.map_embed_url} className="absolute top-0 left-0 w-full h-full border-0" allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Lokasi LPK Borneo Citra Gemilang" />
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Contact;
