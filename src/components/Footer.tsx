import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Facebook, Instagram, Youtube, Linkedin } from "lucide-react";
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
    { name: "Tentang Kami", href: "#about" },
    { name: "Program Pelatihan", href: "#programs" },
    { name: "Galeri", href: "#gallery" },
    { name: "Kontak", href: "#contact" },
    { name: "Karir", href: "#career" },
    { name: "Blog", href: "#blog" }
  ];

  const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Youtube, href: "#", label: "YouTube" },
    { icon: Linkedin, href: "#", label: "LinkedIn" }
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
                <span className="text-sm">+62 548 123 4567</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-gold" />
                <span className="text-sm">info@lpkborneocitragemilang.com</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-gold mt-0.5" />
                <span className="text-sm">Jl. Mulawarman No. 123<br />Bontang, Kalimantan Timur</span>
              </div>
            </div>
          </div>

          {/* Programs */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-gold">Program Pelatihan</h4>
            <ul className="space-y-3">
              {programs.map((program, index) => (
                <li key={index}>
                  <a 
                    href="#programs" 
                    className="text-sm text-primary-foreground/80 hover:text-gold transition-colors duration-300"
                  >
                    {program}
                  </a>
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
                  <a 
                    href={link.href}
                    className="text-sm text-primary-foreground/80 hover:text-gold transition-colors duration-300"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter & Social */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-gold">Tetap Terhubung</h4>
            
            <div className="space-y-4">
              <p className="text-sm text-primary-foreground/80">
                Dapatkan informasi terbaru tentang program pelatihan dan lowongan kerja.
              </p>
              
              <div className="space-y-3">
                <input 
                  type="email" 
                  placeholder="Masukkan email Anda"
                  className="w-full px-4 py-2 rounded-lg bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground placeholder-primary-foreground/50 focus:outline-none focus:ring-2 focus:ring-gold"
                />
                <Button variant="gold" className="w-full">
                  Berlangganan Newsletter
                </Button>
              </div>
            </div>

            {/* Social Media */}
            <div className="space-y-4">
              <h5 className="font-semibold">Ikuti Kami</h5>
              <div className="flex gap-3">
                {socialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.href}
                    aria-label={social.label}
                    className="w-10 h-10 bg-primary-foreground/10 hover:bg-gold/20 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
                  >
                    <social.icon size={18} className="text-gold" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-primary-foreground/20">
        <div className="container mx-auto px-4 py-6">
          <div className="md:flex items-center justify-between">
            <div className="text-sm text-primary-foreground/70 mb-4 md:mb-0">
              © 2024 LPK Borneo Citra Gemilang. Semua hak dilindungi undang-undang.
            </div>
            
            <div className="flex flex-wrap gap-6 text-sm">
              <a href="#" className="text-primary-foreground/70 hover:text-gold transition-colors">
                Kebijakan Privasi
              </a>
              <a href="#" className="text-primary-foreground/70 hover:text-gold transition-colors">
                Syarat & Ketentuan
              </a>
              <a href="#" className="text-primary-foreground/70 hover:text-gold transition-colors">
                Sitemap
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;