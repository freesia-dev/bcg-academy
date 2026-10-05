import SectionHeader from "@/components/SectionHeader";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteConfig } from "@/hooks/useSiteConfig";

interface Item { id: string; title: string; description: string | null; category: string; image_url: string }

const CAT_LABEL: Record<string, string> = {
  training: "Pelatihan", graduation: "Sertifikasi", partnership: "Kerja Sama", testimonial: "Testimoni",
};

const Gallery = () => {
  const c = useSiteConfig().sections.gallery;
  const [items, setItems] = useState<Item[]>([]);
  const [tab, setTab] = useState("all");
  const [open, setOpen] = useState<Item | null>(null);

  useEffect(() => {
    supabase.from("gallery_items").select("id,title,description,category,image_url").order("sort_order")
      .then(({ data }) => setItems((data as Item[]) || []));
  }, []);

  const cats = useMemo(() => Array.from(new Set(items.map((i) => i.category))), [items]);
  const shown = tab === "all" ? items : items.filter((i) => i.category === tab);

  // Belum ada foto asli → section disembunyikan, bukan diisi gambar placeholder.
  if (items.length === 0) return null;

  return (
    <section id="gallery" className="py-20 md:py-24">
      <div className="container mx-auto px-4">
        <SectionHeader eyebrow={c.eyebrow} title={c.title} highlight={c.titleHighlight} subtitle={c.subtitle} />

        {cats.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {["all", ...cats].map((id) => (
              <button key={id} onClick={() => setTab(id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${tab === id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-gold hover:text-primary"}`}>
                {id === "all" ? "Semua" : CAT_LABEL[id] || id}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {shown.map((it) => (
            <button key={it.id} onClick={() => setOpen(it)} className="group relative aspect-square overflow-hidden rounded-xl bg-muted text-left">
              <img src={it.image_url} alt={it.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-primary/85 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-sm font-medium text-primary-foreground line-clamp-2">{it.title}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] bg-primary/90 flex items-center justify-center p-4" onClick={() => setOpen(null)}>
          <button className="absolute top-4 right-4 text-primary-foreground" aria-label="Tutup"><X size={28} /></button>
          <figure className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={open.image_url} alt={open.title} className="w-full max-h-[75vh] object-contain rounded-lg" />
            <figcaption className="mt-3 text-primary-foreground text-center">
              <p className="font-semibold">{open.title}</p>
              {open.description && <p className="text-sm text-primary-foreground/70">{open.description}</p>}
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
};

export default Gallery;
