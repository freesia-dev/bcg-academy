import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import Index from "./pages/Index";
import { SiteConfigProvider } from "./hooks/useSiteConfig";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import NotFound from "./pages/NotFound";
import PageFallback from "./components/site/PageFallback";
import Seo from "./components/site/Seo";

// Beranda dimuat langsung; halaman lain dipecah agar unduhan pertama ringan.
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const CoursesPage = lazy(() => import("./pages/CoursesPage"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate"));
const Register = lazy(() => import("./pages/Register"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const MyCourses = lazy(() => import("./pages/MyCourses"));
const Learn = lazy(() => import("./pages/Learn"));
const Admin = lazy(() => import("./pages/Admin"));
const SiteConfigAdmin = lazy(() => import("./pages/SiteConfigAdmin"));

/** Halaman pribadi/akun: tidak diindeks mesin pencari. */
const Private = ({ title, children }: { title: string; children: React.ReactNode }) => (<><Seo title={title} noindex />{children}</>);

const queryClient = new QueryClient();

// Alamat lama /program-pelatihan tetap berfungsi, diarahkan ke katalog yang baru
const LegacyProgram = () => { const { slug } = useParams(); return <Navigate to={`/kursus/${slug}`} replace />; };

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SiteConfigProvider>
        <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/registration" element={<Navigate to="/kursus" replace />} />
          <Route path="/program-pelatihan" element={<Navigate to="/kursus" replace />} />
          <Route path="/program-pelatihan/:slug" element={<LegacyProgram />} />
          <Route path="/tentang-kami" element={<AboutPage />} />
          <Route path="/kontak" element={<ContactPage />} />
          <Route path="/auth" element={<Private title="Masuk / Daftar Akun"><Auth /></Private>} />
          <Route path="/reset-password" element={<Private title="Atur Ulang Password"><ResetPassword /></Private>} />
          <Route path="/admin" element={<Private title="Panel Admin"><Admin /></Private>} />
          <Route path="/admin/konfigurasi" element={<Private title="Konfigurasi Situs"><SiteConfigAdmin /></Private>} />
          <Route path="/kursus" element={<CoursesPage />} />
          <Route path="/verifikasi" element={<VerifyCertificate />} />
          <Route path="/verifikasi/:code" element={<VerifyCertificate />} />
          <Route path="/kursus/:slug" element={<CourseDetail />} />
          <Route path="/daftar/:slug" element={<Private title="Formulir Pendaftaran"><Register /></Private>} />
          <Route path="/kursus-saya" element={<Private title="Dashboard Saya"><ProtectedRoute><MyCourses /></ProtectedRoute></Private>} />
          <Route path="/learn/:slug" element={<Private title="Ruang Belajar"><ProtectedRoute><Learn /></ProtectedRoute></Private>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </SiteConfigProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
