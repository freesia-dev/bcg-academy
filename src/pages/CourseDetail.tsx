import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Award, BarChart3, CalendarDays, CheckCircle2, ClipboardList, Clock, FileText, GraduationCap, Hourglass, Lock, MapPin, MessageCircle,
  MonitorPlay, PlayCircle, ShieldCheck, Users,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProgramVisual from "@/components/site/ProgramVisual";
import { formatPrice, modeLabel } from "@/components/site/ProgramCard";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useCourse } from "@/hooks/useCourses";
import { useAuth } from "@/hooks/useAuth";
import { useMyEnrollment } from "@/hooks/useEnrollments";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import NotFound from "./NotFound";
import Seo from "@/components/site/Seo";
import { breadcrumbLd, courseLd } from "@/lib/seo";
import { availability, fetchBatches, fetchSeats, formatDate, formatDateRange, priceFor, rupiah, type Batch } from "@/lib/batches";

const CourseDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const cfg = useSiteConfig();
  const { brand, sections } = cfg;
  const { course, modules, loading } = useCourse(slug);
  const { user } = useAuth();
  const { enrollment } = useMyEnrollment(user?.id, course?.id);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [seats, setSeats] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!course) return;
    Promise.all([fetchBatches(course.id), fetchSeats(course.id)]).then(([b, s2]) => { setBatches(b); setSeats(s2); });
  }, [course]);
  const openBatches = useMemo(() => batches.filter((b) => availability(b, seats[b.id]).open), [batches, seats]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 pt-32 pb-20 space-y-4">
          <div className="h-6 w-48 rounded bg-muted animate-pulse" />
          <div className="h-10 w-2/3 rounded bg-muted animate-pulse" />
          <div className="h-64 rounded-2xl bg-muted animate-pulse" />
        </div>
      </div>
    );
  }
  if (!course) return <NotFound />;

  const online = course.type === "online";
  const isFree = course.is_free || course.price === 0;
  const isActive = enrollment?.status === "active" || enrollment?.status === "completed";
  const isPending = enrollment?.status === "pending_payment";
  const isRejected = enrollment?.status === "rejected";
  const waText = encodeURIComponent(`Halo ${brand.name}, saya ingin bertanya tentang program "${course.title}".`);
  const waLink = `https://wa.me/${brand.whatsapp}?text=${waText}`;
  const highlights = (course.highlights || []).filter(Boolean);
  const courseFaq = ((course as any).faq || []) as { q: string; a: string }[];
  const faqItems = courseFaq.length ? courseFaq : sections.faq.items.slice(0, 4);
  const lessonCount = modules.reduce((n, m: any) => n + (m.lessons?.length || 0), 0);

  const isWaitlist = (enrollment?.status as string) === "waitlist";
  const nextBatch = openBatches[0];
  const shownPrice = priceFor(course, nextBatch || null);

  /** Tombol utama sesuai status peserta & jenis program. */
  const primaryAction = (block = true) => {
    const cls = block ? "w-full" : "flex-1";
    if (isActive) {
      return online
        ? <Button size="lg" className={cls} onClick={() => navigate(`/learn/${slug}`)}><PlayCircle className="h-4 w-4" />Buka kelas</Button>
        : <Button size="lg" className={cls} onClick={() => navigate("/kursus-saya")}>Lihat jadwal di Dashboard</Button>;
    }
    if (isPending || isRejected || isWaitlist) {
      return <Button size="lg" variant={isRejected ? "gold" : "outline"} className={cls} onClick={() => navigate("/kursus-saya")}>
        {isRejected ? "Perbaiki pembayaran" : isWaitlist ? "Anda di daftar minat" : "Lihat status pendaftaran"}
      </Button>;
    }
    return <Button asChild size="lg" variant="gold" className={cls}><Link to={`/daftar/${slug}`}>{!online && openBatches.length === 0 ? "Daftar minat" : "Daftar sekarang"}</Link></Button>;
  };

  const facts = [
    { icon: MonitorPlay, label: "Mode", value: modeLabel(course.type) },
    course.duration && { icon: Clock, label: "Durasi", value: course.duration },
    course.level && { icon: BarChart3, label: "Level", value: course.level },
    course.capacity && { icon: Users, label: "Kapasitas", value: course.capacity },
  ].filter(Boolean) as { icon: any; label: string; value: string }[];

  return (
    <div className="min-h-screen">
      <Seo title={`Pelatihan ${course.title}`}
        description={course.description || `Pelatihan ${course.title} di ${brand.name}, ${brand.city.split(",")[0]}. Lihat jadwal angkatan, biaya, dan daftar online.`}
        path={`/kursus/${course.slug}`} image={course.cover_image}
        jsonLd={[courseLd(cfg, course as any, batches), breadcrumbLd([{ name: "Program", path: "/kursus" }, { name: course.title, path: `/kursus/${course.slug}` }])]} />
      <Header />

      <section className="relative overflow-hidden border-b border-border bg-secondary/60 pt-[104px] pb-10">
        <div className="absolute inset-0 bg-dots opacity-60 pointer-events-none" />
        <div className="container mx-auto px-4 relative">
          <nav aria-label="Jejak halaman" className="mb-4 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary">Beranda</Link><span className="mx-1.5">/</span>
            <Link to="/kursus" className="hover:text-primary">Program</Link><span className="mx-1.5">/</span>
            <span className="text-foreground font-medium" aria-current="page">{course.title}</span>
          </nav>
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">{modeLabel(course.type)}</span>
              {course.level && <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-primary">{course.level}</span>}
            </div>
            <h1 className="text-3xl md:text-[2.75rem] font-extrabold tracking-tight leading-tight text-primary text-balance">{course.title}</h1>
            {course.description && <p className="mt-4 text-base md:text-lg leading-relaxed text-muted-foreground">{course.description}</p>}
            <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
              {facts.map((f) => (
                <div key={f.label} className="flex items-center gap-2 text-sm">
                  <f.icon className="h-4 w-4 text-gold-dark" />
                  <dt className="text-muted-foreground">{f.label}:</dt>
                  <dd className="font-semibold text-foreground">{f.value}</dd>
                </div>
              ))}
              <div className="flex items-center gap-2 text-sm lg:hidden">
                <dt className="text-muted-foreground">Biaya:</dt>
                <dd className="font-bold text-primary">{rupiah(shownPrice)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <main className="py-10 md:py-14">
        <div className="container mx-auto px-4">
          <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
            <div className="space-y-10 min-w-0">
              <div className={`${course.cover_image ? "aspect-[16/9]" : "aspect-[21/8]"} overflow-hidden rounded-2xl`}>
                <ProgramVisual title={course.title} category={course.category} image={course.cover_image} size="lg" />
              </div>

              {!online && (
                <section aria-labelledby="jadwal">
                  <h2 id="jadwal" className="text-2xl font-bold text-primary mb-4">Jadwal angkatan</h2>
                  {batches.length === 0 ? (
                    <div className="flex gap-4 rounded-2xl border border-dashed border-border bg-card p-6">
                      <Hourglass className="h-6 w-6 shrink-0 text-gold-dark" />
                      <div className="text-[15px]">
                        <p className="font-semibold text-primary">Jadwal angkatan berikutnya segera diumumkan</p>
                        <p className="mt-1 text-muted-foreground">Daftar minat sekarang, dan kami kabari lewat WhatsApp begitu jadwal dibuka.</p>
                        <Button asChild size="sm" variant="outline" className="mt-3"><Link to={`/daftar/${slug}`}>Daftar minat</Link></Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {batches.map((b) => {
                        const av = availability(b, seats[b.id]);
                        return (
                          <div key={b.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-primary">{b.name}</span>
                                {av.open
                                  ? <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${av.left !== null && av.left <= 5 ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>{av.left === null ? "Dibuka" : `Sisa ${av.left} kursi`}</span>
                                  : <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{av.reason}</span>}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{formatDateRange(b.start_date, b.end_date)}</span>
                                {b.schedule && <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{b.schedule}</span>}
                                {b.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{b.location}</span>}
                              </div>
                              {b.registration_deadline && av.open && <p className="mt-1 text-xs text-muted-foreground">Pendaftaran ditutup {formatDate(b.registration_deadline)}</p>}
                            </div>
                            <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
                              <span className="font-bold text-primary">{rupiah(priceFor(course, b))}</span>
                              {av.open && !isActive && !isPending && <Button asChild size="sm"><Link to={`/daftar/${slug}?batch=${b.id}`}>Pilih angkatan ini</Link></Button>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {(course as any).requirements?.length > 0 && (
                <section aria-labelledby="syarat">
                  <h2 id="syarat" className="text-2xl font-bold text-primary mb-4">Syarat peserta</h2>
                  <ul className="space-y-2.5 rounded-2xl border border-border bg-card p-6">
                    {(course as any).requirements.map((r: string, i: number) => (
                      <li key={i} className="flex gap-3 text-[15px]"><ClipboardList className="h-5 w-5 shrink-0 text-gold-dark" />{r}</li>
                    ))}
                  </ul>
                </section>
              )}

              {highlights.length > 0 && (
                <section aria-labelledby="learn">
                  <h2 id="learn" className="text-2xl font-bold text-primary mb-4">Yang akan dipelajari</h2>
                  <ul className="grid gap-3 sm:grid-cols-2 rounded-2xl border border-border bg-card p-6">
                    {highlights.map((h, i) => (
                      <li key={i} className="flex gap-3 text-[15px]"><CheckCircle2 className="h-5 w-5 shrink-0 text-gold-dark" />{h}</li>
                    ))}
                  </ul>
                </section>
              )}

              <section aria-labelledby="kurikulum">
                <div className="flex items-baseline justify-between gap-4 mb-4">
                  <h2 id="kurikulum" className="text-2xl font-bold text-primary">Kurikulum</h2>
                  {modules.length > 0 && <span className="text-sm text-muted-foreground">{modules.length} modul · {lessonCount} materi</span>}
                </div>
                {modules.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-[15px] text-muted-foreground">
                    Rincian kurikulum disampaikan saat pendaftaran. Tanyakan detailnya lewat{" "}
                    <a href={waLink} target="_blank" rel="noreferrer" className="font-semibold text-primary underline underline-offset-4">WhatsApp</a>.
                  </div>
                ) : (
                  <Accordion type="multiple" defaultValue={["m0"]} className="rounded-2xl border border-border bg-card px-5">
                    {modules.map((m: any, i: number) => (
                      <AccordionItem key={m.id} value={`m${i}`} className={i === modules.length - 1 ? "border-b-0" : ""}>
                        <AccordionTrigger className="text-left hover:no-underline">
                          <span>
                            <span className="block text-xs font-semibold uppercase tracking-wider text-gold-dark">Modul {i + 1}</span>
                            <span className="block text-base font-semibold text-primary">{m.title}</span>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          {m.description && <p className="mb-3 text-sm text-muted-foreground">{m.description}</p>}
                          <ul className="space-y-1">
                            {(m.lessons || []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((l: any) => {
                              const locked = !isActive && !l.is_preview;
                              return (
                                <li key={l.id} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm">
                                  {locked ? <Lock className="h-4 w-4 text-muted-foreground" /> : l.content_type === "video" ? <PlayCircle className="h-4 w-4 text-gold-dark" /> : <FileText className="h-4 w-4 text-gold-dark" />}
                                  <span className={locked ? "text-muted-foreground" : "text-foreground"}>{l.title}</span>
                                  <span className="ml-auto flex items-center gap-2">
                                    {l.is_preview && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-primary">Pratinjau</span>}
                                    {l.duration_min ? <span className="text-xs text-muted-foreground">{l.duration_min} mnt</span> : null}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </section>

              <section aria-labelledby="sertifikat" className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-6">
                  <Award className="h-7 w-7 text-gold-dark" />
                  <h2 id="sertifikat" className="mt-3 text-lg font-bold text-primary">Sertifikat kelulusan</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">Peserta yang menyelesaikan pelatihan mendapat sertifikat yang keasliannya bisa diperiksa online.</p>
                  <Link to="/verifikasi" className="mt-3 inline-flex text-sm font-semibold text-primary underline underline-offset-4">Cara verifikasi</Link>
                </div>
                <div className="rounded-2xl border border-border bg-card p-6">
                  <GraduationCap className="h-7 w-7 text-gold-dark" />
                  <h2 className="mt-3 text-lg font-bold text-primary">Instruktur</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {course.instructor_name ? <>Dipandu oleh <strong className="text-foreground">{course.instructor_name}</strong>.</> : "Dipandu instruktur profesional di bidangnya."}
                  </p>
                  <Link to="/tentang-kami#team" className="mt-3 inline-flex text-sm font-semibold text-primary underline underline-offset-4">Kenali tim pengajar</Link>
                </div>
              </section>

              {faqItems.length > 0 && (
                <section aria-labelledby="faq-program">
                  <h2 id="faq-program" className="text-2xl font-bold text-primary mb-4">Pertanyaan umum</h2>
                  <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-5">
                    {faqItems.map((f, i, arr) => (
                      <AccordionItem key={i} value={`f${i}`} className={i === arr.length - 1 ? "border-b-0" : ""}>
                        <AccordionTrigger className="text-left font-semibold text-primary hover:no-underline">{f.q}</AccordionTrigger>
                        <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </section>
              )}
            </div>

            <aside className="lg:sticky lg:top-24 h-fit space-y-4">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-medium">
                <p className="text-sm text-muted-foreground">Biaya pelatihan</p>
                <p className="mt-1 text-3xl font-extrabold text-primary" style={{ fontFamily: "var(--font-heading)" }}>{rupiah(shownPrice)}</p>
                {!online && nextBatch && (
                  <div className="mt-4 rounded-lg bg-secondary/70 p-3 text-sm">
                    <p className="font-semibold text-primary">Angkatan terdekat: {nextBatch.name}</p>
                    <p className="text-muted-foreground">{formatDateRange(nextBatch.start_date, nextBatch.end_date)}{availability(nextBatch, seats[nextBatch.id]).left !== null && ` · sisa ${availability(nextBatch, seats[nextBatch.id]).left} kursi`}</p>
                  </div>
                )}

                {isRejected && (
                  <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                    <p className="font-semibold text-destructive">Pembayaran belum dapat diverifikasi</p>
                    {enrollment?.notes && <p className="mt-0.5 text-muted-foreground">Alasan: {enrollment.notes}</p>}
                  </div>
                )}
                {isPending && <p className="mt-4 rounded-lg bg-secondary p-3 text-sm text-primary">Pendaftaran Anda tercatat. Status pembayaran bisa dipantau di Dashboard Saya.</p>}
                {isWaitlist && <p className="mt-4 rounded-lg bg-secondary p-3 text-sm text-primary">Anda ada di daftar minat. Kami kabari saat jadwal angkatan dibuka.</p>}

                <div className="mt-5 space-y-2">
                  {primaryAction()}
                  <Button asChild variant="outline" size="lg" className="w-full"><a href={waLink} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />Tanya via WhatsApp</a></Button>
                </div>

                <ul className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
                  {facts.map((f) => (
                    <li key={f.label} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-muted-foreground"><f.icon className="h-4 w-4" />{f.label}</span>
                      <span className="font-medium text-foreground text-right">{f.value}</span>
                    </li>
                  ))}
                  {!online && (
                    <li className="flex items-start justify-between gap-3">
                      <span className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" />Lokasi</span>
                      <span className="font-medium text-foreground text-right">{brand.city.split(",")[0]}</span>
                    </li>
                  )}
                </ul>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-secondary/70 p-4 text-sm text-muted-foreground">
                <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
                <span>Data pendaftaran Anda hanya dipakai untuk keperluan pelatihan di {brand.name}.</span>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer mobileBar={<div className="flex flex-1">{primaryAction(false)}</div>} />

    </div>
  );
};

export default CourseDetail;
