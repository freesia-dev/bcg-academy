// Cloudflare Pages Functions: meta per halaman di HTML awal + sitemap.xml.
// WhatsApp, Facebook, dan Telegram tidak menjalankan JavaScript, jadi judul,
// deskripsi, dan gambar pratinjau link harus sudah ada di HTML dari server.
// Rute yang melewati fungsi ini dibatasi oleh public/_routes.json.

interface Env {
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface Ctx {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
  waitUntil: (p: Promise<unknown>) => void;
}

interface Meta { title: string; description: string; image: string; url: string; noindex?: boolean; jsonLd?: unknown[] }

const SITE = "https://bcg-academy.site";
const DEFAULT_IMAGE = `${SITE}/og-image.jpg`;
const FALLBACK_URL = "https://mswngfckwjatgwkcpoko.supabase.co";
const FALLBACK_KEY = "sb_publishable_FJnztIXZVUba6Qu5EptEGw_nHnBKK0r"; // kunci publik (sama dengan di browser)

const clip = (s: string | null | undefined, n = 158) => {
  const t = (s || "").replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, n - 1).replace(/\s+\S*$/, "")}…`;
};
const abs = (u?: string | null) => (!u ? "" : /^https?:\/\//.test(u) ? u : `${SITE}${u.startsWith("/") ? "" : "/"}${u}`);

async function rest<T>(env: Env, path: string): Promise<T | null> {
  const base = env.SUPABASE_URL || env.VITE_SUPABASE_URL || FALLBACK_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_KEY;
  try {
    const init = {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
      cf: { cacheTtl: 300, cacheEverything: true }, // cache 5 menit di edge Cloudflare
    } as RequestInit;
    const res = await fetch(`${base}/rest/v1/${path}`, init);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface SiteCfg {
  brand?: { name?: string; city?: string; logo?: string; phoneTel?: string; email?: string; address?: string };
  seo?: { title?: string; description?: string; ogImage?: string };
  sections?: { about?: { description?: string }; contact?: { subtitle?: string } };
}

async function siteConfig(env: Env): Promise<SiteCfg> {
  const rows = await rest<{ value: SiteCfg }[]>(env, "site_content?key=eq.site_config&select=value");
  return rows?.[0]?.value || {};
}

interface Course { title: string; slug: string; description: string | null; cover_image: string | null; price: number | null; is_free: boolean | null; type: string | null }

async function metaFor(path: string, env: Env): Promise<Meta | null> {
  const cfg = await siteConfig(env);
  const name = cfg.brand?.name || "LPK Borneo Citra Gemilang";
  const city = (cfg.brand?.city || "Bontang, Kalimantan Timur").split(",")[0].trim();
  // bawaan sama dengan DEFAULT_CONFIG di src/lib/siteConfig.ts
  const baseDesc = cfg.seo?.description || `${name} (BCG Academy) — lembaga pelatihan kerja di ${city} dengan kurikulum berbasis SKKNI, instruktur profesional, dan akses uji kompetensi BNSP.`;
  const baseImg = abs(cfg.seo?.ogImage) || DEFAULT_IMAGE;
  const page = (title: string, description: string, extra: Partial<Meta> = {}): Meta => ({
    title: `${title} | ${name}`, description: clip(description), image: baseImg, url: `${SITE}${path}`, ...extra,
  });
  const p = path.replace(/\/+$/, "") || "/";

  if (p === "/") {
    return { title: cfg.seo?.title || `${name} | Lembaga Pelatihan Kerja di ${city}`, description: clip(baseDesc), image: baseImg, url: SITE };
  }
  if (p === "/kursus") {
    const list = await rest<{ title: string }[]>(env, "courses?is_published=eq.true&select=title&order=sort_order");
    const titles = (list || []).map((c) => c.title).join(", ");
    return page("Program Pelatihan", `Daftar program pelatihan kerja di ${name}, ${city}${titles ? `: ${titles}` : ""}. Lihat jadwal angkatan, biaya, dan daftar online.`);
  }
  const m = p.match(/^\/kursus\/([a-z0-9-]+)$/i);
  if (m) {
    const rows = await rest<Course[]>(env, `courses?slug=eq.${encodeURIComponent(m[1])}&is_published=eq.true&select=title,slug,description,cover_image,price,is_free,type`);
    const c = rows?.[0];
    if (!c) return page("Program tidak ditemukan", baseDesc, { noindex: true });
    const price = c.is_free ? 0 : c.price || 0;
    const desc = c.description || `Pelatihan ${c.title} di ${name}, ${city}. Lihat jadwal angkatan, biaya, dan daftar online.`;
    return page(`Pelatihan ${c.title}`, desc, {
      image: abs(c.cover_image) || baseImg,
      jsonLd: [{
        "@context": "https://schema.org", "@type": "Course", name: c.title, description: clip(desc, 500),
        url: `${SITE}/kursus/${c.slug}`, inLanguage: "id",
        provider: { "@type": "EducationalOrganization", name, sameAs: SITE },
        offers: { "@type": "Offer", category: price > 0 ? "Paid" : "Free", price, priceCurrency: "IDR", url: `${SITE}/daftar/${c.slug}` },
      }],
    });
  }
  if (p === "/tentang-kami") {
    return page("Tentang Kami", cfg.sections?.about?.description ||
      `${name} (BCG Academy) adalah lembaga pelatihan kerja yang berfokus pada pengembangan keterampilan praktis dan profesional di Kota ${city} dan sekitarnya.`);
  }
  if (p === "/kontak") return page("Kontak", `Hubungi ${name} di ${city}: WhatsApp, telepon, email, dan lokasi kantor. Tanya jadwal, biaya, atau pelatihan untuk instansi.`);
  if (p === "/verifikasi") return page("Verifikasi Sertifikat", `Periksa keaslian sertifikat pelatihan ${name} dengan memindai QR atau mengetik nomor sertifikat.`);
  if (p.startsWith("/verifikasi/")) return page("Verifikasi Sertifikat", `Hasil pemeriksaan keaslian sertifikat ${name}.`, { noindex: true, url: `${SITE}/verifikasi` });
  return null;
}

async function sitemap(env: Env): Promise<Response> {
  const courses = await rest<{ slug: string; updated_at: string | null }[]>(env, "courses?is_published=eq.true&select=slug,updated_at&order=sort_order");
  const today = new Date().toISOString().slice(0, 10);
  const urls: { loc: string; lastmod?: string; priority: string }[] = [
    { loc: `${SITE}/`, priority: "1.0" },
    { loc: `${SITE}/kursus`, priority: "0.9" },
    ...(courses || []).map((c) => ({ loc: `${SITE}/kursus/${c.slug}`, lastmod: (c.updated_at || today).slice(0, 10), priority: "0.8" })),
    { loc: `${SITE}/tentang-kami`, priority: "0.6" },
    { loc: `${SITE}/kontak`, priority: "0.6" },
    { loc: `${SITE}/verifikasi`, priority: "0.4" },
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<priority>${u.priority}</priority></url>`)
    .join("\n")}\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}

const setContent = (value: string) => ({ element(e: Element) { e.setAttribute("content", value); } });

export const onRequest = async (ctx: Ctx): Promise<Response> => {
  const url = new URL(ctx.request.url);
  if (url.pathname === "/sitemap.xml") return sitemap(ctx.env);

  const res = await ctx.next();
  if (ctx.request.method !== "GET" || !(res.headers.get("content-type") || "").includes("text/html")) return res;

  let meta: Meta | null = null;
  try { meta = await metaFor(url.pathname, ctx.env); } catch { meta = null; }
  if (!meta) return res;
  const m = meta;

  const out = new HTMLRewriter()
    .on("title", { element(e: Element) { e.setInnerContent(m.title); } })
    .on('meta[name="description"]', setContent(m.description))
    .on('link[rel="canonical"]', { element(e: Element) { e.setAttribute("href", m.url); } })
    .on('meta[property="og:url"]', setContent(m.url))
    .on('meta[property="og:title"]', setContent(m.title))
    .on('meta[property="og:description"]', setContent(m.description))
    .on('meta[property="og:image"]', setContent(m.image))
    .on('meta[name="twitter:title"]', setContent(m.title))
    .on('meta[name="twitter:description"]', setContent(m.description))
    .on('meta[name="twitter:image"]', setContent(m.image))
    // ukuran 1200x630 hanya berlaku untuk gambar bawaan, bukan foto cover program
    .on('meta[property^="og:image:"]', { element(e: Element) { if (m.image !== DEFAULT_IMAGE) e.remove(); } })
    .on("head", {
      element(e: Element) {
        if (m.noindex) e.append('<meta name="robots" content="noindex, nofollow" />', { html: true });
        if (m.jsonLd?.length) {
          e.append(`<script type="application/ld+json">${JSON.stringify(m.jsonLd).replace(/</g, "\\u003c")}</script>`, { html: true });
        }
      },
    })
    .transform(res);

  const headers = new Headers(out.headers);
  headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  return new Response(out.body, { status: out.status, headers });
};
