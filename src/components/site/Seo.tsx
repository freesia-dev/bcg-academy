import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { DEFAULT_OG_IMAGE, SITE_URL, absUrl, clip } from "@/lib/seo";

interface SeoProps {
  /** Judul halaman tanpa nama lembaga. Kosong = judul utama situs (beranda). */
  title?: string;
  description?: string | null;
  /** Path canonical; bawaan = path halaman saat ini. */
  path?: string;
  image?: string | null;
  type?: "website" | "article";
  noindex?: boolean;
  jsonLd?: object | object[];
}

const upsertMeta = (attr: "name" | "property", key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const upsertLink = (rel: string, href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
};

/** Mengatur judul, deskripsi, canonical, Open Graph, dan data terstruktur per halaman. */
const Seo = ({ title, description, path, image, type = "website", noindex = false, jsonLd }: SeoProps) => {
  const { brand, seo } = useSiteConfig();
  const { pathname } = useLocation();
  const ld = jsonLd ? JSON.stringify(Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : "";

  useEffect(() => {
    const fullTitle = title ? `${title} | ${brand.name}` : seo.title || brand.name;
    const desc = clip(description || seo.description);
    const url = `${SITE_URL}${path ?? pathname}`.replace(/\/$/, "") || SITE_URL;
    const img = absUrl(image) || absUrl(seo.ogImage) || DEFAULT_OG_IMAGE;

    document.title = fullTitle;
    document.documentElement.lang = "id";
    upsertMeta("name", "description", desc);
    upsertMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large");
    upsertLink("canonical", url);

    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:site_name", brand.name);
    upsertMeta("property", "og:locale", "id_ID");
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", desc);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:image", img);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", desc);
    upsertMeta("name", "twitter:image", img);

    let script = document.getElementById("seo-jsonld") as HTMLScriptElement | null;
    if (ld) {
      if (!script) {
        script = document.createElement("script");
        script.id = "seo-jsonld";
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = ld;
    } else script?.remove();
  }, [title, description, path, pathname, image, type, noindex, ld, brand.name, seo.title, seo.description, seo.ogImage]);

  return null;
};

export default Seo;
