import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import Index from "./pages/Index";
import Registration from "./pages/Registration";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Admin from "./pages/Admin";
import VerifyCertificate from "./pages/VerifyCertificate";
import Register from "./pages/Register";
import SiteConfigAdmin from "./pages/SiteConfigAdmin";
import { SiteConfigProvider } from "./hooks/useSiteConfig";
import CoursesPage from "./pages/CoursesPage";
import CourseDetail from "./pages/CourseDetail";
import MyCourses from "./pages/MyCourses";
import Learn from "./pages/Learn";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import NotFound from "./pages/NotFound";

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
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/registration" element={<Registration />} />
          <Route path="/program-pelatihan" element={<Navigate to="/kursus" replace />} />
          <Route path="/program-pelatihan/:slug" element={<LegacyProgram />} />
          <Route path="/tentang-kami" element={<AboutPage />} />
          <Route path="/kontak" element={<ContactPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/konfigurasi" element={<SiteConfigAdmin />} />
          <Route path="/kursus" element={<CoursesPage />} />
          <Route path="/verifikasi" element={<VerifyCertificate />} />
          <Route path="/verifikasi/:code" element={<VerifyCertificate />} />
          <Route path="/kursus/:slug" element={<CourseDetail />} />
          <Route path="/daftar/:slug" element={<Register />} />
          <Route path="/kursus-saya" element={<ProtectedRoute><MyCourses /></ProtectedRoute>} />
          <Route path="/learn/:slug" element={<ProtectedRoute><Learn /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </SiteConfigProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
