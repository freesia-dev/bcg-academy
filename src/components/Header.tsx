import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import logoImage from "@/assets/logo-bcg.png";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigationItems = [
    { name: "Beranda", href: "#home" },
    { name: "Program Pelatihan", href: "#programs" },
    { name: "Tentang Kami", href: "#about" },
    { name: "Galeri", href: "#gallery" },
    { name: "Kontak", href: "#contact" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border shadow-md">
      <div className="container mx-auto px-4">
        {/* Top Contact Bar */}
        <div className="hidden lg:flex items-center justify-end py-2 text-sm text-muted-foreground border-b border-border/50">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Phone size={14} />
              <span>+62 548 123 4567</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={14} />
              <span>info@lpkborneocitragemilang.com</span>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="LPK Borneo Citra Gemilang" className="h-12 w-auto" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-primary">LPK Borneo Citra Gemilang</h1>
              <p className="text-xs text-muted-foreground">Lembaga Pelatihan Kerja</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-foreground hover:text-gold transition-colors duration-300 font-medium relative group"
              >
                {item.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gold transition-all duration-300 group-hover:w-full"></span>
              </a>
            ))}
          </nav>

          {/* CTA Button & Mobile Menu */}
          <div className="flex items-center gap-4">
            <Button variant="gold" className="hidden md:inline-flex">
              Daftar Sekarang
            </Button>
            
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={cn(
          "lg:hidden transition-all duration-300 overflow-hidden",
          isMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}>
          <nav className="py-4 space-y-4 border-t border-border">
            {navigationItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="block text-foreground hover:text-gold transition-colors duration-300 font-medium py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </a>
            ))}
            <Button variant="gold" className="w-full mt-4">
              Daftar Sekarang
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;