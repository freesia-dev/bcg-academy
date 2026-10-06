import type { SiteConfig } from "@/lib/siteConfig";

/** Domain utama. Canonical & URL berbagi selalu menunjuk ke sini, juga saat dibuka dari alamat pratinjau. */
export const SITE_URL = "https://bcg-academy.site";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

export const absUrl = (u?: string | null) => {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return `${SITE_URL}${u.startsWith("/") ? "" : "/"}${u}`;
};

export const clip = (s: string | null | undefined, n = 158) => {
  const t = (s || "").replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 80 ? cut.lastIndexOf(" ") : cut.length)}…`;
};

const city = (cfg: SiteConfig) => cfg.brand.city.split(",")[0].trim() || "Bontang";
const region = (cfg: SiteConfig) => cfg.brand.city.split(",")[1]?.trim() || "Kalimantan Timur";

export const organizationLd = (cfg: SiteConfig) => ({
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "@id": `${SITE_URL}/#organization`,
  name: cfg.brand.name,
  alternateName: ["BCG Academy", "LPK BCG"],
  url: SITE_URL,
  logo: absUrl(cfg.brand.logo),
  image: absUrl(cfg.seo.ogImage) || DEFAULT_OG_IMAGE,
  description: cfg.seo.description,
  telephone: cfg.brand.phoneTel,
  email: cfg.brand.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: cfg.brand.address,
    addressLocality: city(cfg),
    addressRegion: region(cfg),
    addressCountry: "ID",
  },
  sameAs: [cfg.brand.instagram, cfg.brand.facebook, cfg.brand.tiktok, cfg.brand.youtube].filter(Boolean),
});

export const websiteLd = (cfg: SiteConfig) => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: cfg.brand.name,
  inLanguage: "id-ID",
  publisher: { "@id": `${SITE_URL}/#organization` },
});

export const breadcrumbLd = (items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [{ name: "Beranda", path: "/" }, ...items].map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: it.name,
    item: absUrl(it.path),
  })),
});

interface CourseLike {
  slug: string; title: string; description: string | null; cover_image: string | null;
  type: string; price: number; is_free: boolean; duration?: string | null;
}
interface BatchLike { name: string; start_date: string | null; end_date: string | null; location: string | null; price: number | null }

export const courseLd = (cfg: SiteConfig, c: CourseLike, batches: BatchLike[] = []) => {
  const url = `${SITE_URL}/kursus/${c.slug}`;
  const price = c.is_free ? 0 : c.price || 0;
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: c.title,
    description: clip(c.description || `Pelatihan ${c.title} di ${cfg.brand.name}, ${city(cfg)}.`, 500),
    url,
    image: absUrl(c.cover_image) || DEFAULT_OG_IMAGE,
    inLanguage: "id",
    provider: { "@type": "EducationalOrganization", name: cfg.brand.name, sameAs: SITE_URL },
    offers: {
      "@type": "Offer",
      category: price > 0 ? "Paid" : "Free",
      price,
      priceCurrency: "IDR",
      url: `${SITE_URL}/daftar/${c.slug}`,
      availability: "https://schema.org/InStock",
    },
    ...(batches.length
      ? {
          hasCourseInstance: batches
            .filter((b) => b.start_date)
            .map((b) => ({
              "@type": "CourseInstance",
              name: b.name,
              courseMode: c.type === "online" ? "Online" : "Onsite",
              startDate: b.start_date,
              ...(b.end_date ? { endDate: b.end_date } : {}),
              location: {
                "@type": "Place",
                name: b.location || cfg.brand.name,
                address: { "@type": "PostalAddress", addressLocality: city(cfg), addressRegion: region(cfg), addressCountry: "ID" },
              },
            })),
        }
      : {}),
  };
};
