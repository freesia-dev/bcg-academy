import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Building2, CalendarDays, Check, CheckCircle2, Clock, Copy, Hourglass, Loader2, MailCheck,
  MapPin, MessageCircle, Upload, Users,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProgramVisual from "@/components/site/ProgramVisual";
import NotFound from "./NotFound";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCourse } from "@/hooks/useCourses";
import { useAuth } from "@/hooks/useAuth";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { availability, fetchBatches, fetchSeats, formatDate, formatDateRange, priceFor, regCode, rupiah, type Batch } from "@/lib/batches";
import { cn } from "@/lib/utils";

const db = supabase as any;
type Step = 1 | 2 | 3 | "done";
const METHODS = ["Transfer bank", "QRIS / e-wallet", "Tunai di kantor"];

const Register = () => {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { brand } = useSiteConfig();
  const { course, loading } = useCourse(slug);
  const { user, loading: authLoading } = useAuth();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [seats, setSeats] = useState<Record<string, number>>({});
  const [batchesLoaded, setBatchesLoaded] = useState(false);
  const [sel, setSel] = useState<string | null>(params.get("batch"));
  const [step, setStep] = useState<Step>(1);
  const [existing, setExisting] = useState<any>(null);

  // data diri
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [awaitEmail, setAwaitEmail] = useState<string | null>(null);

  // pembayaran
  const [payInfo, setPayInfo] = useState<any>(null);
  const [payNow, setPayNow] = useState(true);
  const [method, setMethod] = useState(METHODS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);

  const online = course?.type === "online";

  useEffect(() => {
    if (!course) return;
    (async () => {
      const [b, s] = await Promise.all([fetchBatches(course.id), fetchSeats(course.id)]);
      setBatches(b); setSeats(s); setBatchesLoaded(true);
    })();
    supabase.from("site_content").select("value").eq("key", "payment_info").maybeSingle().then(({ data }) => setPayInfo(data?.value || null));
  }, [course]);

  const openBatches = useMemo(() => batches.filter((b) => availability(b, seats[b.id]).open), [batches, seats]);

  // pilihan angkatan default
  useEffect(() => {
    if (!batchesLoaded || !course) return;
    if (online) { setSel("none"); return; }
    if (sel && (sel === "waitlist" || openBatches.some((b) => b.id === sel))) return;
    setSel(openBatches.length === 1 ? openBatches[0].id : openBatches.length === 0 ? "waitlist" : null);
  }, [batchesLoaded, course, online, openBatches]); // eslint-disable-line react-hooks/exhaustive-deps

  // lanjut otomatis ke langkah yang diminta (mis. setelah konfirmasi email)
  useEffect(() => {
    const want = Number(params.get("step"));
    if (!authLoading && batchesLoaded && want === 3 && user && sel) setStep(3);
  }, [authLoading, batchesLoaded, user, sel]); // eslint-disable-line react-hooks/exhaustive-deps

  // profil & pendaftaran yang sudah ada
  useEffect(() => {
    if (!user || !course) { setExisting(null); return; }
    setEmail(user.email || "");
    supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle().then(({ data }) => {
      setName(data?.full_name || (user.user_metadata?.full_name as string) || "");
      setPhone(data?.phone || (user.user_metadata?.phone as string) || "");
    });
    db.from("enrollments").select("id,status,batch_id").eq("user_id", user.id).eq("course_id", course.id).maybeSingle()
      .then(({ data }: any) => setExisting(data && !["cancelled", "rejected"].includes(data.status) ? data : null));
  }, [user, course]);

  if (loading || authLoading) {
    return <div className="min-h-screen"><Header /><div className="flex justify-center pt-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>;
  }
  if (!course) return <NotFound />;

  const batch = sel && sel !== "waitlist" && sel !== "none" ? batches.find((b) => b.id === sel) || null : null;
  const waitlist = sel === "waitlist";
  const amount = waitlist ? priceFor(course, null) : priceFor(course, batch);
  const needsPayment = !waitlist && amount > 0;
  const stepsList = online ? ["Data diri", "Konfirmasi"] : ["Pilih angkatan", "Data diri", "Konfirmasi"];
  const stepIndex = step === "done" ? stepsList.length : online ? (step === 3 ? 2 : 1) : (step as number);

  const goStep = (s: Step) => { setStep(s); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const keepParams = () => { const p = new URLSearchParams(params); if (sel) p.set("batch", sel); setParams(p, { replace: true }); };

  const validPhone = (p: string) => p.replace(/\D/g, "").length >= 9;

  const submitIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      if (name.trim().length < 2) return toast({ title: "Nama minimal 2 karakter", variant: "destructive" });
      if (!validPhone(phone)) return toast({ title: "Nomor WhatsApp tidak valid", variant: "destructive" });
      setBusy(true);
      await supabase.from("profiles").upsert({ id: user.id, full_name: name.trim(), phone: phone.trim() });
      setBusy(false);
      keepParams();
      return goStep(3);
    }
    setBusy(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (error) {
        if (/confirm/i.test(error.message)) return toast({ title: "Email belum dikonfirmasi", description: "Klik link konfirmasi di email Anda (cek juga folder Spam).", variant: "destructive" });
        return toast({ title: "Gagal masuk", description: /invalid/i.test(error.message) ? "Email atau password salah." : error.message, variant: "destructive" });
      }
      keepParams();
      return; // efek profil memuat data; peserta melihat ringkasan dan klik Lanjut
    }
    if (name.trim().length < 2) { setBusy(false); return toast({ title: "Nama minimal 2 karakter", variant: "destructive" }); }
    if (!validPhone(phone)) { setBusy(false); return toast({ title: "Nomor WhatsApp tidak valid", variant: "destructive" }); }
    if (password.length < 6) { setBusy(false); return toast({ title: "Password minimal 6 karakter", variant: "destructive" }); }
    const back = `${window.location.origin}/daftar/${slug}?batch=${sel || ""}&step=3`;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { emailRedirectTo: back, data: { full_name: name.trim(), phone: phone.trim() } },
    });
    setBusy(false);
    if (error) {
      return toast({ title: "Gagal membuat akun", description: /registered|exists/i.test(error.message) ? "Email ini sudah terdaftar. Pilih \"Sudah punya akun\" untuk masuk." : error.message, variant: "destructive" });
    }
    keepParams();
    if (data.session) return goStep(3);
    setAwaitEmail(email.trim());
  };

  const resend = async () => {
    if (!awaitEmail) return;
    const { error } = await supabase.auth.resend({ type: "signup", email: awaitEmail, options: { emailRedirectTo: `${window.location.origin}/daftar/${slug}?batch=${sel || ""}&step=3` } });
    toast(error ? { title: "Gagal mengirim ulang", description: error.message, variant: "destructive" } : { title: "Email konfirmasi dikirim ulang" });
  };

  const submit = async () => {
    if (!user) return goStep(2);
    if (needsPayment && payNow && !file) return toast({ title: "Pilih file bukti pembayaran", description: "Atau pilih \"Bayar nanti\".", variant: "destructive" });
    if (file && file.size > 5 * 1024 * 1024) return toast({ title: "Ukuran file maksimal 5 MB", variant: "destructive" });
    setBusy(true);
    let proofPath: string | null = null;
    if (needsPayment && payNow && file) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      proofPath = `${user.id}/${course.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(proofPath, file);
      if (upErr) { setBusy(false); return toast({ title: "Gagal mengunggah bukti", description: upErr.message, variant: "destructive" }); }
    }
    const { data, error } = await db.rpc("register_program", {
      _course_id: course.id,
      _batch_id: batch ? batch.id : null,
      _method: needsPayment ? method : null,
      _proof_path: proofPath,
      _note: note || null,
    });
    setBusy(false);
    if (error) return toast({ title: "Pendaftaran gagal", description: error.message, variant: "destructive" });
    if (proofPath) supabase.functions.invoke("notify-payment", { body: { course_id: course.id, course_title: course.title, amount } }).catch(() => {});
    setResult(data);
    goStep("done");
  };

  const waConfirm = result
    ? `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(`Halo ${brand.name}, saya ${name || "peserta"} baru mendaftar program "${course.title}"${batch ? ` (${batch.name})` : ""}. Kode pendaftaran: ${regCode(result.id)}.`)}`
    : `https://wa.me/${brand.whatsapp}`;

  /* ---------------------------------- UI ---------------------------------- */

  const Summary = (
    <aside className="lg:sticky lg:top-24 h-fit rounded-2xl border border-border bg-card overflow-hidden">
      <div className="aspect-[21/9]"><ProgramVisual title={course.title} category={course.category} image={course.cover_image} /></div>
      <div className="p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gold-dark">Program</p>
          <p className="mt-1 font-bold text-primary leading-snug">{course.title}</p>
        </div>
        {!online && (
          <div className="text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-dark">Angkatan</p>
            {batch ? (
              <div className="mt-1 space-y-1 text-foreground">
                <p className="font-semibold">{batch.name}</p>
                <p className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="h-4 w-4" />{formatDateRange(batch.start_date, batch.end_date)}</p>
                {batch.schedule && <p className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" />{batch.schedule}</p>}
                {batch.location && <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" />{batch.location}</p>}
              </div>
            ) : waitlist ? <p className="mt-1 text-muted-foreground">Daftar minat — dikabari saat jadwal dibuka</p>
              : <p className="mt-1 text-muted-foreground">Belum dipilih</p>}
          </div>
        )}
        <div className="flex items-baseline justify-between border-t border-border pt-4">
          <span className="text-sm text-muted-foreground">{waitlist ? "Perkiraan biaya" : "Biaya"}</span>
          <span className="text-xl font-extrabold text-primary">{rupiah(amount)}</span>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen">
      <Header />
      <section className="border-b border-border bg-secondary/60 pt-[104px] pb-8">
        <div className="container mx-auto px-4">
          <Link to={`/kursus/${course.slug}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" />Kembali ke detail program</Link>
          <h1 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight text-primary">Pendaftaran: {course.title}</h1>
          <ol className="mt-6 flex flex-wrap items-center gap-2 sm:gap-3" aria-label="Langkah pendaftaran">
            {stepsList.map((label, i) => {
              const n = i + 1, done = stepIndex > n || step === "done", current = stepIndex === n && step !== "done";
              return (
                <li key={label} className="flex items-center gap-2 sm:gap-3">
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                    done ? "bg-green-600 text-white" : current ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground")}>
                    {done ? <Check className="h-4 w-4" /> : n}
                  </span>
                  <span className={cn("text-sm font-medium", current ? "text-primary" : "text-muted-foreground")} aria-current={current ? "step" : undefined}>{label}</span>
                  {i < stepsList.length - 1 && <span className="hidden sm:block h-px w-8 bg-border" />}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <main className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          {existing && step !== "done" && (
            <div className="mb-6 rounded-xl border border-primary/20 bg-secondary p-4 text-sm flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <span>Anda sudah terdaftar di program ini. Status dan langkah berikutnya ada di Dashboard Saya.</span>
              <Button size="sm" onClick={() => navigate("/kursus-saya")}>Buka Dashboard Saya</Button>
            </div>
          )}

          {step === "done" && result ? (
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-600/10">
                {result.status === "waitlist" ? <Hourglass className="h-8 w-8 text-green-700" /> : <CheckCircle2 className="h-8 w-8 text-green-700" />}
              </div>
              <h2 className="mt-5 text-2xl md:text-3xl font-extrabold text-primary">
                {result.status === "waitlist" ? "Anda masuk daftar minat" : result.status === "active" ? "Pendaftaran berhasil!" : "Pendaftaran terkirim"}
              </h2>
              <p className="mt-3 text-muted-foreground">
                {result.status === "waitlist" && "Kami akan menghubungi Anda lewat WhatsApp begitu jadwal angkatan berikutnya dibuka."}
                {result.status === "active" && (batch ? `Kursi Anda di ${batch.name} sudah aman. Sampai jumpa ${batch.start_date ? `pada ${formatDate(batch.start_date)}` : "di kelas"}!` : "Anda sudah bisa mulai belajar dari Dashboard Saya.")}
                {result.status === "pending_payment" && (result.payment_proof_url
                  ? "Bukti pembayaran Anda sedang diverifikasi admin (maksimal 1×24 jam). Kursi Anda sudah kami catat."
                  : "Kursi Anda sudah kami catat. Selesaikan pembayaran lalu unggah buktinya dari Dashboard Saya.")}
              </p>
              <div className="mt-6 inline-flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-3">
                <span className="text-sm text-muted-foreground">Kode pendaftaran</span>
                <span className="font-mono text-lg font-bold text-primary">{regCode(result.id)}</span>
                <button type="button" aria-label="Salin kode" onClick={() => { navigator.clipboard?.writeText(regCode(result.id)); toast({ title: "Kode disalin" }); }} className="text-muted-foreground hover:text-primary"><Copy className="h-4 w-4" /></button>
              </div>
              <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
                <Button asChild size="lg" variant="gold"><a href={waConfirm} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />Konfirmasi via WhatsApp</a></Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/kursus-saya")}>Buka Dashboard Saya</Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
              <div className="min-w-0">
                {/* LANGKAH 1 — ANGKATAN */}
                {step === 1 && !online && (
                  <section aria-labelledby="s1">
                    <h2 id="s1" className="text-xl font-bold text-primary">Pilih angkatan</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Pilih jadwal yang paling cocok untuk Anda.</p>
                    {!batchesLoaded ? (
                      <div className="mt-5 space-y-3">{[0, 1].map((i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}</div>
                    ) : (
                      <div className="mt-5 space-y-3" role="radiogroup">
                        {batches.map((b) => {
                          const av = availability(b, seats[b.id]);
                          const chosen = sel === b.id;
                          return (
                            <button key={b.id} type="button" role="radio" aria-checked={chosen} disabled={!av.open} onClick={() => setSel(b.id)}
                              className={cn("w-full text-left rounded-xl border bg-card p-4 sm:p-5 transition-all",
                                chosen ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40",
                                !av.open && "opacity-60 cursor-not-allowed hover:border-border")}>
                              <div className="flex items-start gap-3">
                                <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2", chosen ? "border-primary" : "border-muted-foreground/40")}>
                                  {chosen && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="font-bold text-primary">{b.name}</span>
                                    {av.open
                                      ? <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", av.left !== null && av.left <= 5 ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800")}>{av.left === null ? "Kursi tersedia" : `Sisa ${av.left} kursi`}</span>
                                      : <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{av.reason}</span>}
                                  </div>
                                  <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                                    <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{formatDateRange(b.start_date, b.end_date)}</span>
                                    {b.schedule && <span className="flex items-center gap-2"><Clock className="h-4 w-4" />{b.schedule}</span>}
                                    {b.location && <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{b.location}</span>}
                                    {b.registration_deadline && <span className="flex items-center gap-2"><Users className="h-4 w-4" />Daftar sebelum {formatDate(b.registration_deadline)}</span>}
                                  </div>
                                  {b.price != null && <p className="mt-2 text-sm font-semibold text-primary">{rupiah(b.price)}</p>}
                                  {b.notes && <p className="mt-2 text-sm text-muted-foreground">{b.notes}</p>}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                        {openBatches.length === 0 && (
                          <button type="button" role="radio" aria-checked={waitlist} onClick={() => setSel("waitlist")}
                            className={cn("w-full text-left rounded-xl border bg-card p-5", waitlist ? "border-primary ring-2 ring-primary/20" : "border-border")}>
                            <div className="flex items-start gap-3">
                              <Hourglass className="h-5 w-5 text-gold-dark mt-0.5" />
                              <div>
                                <p className="font-bold text-primary">Belum ada jadwal angkatan yang dibuka</p>
                                <p className="mt-1 text-sm text-muted-foreground">Daftar sebagai <strong>daftar minat</strong>. Kami kabari lewat WhatsApp saat jadwal berikutnya dibuka, tanpa biaya apa pun sekarang.</p>
                              </div>
                            </div>
                          </button>
                        )}
                      </div>
                    )}
                    <div className="mt-6 flex justify-end">
                      <Button size="lg" disabled={!sel} onClick={() => { keepParams(); goStep(2); }}>Lanjut ke data diri<ArrowRight className="h-4 w-4" /></Button>
                    </div>
                  </section>
                )}

                {/* LANGKAH 2 — DATA DIRI */}
                {(step === 2 || (step === 1 && online)) && (
                  <section aria-labelledby="s2">
                    {awaitEmail ? (
                      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 text-center">
                        <MailCheck className="mx-auto h-12 w-12 text-gold-dark" />
                        <h2 className="mt-4 text-xl font-bold text-primary">Satu langkah lagi: konfirmasi email</h2>
                        <p className="mt-2 text-muted-foreground">Kami mengirim link ke <strong>{awaitEmail}</strong>. Klik link itu (cek juga folder Spam), dan Anda akan langsung kembali ke langkah terakhir pendaftaran ini.</p>
                        <div className="mt-5 flex flex-col sm:flex-row justify-center gap-2">
                          <Button variant="outline" onClick={resend}>Kirim ulang email</Button>
                          <Button asChild variant="ghost"><a href={`https://wa.me/${brand.whatsapp}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />Butuh bantuan?</a></Button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={submitIdentity} className="rounded-2xl border border-border bg-card p-5 sm:p-7 space-y-5">
                        <div>
                          <h2 id="s2" className="text-xl font-bold text-primary">Data diri</h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {user ? <>Masuk sebagai <strong className="text-foreground">{user.email}</strong>. Pastikan nama dan nomor WhatsApp sudah benar.</>
                              : "Kami membuatkan akun peserta agar Anda bisa memantau status pendaftaran dan mengunduh sertifikat."}
                          </p>
                        </div>
                        {!user && (
                          <div className="grid grid-cols-2 rounded-lg bg-muted p-1 text-sm font-medium">
                            {(["signup", "login"] as const).map((m) => (
                              <button key={m} type="button" onClick={() => setMode(m)} className={cn("h-9 rounded-md", mode === m ? "bg-card text-primary shadow-soft" : "text-muted-foreground")}>
                                {m === "signup" ? "Saya peserta baru" : "Sudah punya akun"}
                              </button>
                            ))}
                          </div>
                        )}
                        {(user || mode === "signup") && (
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2"><Label htmlFor="nm">Nama lengkap (sesuai KTP)</Label><Input id="nm" className="mt-1.5 h-11" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
                            <div><Label htmlFor="ph">Nomor WhatsApp</Label><Input id="ph" className="mt-1.5 h-11" required type="tel" inputMode="tel" placeholder="08xxxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /></div>
                            {!user && <div><Label htmlFor="em">Email</Label><Input id="em" className="mt-1.5 h-11" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>}
                            {!user && <div className="sm:col-span-2"><Label htmlFor="pw">Buat password</Label><Input id="pw" className="mt-1.5 h-11" required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /><p className="mt-1 text-xs text-muted-foreground">Minimal 6 karakter. Dipakai untuk masuk ke Dashboard Saya.</p></div>}
                          </div>
                        )}
                        {!user && mode === "login" && (
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div><Label htmlFor="lem">Email</Label><Input id="lem" className="mt-1.5 h-11" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
                            <div><Label htmlFor="lpw">Password</Label><Input id="lpw" className="mt-1.5 h-11" required type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></div>
                          </div>
                        )}
                        {(user || mode === "signup") && (
                          <div><Label htmlFor="nt">Catatan untuk admin (opsional)</Label><Textarea id="nt" className="mt-1.5" rows={2} placeholder="Misalnya: saya hanya bisa hadir sore hari" value={note} onChange={(e) => setNote(e.target.value)} /></div>
                        )}
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-2">
                          {!online ? <Button type="button" variant="ghost" onClick={() => goStep(1)}><ArrowLeft className="h-4 w-4" />Ganti angkatan</Button> : <span />}
                          <Button type="submit" size="lg" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{user ? "Lanjut ke konfirmasi" : mode === "login" ? "Masuk" : "Buat akun & lanjut"}<ArrowRight className="h-4 w-4" /></Button>
                        </div>
                      </form>
                    )}
                  </section>
                )}

                {/* LANGKAH 3 — KONFIRMASI */}
                {step === 3 && (
                  <section aria-labelledby="s3" className="space-y-5">
                    <div className="rounded-2xl border border-border bg-card p-5 sm:p-7">
                      <h2 id="s3" className="text-xl font-bold text-primary">Periksa & kirim pendaftaran</h2>
                      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <div><dt className="text-muted-foreground">Nama</dt><dd className="font-semibold">{name || "—"}</dd></div>
                        <div><dt className="text-muted-foreground">WhatsApp</dt><dd className="font-semibold">{phone || "—"}</dd></div>
                        <div><dt className="text-muted-foreground">Email</dt><dd className="font-semibold break-all">{user?.email}</dd></div>
                        {!online && <div><dt className="text-muted-foreground">Angkatan</dt><dd className="font-semibold">{batch ? batch.name : "Daftar minat"}</dd></div>}
                      </dl>
                      <button type="button" className="mt-3 text-sm font-semibold text-primary underline underline-offset-4" onClick={() => goStep(2)}>Ubah data diri</button>
                    </div>

                    {needsPayment && (
                      <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 space-y-4">
                        <div className="flex items-baseline justify-between">
                          <h3 className="text-lg font-bold text-primary">Pembayaran</h3>
                          <span className="text-lg font-extrabold text-primary">{rupiah(amount)}</span>
                        </div>
                        {payInfo && (
                          <div className="rounded-lg bg-secondary/70 p-4 text-sm">
                            <p className="flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4" />{payInfo.bank_name}</p>
                            <p className="mt-1 font-mono text-base">{payInfo.account_number}</p>
                            <p className="text-muted-foreground">a.n. {payInfo.account_holder}</p>
                            {payInfo.instructions && <p className="mt-2 text-xs text-muted-foreground">{payInfo.instructions}</p>}
                          </div>
                        )}
                        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
                          {[true, false].map((v) => (
                            <button key={String(v)} type="button" role="radio" aria-checked={payNow === v} onClick={() => setPayNow(v)}
                              className={cn("rounded-lg border p-3 text-left text-sm", payNow === v ? "border-primary ring-2 ring-primary/20" : "border-border")}>
                              <span className="font-semibold text-primary">{v ? "Saya sudah bayar" : "Bayar nanti"}</span>
                              <span className="block text-muted-foreground">{v ? "Unggah bukti sekarang" : "Kursi dicatat; bukti bisa diunggah dari Dashboard"}</span>
                            </button>
                          ))}
                        </div>
                        {payNow && (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div><Label>Metode pembayaran</Label>
                              <select className="mt-1.5 w-full h-11 rounded-md border bg-background px-3 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
                                {METHODS.map((m) => <option key={m}>{m}</option>)}
                              </select>
                            </div>
                            <div><Label>Bukti pembayaran (foto/PDF, maks. 5 MB)</Label>
                              <label className="mt-1.5 flex h-11 cursor-pointer items-center gap-2 rounded-md border border-dashed bg-background px-3 text-sm text-muted-foreground hover:border-primary/50">
                                <Upload className="h-4 w-4" /><span className="truncate">{file ? file.name : "Pilih file"}</span>
                                <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {waitlist && (
                      <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
                        Daftar minat tidak dipungut biaya. Pembayaran baru diminta setelah Anda dipindahkan ke angkatan yang dibuka.
                      </div>
                    )}

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
                      <Button type="button" variant="ghost" onClick={() => goStep(2)}><ArrowLeft className="h-4 w-4" />Kembali</Button>
                      <Button size="lg" variant="gold" onClick={submit} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{waitlist ? "Kirim daftar minat" : "Kirim pendaftaran"}</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Dengan mengirim, Anda menyetujui data Anda dipakai untuk keperluan pelatihan di {brand.name}.</p>
                  </section>
                )}
              </div>
              <div className="order-first lg:order-none">{Summary}</div>
            </div>
          )}
        </div>
      </main>
      <Footer mobileBar={false} />
    </div>
  );
};

export default Register;
