import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Award, BarChart3, CalendarDays, ClipboardCheck, ClipboardList, ExternalLink, GraduationCap, Images, Landmark, LayoutDashboard, Loader2,
  LogOut, Menu, Settings2, ShieldCheck, Users, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { cn } from "@/lib/utils";
import AdminOverview, { type AdminSection } from "@/components/admin/AdminOverview";
import RegistrantsAdmin, { type RegistrantFilter } from "@/components/admin/RegistrantsAdmin";
import BatchesManager from "@/components/admin/BatchesManager";
import ClassroomAdmin from "@/components/admin/ClassroomAdmin";
import CoursesAdmin from "@/components/admin/CoursesAdmin";
import ParticipantsAdmin from "@/components/admin/ParticipantsAdmin";
import ReportsAdmin from "@/components/admin/ReportsAdmin";
import CertificatesAdmin from "@/components/admin/CertificatesAdmin";
import SiteContentAdmin from "@/components/admin/SiteContentAdmin";
import GalleryAdmin from "@/components/admin/GalleryAdmin";
import RolesAdmin from "@/components/admin/RolesAdmin";

interface NavItem { id: AdminSection; label: string; icon: LucideIcon; title: string; desc: string; superadmin?: boolean }

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Operasional",
    items: [
      { id: "ringkasan", label: "Ringkasan", icon: LayoutDashboard, title: "Ringkasan", desc: "Apa yang perlu ditangani hari ini." },
      { id: "pendaftar", label: "Pendaftar & Bayar", icon: ClipboardList, title: "Pendaftar & Pembayaran", desc: "Verifikasi bukti bayar, masukkan pendaftar minat ke angkatan, dan kabari peserta lewat WhatsApp." },
      { id: "angkatan", label: "Angkatan", icon: CalendarDays, title: "Angkatan", desc: "Jadwal kelas per program: tanggal, lokasi, kuota, dan harga khusus. Hanya angkatan berstatus \"dibuka\" yang bisa dipilih pendaftar." },
      { id: "kelas", label: "Kelas & Absensi", icon: ClipboardCheck, title: "Kelas & Absensi", desc: "Catat kehadiran tiap pertemuan, tentukan siapa yang lulus, lalu terbitkan sertifikat ber-QR sekaligus." },
      { id: "peserta", label: "Progres Peserta", icon: Users, title: "Progres Peserta", desc: "Kemajuan belajar peserta: materi selesai, kuis lulus, dan persentase progres." },
    ],
  },
  {
    group: "Katalog",
    items: [
      { id: "program", label: "Program", icon: GraduationCap, title: "Program", desc: "Katalog yang tampil di situs. Atur deskripsi, biaya, syarat, FAQ, materi online, dan angkatan tiap program." },
      { id: "sertifikat", label: "Template Sertifikat", icon: Award, title: "Template Sertifikat", desc: "Desain sertifikat per program: teks, logo, tanda tangan, warna, dan QR verifikasi. Penerbitan dilakukan di menu Kelas & Absensi." },
    ],
  },
  {
    group: "Keuangan",
    items: [
      { id: "laporan", label: "Laporan", icon: BarChart3, title: "Laporan Keuangan", desc: "Rekap pembayaran per periode, siap diunduh." },
      { id: "rekening", label: "Rekening", icon: Landmark, title: "Rekening Pembayaran", desc: "Rekening tujuan transfer yang ditampilkan ke peserta saat mendaftar." },
    ],
  },
  {
    group: "Situs",
    items: [
      { id: "galeri", label: "Galeri Foto", icon: Images, title: "Galeri Foto", desc: "Foto kegiatan yang tampil di beranda." },
      { id: "roles", label: "Pengguna & Role", icon: ShieldCheck, title: "Pengguna & Role", desc: "Beri atau cabut akses admin. Hanya superadmin yang bisa mengubah role.", superadmin: true },
    ],
  },
];

const ALL_ITEMS = NAV.flatMap((g) => g.items);
const isSection = (v: string | null): v is AdminSection => !!v && ALL_ITEMS.some((i) => i.id === v);

const Admin = () => {
  const navigate = useNavigate();
  const { brand } = useSiteConfig();
  const [params, setParams] = useSearchParams();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [needsAction, setNeedsAction] = useState(0);

  const rawSection = params.get("menu");
  const section: AdminSection = isSection(rawSection) && (rawSection !== "roles" || isSuperadmin) ? rawSection : "ringkasan";
  const rawFilter = params.get("filter") as RegistrantFilter | null;

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth?redirect=/admin"); return; }
      setUserEmail(session.user.email || "");
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      const list = (roles || []).map((r: { role: string }) => r.role);
      const superadmin = list.includes("superadmin");
      setIsSuperadmin(superadmin);
      setIsAdmin(superadmin || list.includes("admin"));
      setChecking(false);
    };
    init();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (!session) navigate("/auth"); });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const refreshBadge = useCallback(async () => {
    const { count } = await (supabase as any)
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .or("and(status.eq.pending_payment,payment_proof_url.not.is.null),status.eq.waitlist");
    setNeedsAction(count || 0);
  }, []);

  useEffect(() => { if (isAdmin) refreshBadge(); }, [isAdmin, section, refreshBadge]);

  const go = (s: AdminSection, filter?: RegistrantFilter) => {
    const next = new URLSearchParams();
    if (s !== "ringkasan") next.set("menu", s);
    if (filter) next.set("filter", filter);
    setParams(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  };

  const logout = async () => { await supabase.auth.signOut(); navigate("/auth"); };

  if (checking) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center p-4 bg-muted/30">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-bold">Akun ini belum punya akses admin</h2>
            <p className="text-sm text-muted-foreground">Anda masuk sebagai <strong>{userEmail}</strong>. Minta superadmin memberi role admin untuk akun ini.</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={logout}>Keluar</Button>
              <Button asChild variant="gold"><Link to="/">Ke beranda</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const current = ALL_ITEMS.find((i) => i.id === section)!;

  const nav = (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Menu admin">
      {NAV.map((g) => {
        const items = g.items.filter((i) => !i.superadmin || isSuperadmin);
        return (
          <div key={g.group}>
            <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.group}</p>
            <ul className="space-y-0.5">
              {items.map((i) => {
                const active = i.id === section;
                return (
                  <li key={i.id}>
                    <button onClick={() => go(i.id)} aria-current={active ? "page" : undefined}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg px-3 h-10 text-sm font-medium transition-colors",
                        active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/80 hover:bg-secondary hover:text-foreground",
                      )}>
                      <i.icon className="h-[18px] w-[18px] shrink-0" />
                      <span className="flex-1 text-left">{i.label}</span>
                      {i.id === "pendaftar" && needsAction > 0 && (
                        <span className={cn("min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold grid place-items-center tabular-nums",
                          active ? "bg-gold text-primary" : "bg-gold/90 text-primary")}>{needsAction}</span>
                      )}
                    </button>
                  </li>
                );
              })}
              {g.group === "Situs" && isSuperadmin && (
                <li>
                  <Link to="/admin/konfigurasi" className="w-full flex items-center gap-3 rounded-lg px-3 h-10 text-sm font-medium text-foreground/80 hover:bg-secondary hover:text-foreground transition-colors">
                    <Settings2 className="h-[18px] w-[18px] shrink-0" />
                    <span className="flex-1">Konfigurasi Situs</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                </li>
              )}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  const brandBlock = (
    <div className="h-16 flex items-center gap-3 px-5 border-b shrink-0">
      <img src={brand.logo} alt={brand.name} className="h-7 w-auto" />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-l pl-3">Admin</span>
    </div>
  );

  const userBlock = (
    <div className="border-t p-3 space-y-1 shrink-0">
      <p className="px-3 pb-1 text-xs text-muted-foreground truncate" title={userEmail}>{userEmail}</p>
      <Link to="/" className="flex items-center gap-3 rounded-lg px-3 h-9 text-sm text-foreground/80 hover:bg-secondary transition-colors">
        <ExternalLink className="h-4 w-4" />Lihat situs
      </Link>
      <button onClick={logout} className="w-full flex items-center gap-3 rounded-lg px-3 h-9 text-sm text-foreground/80 hover:bg-secondary transition-colors">
        <LogOut className="h-4 w-4" />Keluar
      </button>
    </div>
  );

  let content: React.ReactNode;
  switch (section) {
    case "pendaftar": content = <RegistrantsAdmin initialFilter={rawFilter || "action"} initialBatch={params.get("batch")} />; break;
    case "angkatan": content = <BatchesManager />; break;
    case "kelas": content = <ClassroomAdmin initialBatch={params.get("batch")} />; break;
    case "peserta": content = <ParticipantsAdmin />; break;
    case "program": content = <CoursesAdmin />; break;
    case "sertifikat": content = <CertificatesAdmin />; break;
    case "laporan": content = <ReportsAdmin />; break;
    case "rekening": content = <SiteContentAdmin />; break;
    case "galeri": content = <GalleryAdmin />; break;
    case "roles": content = <RolesAdmin />; break;
    default: content = <AdminOverview onGo={go} />;
  }

  return (
    <div className="min-h-screen bg-muted/30 lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="hidden lg:flex flex-col sticky top-0 h-screen bg-card border-r">
        {brandBlock}
        {nav}
        {userBlock}
      </aside>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[280px] p-0 flex flex-col gap-0">
          <SheetTitle className="sr-only">Menu admin</SheetTitle>
          {brandBlock}
          {nav}
          {userBlock}
        </SheetContent>
      </Sheet>

      <div className="min-w-0">
        <header className="lg:hidden sticky top-0 z-30 h-14 bg-card/95 backdrop-blur border-b flex items-center gap-2 px-2">
          <Button variant="ghost" size="icon" aria-label="Buka menu" onClick={() => setMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold truncate flex-1">{current.label}</span>
          {needsAction > 0 && section !== "pendaftar" && (
            <button onClick={() => go("pendaftar", "action")} className="mr-2 h-7 px-2.5 rounded-full bg-gold/90 text-primary text-xs font-bold">
              {needsAction} perlu tindakan
            </button>
          )}
        </header>

        <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1320px]">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight">
              {section === "ringkasan" ? "Selamat datang di panel admin" : current.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl text-pretty">{current.desc}</p>
          </div>
          <div key={section}>{content}</div>
        </main>
      </div>
    </div>
  );
};

export default Admin;
