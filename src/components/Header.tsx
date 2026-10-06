import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, ChevronDown, LayoutDashboard, LogOut, Menu, Settings, User as UserIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProgramLink { id: string; title: string; slug: string }

const NAV = [
  { name: "Beranda", to: "/" },
  { name: "Program", to: "/kursus", dropdown: true },
  { name: "Tentang Kami", to: "/tentang-kami" },
  { name: "Kontak", to: "/kontak" },
];

const Header = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [programs, setPrograms] = useState<ProgramLink[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, isSuperadmin } = useAuth();
  const { brand } = useSiteConfig();

  useEffect(() => {
    supabase.from("courses").select("id,title,slug").eq("is_published", true).order("sort_order")
      .then(({ data }) => setPrograms(data || []));
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const logout = async () => { await supabase.auth.signOut(); navigate("/"); };
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cn("relative px-3 py-2 text-[15px] font-medium rounded-md transition-colors",
      isActive ? "text-primary" : "text-muted-foreground hover:text-primary");

  return (
    <header className={cn(
      "fixed inset-x-0 top-0 z-50 transition-all duration-300",
      scrolled || open ? "bg-card/95 backdrop-blur border-b border-border shadow-soft" : "bg-background/80 backdrop-blur-sm border-b border-transparent",
    )}>
      <div className="container mx-auto px-4">
        <div className="flex h-[72px] items-center justify-between gap-4">
          <Link to="/" className="flex items-center shrink-0" aria-label={`${brand.name} — Beranda`}>
            <img src={brand.logo} alt={brand.name} className="h-10 w-auto" />
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Menu utama">
            {NAV.map((item) => item.dropdown ? (
              <div key={item.name} className="relative group">
                <NavLink to={item.to} className={(s) => cn(linkCls(s), "inline-flex items-center gap-1")}>
                  {item.name}<ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
                </NavLink>
                {programs.length > 0 && (
                  <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition-all absolute left-0 top-full pt-2">
                    <div className="w-72 rounded-xl border border-border bg-card p-2 shadow-strong">
                      {programs.map((p) => (
                        <Link key={p.id} to={`/kursus/${p.slug}`} className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary">
                          {p.title}
                        </Link>
                      ))}
                      <div className="my-1 border-t border-border" />
                      <Link to="/kursus" className="block rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-secondary">
                        Semua program →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <NavLink key={item.name} to={item.to} end={item.to === "/"} className={linkCls}>{item.name}</NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 h-10">
                    <UserIcon className="h-4 w-4" />
                    <span className="hidden lg:inline max-w-[140px] truncate">{user.user_metadata?.full_name || user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/kursus-saya")}><BookOpen className="mr-2 h-4 w-4" />Dashboard Saya</DropdownMenuItem>
                  {isAdmin && <DropdownMenuItem onClick={() => navigate("/admin")}><LayoutDashboard className="mr-2 h-4 w-4" />Panel Admin</DropdownMenuItem>}
                  {isSuperadmin && <DropdownMenuItem onClick={() => navigate("/admin/konfigurasi")}><Settings className="mr-2 h-4 w-4" />Konfigurasi Situs</DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}><LogOut className="mr-2 h-4 w-4" />Keluar</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" className="hidden lg:inline-flex h-10" onClick={() => navigate("/auth")}>Masuk</Button>
                <Button variant="gold" className="hidden md:inline-flex h-10" onClick={() => navigate("/kursus")}>Daftar Sekarang</Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="md:hidden" aria-label={open ? "Tutup menu" : "Buka menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-card max-h-[calc(100vh-72px)] overflow-y-auto">
          <nav className="container mx-auto px-4 py-4 space-y-1" aria-label="Menu seluler">
            {NAV.map((item) => (
              <div key={item.name}>
                <NavLink to={item.to} end={item.to === "/"}
                  className={({ isActive }) => cn("block rounded-lg px-3 py-3 text-base font-semibold", isActive ? "bg-secondary text-primary" : "text-foreground")}>
                  {item.name}
                </NavLink>
                {item.dropdown && programs.length > 0 && (
                  <div className="ml-3 border-l border-border pl-3 py-1">
                    {programs.map((p) => (
                      <Link key={p.id} to={`/kursus/${p.slug}`} className="block py-2 text-sm text-muted-foreground">{p.title}</Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="pt-3 grid gap-2">
              {user ? (
                <>
                  <Button variant="outline" className="h-11" onClick={() => navigate("/kursus-saya")}>Dashboard Saya</Button>
                  {isAdmin && <Button variant="outline" className="h-11" onClick={() => navigate("/admin")}>Panel Admin</Button>}
                  <Button variant="ghost" className="h-11" onClick={logout}>Keluar</Button>
                </>
              ) : (
                <>
                  <Button variant="gold" className="h-11" onClick={() => navigate("/kursus")}>Daftar Sekarang</Button>
                  <Button variant="outline" className="h-11" onClick={() => navigate("/auth")}>Masuk</Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
