import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Phone, Mail, ChevronDown, User as UserIcon, LogOut, BookOpen, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logoImage from "@/assets/logo-bcg.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProgramLink { id: string; title: string; slug: string; }

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [programs, setPrograms] = useState<ProgramLink[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    supabase
      .from("courses")
      .select("id,title,slug")
      .eq("is_published", true)
      .order("sort_order")
      .then(({ data }) => setPrograms(data || []));
  }, []);

  useEffect(() => { setIsMenuOpen(false); }, [location.pathname]);

  const navigationItems = [
    { name: "Beranda", to: "/" },
    { name: "Kursus", to: "/kursus", hasDropdown: true },
    { name: "Tentang Kami", to: "/tentang-kami" },
    { name: "Galeri", to: "/#gallery" },
    { name: "Kontak", to: "/kontak" },
  ];

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/"); };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border shadow-md">
      <div className="container mx-auto px-4">
        <div className="hidden lg:flex items-center justify-end py-2 text-sm text-muted-foreground border-b border-border/50">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2"><Phone size={14} /><span>+62 822 5418 7096</span></div>
            <div className="flex items-center gap-2"><Mail size={14} /><span>lpk.borneocg@gmail.com</span></div>
          </div>
        </div>

        <div className="flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoImage} alt="LPK Borneo Citra Gemilang" className="h-12 w-auto" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-primary">LPK Borneo Citra Gemilang</h1>
              <p className="text-xs text-muted-foreground">Lembaga Pelatihan Kerja</p>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <div key={item.name} className="relative group">
                <Link
                  to={item.to}
                  className="text-foreground hover:text-gold transition-colors duration-300 font-medium relative inline-flex items-center gap-1"
                >
                  {item.name}
                  {item.hasDropdown && <ChevronDown size={14} />}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gold transition-all duration-300 group-hover:w-full"></span>
                </Link>
                {item.hasDropdown && programs.length > 0 && (
                  <div className="absolute left-0 top-full pt-3 hidden group-hover:block">
                    <div className="bg-background border border-border rounded-lg shadow-lg py-2 min-w-[260px]">
                      {programs.map((p) => (
                        <Link
                          key={p.id}
                          to={`/kursus/${p.slug}`}
                          className="block px-4 py-2 text-sm text-foreground hover:bg-secondary hover:text-gold transition-colors"
                        >
                          {p.title}
                        </Link>
                      ))}
                      <div className="border-t border-border my-1" />
                      <Link to="/kursus" className="block px-4 py-2 text-sm font-medium text-gold hover:bg-secondary">
                        Lihat Semua Kursus →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <UserIcon size={16} />
                    <span className="hidden md:inline max-w-[120px] truncate">{user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-background">
                  <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/kursus-saya")}><BookOpen className="mr-2 h-4 w-4" />Kursus Saya</DropdownMenuItem>
                  {isAdmin && <DropdownMenuItem onClick={() => navigate("/admin")}><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard Admin</DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" />Keluar</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="gold" className="hidden md:inline-flex" onClick={() => navigate('/auth')}>
                Masuk / Daftar
              </Button>
            )}
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>
        </div>

        <div className={cn("lg:hidden transition-all duration-300 overflow-hidden", isMenuOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0")}>
          <nav className="py-4 space-y-2 border-t border-border">
            {navigationItems.map((item) => (
              <div key={item.name}>
                <Link to={item.to} className="block text-foreground hover:text-gold font-medium py-2">
                  {item.name}
                </Link>
                {item.hasDropdown && (
                  <div className="pl-4 space-y-1">
                    {programs.map((p) => (
                      <Link key={p.id} to={`/program-pelatihan/${p.slug}`} className="block text-sm text-muted-foreground hover:text-gold py-1">
                        • {p.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Button variant="gold" className="w-full mt-4" onClick={() => window.location.href = '/registration'}>
              Daftar Sekarang
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
