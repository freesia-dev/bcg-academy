import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { useSiteConfig } from "@/hooks/useSiteConfig";

// Login Google belum diaktifkan di Supabase (Auth → Providers). Ubah ke true setelah diaktifkan.
const GOOGLE_ENABLED = import.meta.env.VITE_ENABLE_GOOGLE_LOGIN === "true";

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  phone: z.string().trim().min(8, "Nomor WA tidak valid").max(20),
  email: z.string().trim().email("Email tidak valid").max(255),
  password: z.string().min(6, "Password minimal 6 karakter").max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [params] = useSearchParams();
  const redirect = params.get("redirect");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { brand } = useSiteConfig();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [tab, setTab] = useState("login");

  const resendConfirm = async (email: string) => {
    const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${window.location.origin}/kursus-saya` } });
    if (error) return toast({ title: "Gagal mengirim ulang", description: error.message, variant: "destructive" });
    toast({ title: "Email konfirmasi dikirim ulang", description: "Cek inbox dan folder Spam." });
  };

  const routeAfterAuth = async (userId: string) => {
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin" || r.role === "superadmin");
    if (redirect) navigate(redirect, { replace: true });
    else navigate(isAdmin ? "/admin" : "/kursus-saya", { replace: true });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) routeAfterAuth(data.session.user.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!parsed.success) return toast({ title: "Periksa input", description: parsed.error.issues[0].message, variant: "destructive" });
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
    setLoading(false);
    if (error) {
      if (/confirm/i.test(error.message)) {
        setPendingEmail(parsed.data.email);
        return toast({ title: "Email belum dikonfirmasi", description: "Klik link konfirmasi di email Anda (cek juga folder Spam).", variant: "destructive" });
      }
      return toast({ title: "Login gagal", description: /invalid/i.test(error.message) ? "Email atau password salah." : error.message, variant: "destructive" });
    }
    toast({ title: "Berhasil masuk" });
    if (data.session) routeAfterAuth(data.session.user.id);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse({ full_name: name, phone, email: signupEmail, password: signupPassword });
    if (!parsed.success) return toast({ title: "Periksa input", description: parsed.error.issues[0].message, variant: "destructive" });
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/kursus-saya`,
        data: { full_name: parsed.data.full_name, phone: parsed.data.phone },
      },
    });
    setLoading(false);
    if (error) return toast({ title: "Pendaftaran gagal", description: error.message, variant: "destructive" });
    if (data.session) {
      toast({ title: "Akun dibuat", description: "Selamat datang!" });
      routeAfterAuth(data.session.user.id);
    } else {
      setPendingEmail(parsed.data.email);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth" },
    });
    if (error) {
      setLoading(false);
      toast({ title: "Google login gagal", description: String(error), variant: "destructive" });
      return;
    }
  };

  const handleForgot = async () => {
    if (!loginEmail) return toast({ title: "Isi email dulu di tab Masuk", variant: "destructive" });
    const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) return toast({ title: "Gagal kirim email", description: error.message, variant: "destructive" });
    toast({ title: "Email reset terkirim", description: "Cek inbox Anda." });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="Beranda"><img src={brand.logo} alt={brand.name} className="h-8 w-auto" /></Link>
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" />Beranda</Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="px-0">
            <CardTitle className="text-3xl font-extrabold tracking-tight text-primary">{tab === "signup" ? "Buat akun peserta" : "Selamat datang kembali"}</CardTitle>
            <CardDescription className="text-base">{tab === "signup" ? "Satu akun untuk mendaftar program, memantau status, dan mengunduh sertifikat." : "Masuk untuk melihat program dan status pendaftaran Anda."}</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {pendingEmail ? (
              <div className="text-center space-y-4 py-2">
                <MailCheck className="h-12 w-12 mx-auto text-gold" />
                <div>
                  <p className="font-semibold text-lg">Cek email Anda</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Kami mengirim link konfirmasi ke <strong>{pendingEmail}</strong>. Klik link tersebut untuk mengaktifkan akun
                    (cek juga folder <strong>Spam/Promosi</strong>).
                  </p>
                </div>
                <Button variant="outline" className="w-full" onClick={() => resendConfirm(pendingEmail)}>Kirim ulang email konfirmasi</Button>
                <button type="button" className="text-xs text-muted-foreground underline" onClick={() => { setPendingEmail(null); setTab("login"); }}>
                  Sudah konfirmasi? Masuk di sini
                </button>
              </div>
            ) : (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-2 h-11">
                <TabsTrigger value="login">Masuk</TabsTrigger>
                <TabsTrigger value="signup">Daftar</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 pt-4">
                  <div><Label>Email</Label><Input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} /></div>
                  <div><Label>Password</Label><Input type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} /></div>
                  <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Masuk</Button>
                  <button type="button" onClick={handleForgot} className="text-xs text-muted-foreground hover:text-gold underline w-full text-center">Lupa password?</button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4 pt-4">
                  <div><Label>Nama Lengkap</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
                  <div><Label>Nomor WhatsApp</Label><Input type="tel" required placeholder="08xxxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                  <div><Label>Email</Label><Input type="email" required value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} /></div>
                  <div><Label>Password</Label><Input type="password" required minLength={6} value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} /></div>
                  <Button type="submit" size="lg" variant="gold" className="w-full" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Buat akun</Button>
                </form>
              </TabsContent>
            </Tabs>
            )}

            {GOOGLE_ENABLED && !pendingEmail && (
              <>

                <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">atau</span></div>
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
              Masuk dengan Google
            </Button>
              </>
            )}
          </CardContent>
        </Card>
        </div>
        </div>
      </div>
      <aside className="relative hidden lg:flex overflow-hidden bg-navy-mesh p-12 text-primary-foreground">
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        <div className="relative mt-auto max-w-md">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold">{brand.name}</p>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight">Belajar keterampilan yang langsung terpakai.</h2>
          <ul className="mt-8 space-y-4">
            {["Daftar program dan pantau statusnya dari satu tempat", "Materi pendukung dan jadwal pelatihan selalu bisa diakses", "Sertifikat kelulusan yang bisa diverifikasi online"].map((t) => (
              <li key={t} className="flex gap-3 text-primary-foreground/85"><CheckCircle2 className="h-5 w-5 shrink-0 text-gold" />{t}</li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
};

export default Auth;
