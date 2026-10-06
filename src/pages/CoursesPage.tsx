import { useMemo, useState } from "react";
import { Search, SearchX } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/site/PageHeader";
import ProgramCard from "@/components/site/ProgramCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCourses } from "@/hooks/useCourses";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { cn } from "@/lib/utils";

type Mode = "all" | "offline" | "online";
type Price = "all" | "free" | "paid";

const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button type="button" onClick={onClick} aria-pressed={active}
    className={cn("h-9 rounded-full border px-4 text-sm font-medium transition-colors",
      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary")}>
    {children}
  </button>
);

const CoursesPage = () => {
  const { brand, sections } = useSiteConfig();
  const { courses, loading } = useCourses();
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>("all");
  const [price, setPrice] = useState<Price>("all");

  const hasOnline = courses.some((c) => c.type === "online");
  const hasOffline = courses.some((c) => c.type !== "online");
  const hasFree = courses.some((c) => c.is_free || !c.price);
  const hasPaid = courses.some((c) => !c.is_free && c.price > 0);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return courses.filter((c) =>
      (!t || `${c.title} ${c.description ?? ""} ${c.category ?? ""}`.toLowerCase().includes(t)) &&
      (mode === "all" || (mode === "online" ? c.type === "online" : c.type !== "online")) &&
      (price === "all" || ((c.is_free || !c.price) ? price === "free" : price === "paid")));
  }, [courses, q, mode, price]);

  const reset = () => { setQ(""); setMode("all"); setPrice("all"); };

  return (
    <div className="min-h-screen">
      <Header />
      <PageHeader
        crumbs={[{ label: "Program" }]}
        title="Program Pelatihan"
        subtitle={sections.programs.subtitle}
      />
      <main className="py-10 md:py-14">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari program, misalnya barista" className="h-11 pl-9 bg-card" aria-label="Cari program" />
            </div>
            <div className="flex flex-wrap gap-2">
              {hasOnline && hasOffline && (
                <>
                  <Chip active={mode === "all"} onClick={() => setMode("all")}>Semua</Chip>
                  <Chip active={mode === "offline"} onClick={() => setMode("offline")}>Tatap Muka</Chip>
                  <Chip active={mode === "online"} onClick={() => setMode("online")}>Online</Chip>
                </>
              )}
              {hasFree && hasPaid && (
                <>
                  <Chip active={price === "all"} onClick={() => setPrice("all")}>Semua harga</Chip>
                  <Chip active={price === "free"} onClick={() => setPrice("free")}>Gratis</Chip>
                  <Chip active={price === "paid"} onClick={() => setPrice("paid")}>Berbayar</Chip>
                </>
              )}
            </div>
          </div>

          {!loading && <p className="mb-5 text-sm text-muted-foreground">{shown.length} program</p>}

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-[380px] rounded-2xl bg-muted animate-pulse" />)}
            </div>
          ) : shown.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
              <SearchX className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-4 font-semibold text-primary">Program tidak ditemukan</p>
              <p className="mt-1 text-sm text-muted-foreground">Coba kata kunci lain, atau tanyakan langsung ke tim kami.</p>
              <div className="mt-5 flex justify-center gap-2">
                <Button variant="outline" onClick={reset}>Hapus filter</Button>
                <Button asChild><a href={`https://wa.me/${brand.whatsapp}`} target="_blank" rel="noreferrer">Tanya via WhatsApp</a></Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((c) => <ProgramCard key={c.id} c={c} />)}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CoursesPage;
