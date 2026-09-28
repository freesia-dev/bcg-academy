import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import logoImage from "@/assets/logo-bcg.png";

const Footer = () => {
  const programs = [
    "Administrasi Perkantoran",
    "Barista Professional",
    "Rias Pengantin Gaun Panjang",
    "Desainer Grafis",
    "Operator Komputer",
    "Digital Marketing"
  ];

  const quickLinks = [
    { name: "Tentang Kami", to: "/tentang-kami" },
    { name: "Program Pelatihan", to: "/kursus" },
    { name: "Galeri", to: "/#gallery" },
    { name: "Kontak", to: "/kontak" },
  ];

  return (
    <footer className="bg-primary text-primary-foreground">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-4 gap-12">
          {/* Company Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="flex items-center gap-3">
              <img src={logoImage} alt="LPK Borneo Citra Gemilang" className="h-12 w-auto" />
              <div>
                <h3 className="text-lg font-bold">LPK Borneo Citra Gemilang</h3>
                <p className="text-xs text-primary-foreground/70">Lembaga Pelatihan Kerja</p>
              </div>
            </div>
            
            <p className="text-primary-foreground/80 text-sm leading-relaxed">
              Lembaga pelatihan kerja terpercaya di Bontang yang berkomitmen mencetak SDM unggul 
              dan berkompeten sesuai standar industri.
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-gold" />
                <span className="text-sm">+62 822 5418 7096</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-gold" />
                <span className="text-sm">lpk.borneocg@gmail.com</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-gold mt-0.5" />
                <span className="text-sm">Jl. Dewi Sartika Gg. Kulintang 4 No. 21<br />Kel. Bontang Baru, Kec. Bontang Utara<br />Kota Bontang 75311</span>
              </div>
              <p className="text-xs text-primary-foreground/60 pt-2">NIB: 3001250056199</p>
            </div>
          </div>

          {/* Programs */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-gold">Program Pelatihan</h4>
            <ul className="space-y-3">
              {programs.map((program, index) => (
                <li key={index}>
                  <Link
                    to="/kursus"
                    className="text-sm text-primary-foreground/80 hover:text-gold transition-colors duration-300"
                  >
                    {program}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-gold">Tautan Cepat</h4>
            <ul className="space-y-3">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <Link
                    to={link.to}
                    className="text-sm text-primary-foreground/80 hover:text-gold transition-colors duration-300"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact CTA */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-gold">Tetap Terhubung</h4>
            <p className="text-sm text-primary-foreground/80">
              Ada pertanyaan tentang program pelatihan? Chat langsung dengan tim kami.
            </p>
            <Button
              variant="gold"
              className="w-full justify-center"
              onClick={() => window.open("https://wa.me/6282254187096", "_blank")}
            >
              <MessageCircle size={16} className="mr-2" />Chat WhatsApp
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-primary-foreground/20">
        <div className="container mx-auto px-4 py-6">
          <div className="text-sm text-primary-foreground/70 text-center md:text-left">
            © 2025 LPK Borneo Citra Gemilang. Semua hak dilindungi undang-undang.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;