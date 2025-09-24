import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, Clock, Send, MessageCircle } from "lucide-react";

const Contact = () => {
  const contactInfo = [
    {
      icon: Phone,
      title: "Telepon",
      details: "+62 548 123 4567",
      subtitle: "Senin - Jumat, 08:00 - 17:00",
      color: "gold"
    },
    {
      icon: Mail,
      title: "Email",
      details: "info@lpkborneocitragemilang.com",
      subtitle: "Respon dalam 24 jam",
      color: "corporate-blue"
    },
    {
      icon: MapPin,
      title: "Alamat",
      details: "Jl. Mulawarman No. 123",
      subtitle: "Bontang, Kalimantan Timur",
      color: "accent-red"
    },
    {
      icon: Clock,
      title: "Jam Operasional",
      details: "Senin - Jumat: 08:00 - 17:00",
      subtitle: "Sabtu: 08:00 - 12:00",
      color: "gold"
    }
  ];

  return (
    <section id="contact" className="py-20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-primary mb-4">
            Hubungi <span className="text-gradient">Kami</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Siap memulai perjalanan karir Anda? Hubungi kami untuk konsultasi gratis dan informasi lengkap 
            tentang program pelatihan yang tersedia.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Contact Information */}
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

            {/* Quick Actions */}
            <Card className="p-6 bg-gradient-to-br from-gold/5 to-corporate-blue/5 border-gold/20">
              <CardContent className="p-0 space-y-4">
                <h4 className="font-semibold text-primary">Hubungi Cepat</h4>
                <div className="space-y-3">
                  <Button variant="gold" className="w-full justify-start">
                    <Phone size={16} className="mr-2" />
                    Telepon Sekarang
                  </Button>
                  <Button variant="corporate" className="w-full justify-start">
                    <MessageCircle size={16} className="mr-2" />
                    Chat WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="p-8">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-2xl font-bold text-primary">
                  Kirim Pesan
                </CardTitle>
                <p className="text-muted-foreground">
                  Isi form di bawah ini dan tim kami akan menghubungi Anda dalam 24 jam.
                </p>
              </CardHeader>
              
              <CardContent className="p-0">
                <form className="space-y-6">
                  {/* Personal Info */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-primary">Nama Lengkap *</label>
                      <Input placeholder="Masukkan nama lengkap Anda" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-primary">Nomor Telepon *</label>
                      <Input placeholder="08xxxxxxxxxx" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-primary">Email *</label>
                    <Input type="email" placeholder="nama@email.com" />
                  </div>

                  {/* Program Interest */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-primary">Program yang Diminati</label>
                    <select className="w-full p-3 border border-input rounded-lg bg-background">
                      <option value="">Pilih program pelatihan</option>
                      <option value="administrasi">Administrasi Perkantoran</option>
                      <option value="barista">Barista Professional</option>
                      <option value="rias">Rias Pengantin Gaun Panjang</option>
                      <option value="desain">Desainer Grafis</option>
                      <option value="komputer">Operator Komputer</option>
                      <option value="digital">Digital Marketing</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-primary">Pesan</label>
                    <Textarea 
                      placeholder="Tuliskan pertanyaan atau pesan Anda di sini..."
                      rows={4}
                    />
                  </div>

                  {/* Submit Button */}
                  <Button variant="hero" size="lg" className="w-full">
                    <Send size={16} className="mr-2" />
                    Kirim Pesan
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Dengan mengirim pesan ini, Anda menyetujui kebijakan privasi kami.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Map Section */}
        <div className="mt-16">
          <Card className="overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-muted/20 to-muted/40 flex items-center justify-center">
              <div className="text-center space-y-4">
                <MapPin className="text-gold mx-auto" size={48} />
                <div>
                  <h3 className="text-xl font-semibold text-primary">Lokasi LPK Borneo Citra Gemilang</h3>
                  <p className="text-muted-foreground">Jl. Mulawarman No. 123, Bontang, Kalimantan Timur</p>
                </div>
                <Button variant="outline">
                  Buka di Google Maps
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Contact;