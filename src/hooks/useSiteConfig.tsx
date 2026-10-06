import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CONFIG_KEY, DEFAULT_CONFIG, hexToHsl, hsl, normalizeConfig, type SiteConfig } from "@/lib/siteConfig";

/* Config dimuat sekali, dibagikan lewat context ke seluruh situs.
 * Di dalam iframe preview admin (?preview=1) config ditimpa lewat postMessage. */

const Ctx = createContext<SiteConfig>(DEFAULT_CONFIG);
export const useSiteConfig = () => useContext(Ctx);

let remote: SiteConfig | null = null;
let inflight: Promise<SiteConfig> | null = null;

export async function loadSiteConfig(force = false): Promise<SiteConfig> {
  if (force) { remote = null; inflight = null; }
  if (remote) return remote;
  if (!inflight) {
    inflight = (async () => {
      const { data } = await supabase.from("site_content").select("value").eq("key", CONFIG_KEY).maybeSingle();
      remote = normalizeConfig(data?.value);
      return remote;
    })().catch(() => normalizeConfig(null));
  }
  return inflight;
}

const FONT_WEIGHTS = "wght@300;400;500;600;700;800";
function ensureFont(name: string) {
  const id = `gf-${name.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const l = document.createElement("link");
  l.id = id;
  l.rel = "stylesheet";
  l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, "+")}:${FONT_WEIGHTS}&display=swap`;
  document.head.appendChild(l);
}

export function applyTheme(cfg: SiteConfig) {
  const r = document.documentElement.style;
  const t = cfg.theme;

  const [ph, ps, pl] = hexToHsl(t.primary);
  r.setProperty("--primary", hsl(ph, ps, pl));
  r.setProperty("--background-dark", hsl(ph, ps, pl));
  r.setProperty("--card-dark-foreground", "0 0% 98%");
  r.setProperty("--foreground", hsl(ph, Math.min(ps, 47), Math.min(pl, 11)));
  r.setProperty("--card-foreground", hsl(ph, Math.min(ps, 47), Math.min(pl, 11)));
  r.setProperty("--secondary-foreground", hsl(ph, ps, pl));
  r.setProperty("--accent-foreground", hsl(ph, ps, Math.min(pl, 8)));
  r.setProperty("--sidebar-background", hsl(ph, ps, pl));

  const [ah, as, al] = hexToHsl(t.accent);
  r.setProperty("--gold", hsl(ah, as, al));
  r.setProperty("--gold-light", hsl(ah, as, al + 12));
  r.setProperty("--gold-dark", hsl(ah, as, Math.max(al - 22, 24)));
  r.setProperty("--accent", hsl(ah, as, al));
  r.setProperty("--ring", hsl(ph, ps, Math.min(pl + 14, 40)));
  r.setProperty("--sidebar-primary", hsl(ah, as, al));

  const [sh, ss, sl] = hexToHsl(t.secondary);
  r.setProperty("--corporate-blue", hsl(sh, ss, sl));
  r.setProperty("--corporate-blue-light", hsl(sh, ss, sl + 13));

  r.setProperty("--radius", `${t.radius / 16}rem`);

  ensureFont(t.headingFont);
  ensureFont(t.bodyFont);
  const SERIF = ["DM Serif Display", "Playfair Display", "Lora", "Merriweather"];
  r.setProperty("--font-heading", `'${t.headingFont}', ${SERIF.includes(t.headingFont) ? "Georgia, serif" : "system-ui, sans-serif"}`);
  r.setProperty("--font-body", `'${t.bodyFont}', system-ui, sans-serif`);
}

export const SiteConfigProvider = ({ children }: { children: ReactNode }) => {
  const [cfg, setCfg] = useState<SiteConfig>(remote ?? DEFAULT_CONFIG);

  useEffect(() => {
    let alive = true;
    loadSiteConfig().then((c) => alive && setCfg(c));
    return () => { alive = false; };
  }, []);

  // Mode preview: admin mengirim config draft lewat postMessage
  useEffect(() => {
    const isPreview = new URLSearchParams(window.location.search).get("preview") === "1";
    if (!isPreview) return;
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data;
      if (d?.type === "bcg-config") setCfg(normalizeConfig(d.config));
      if (d?.type === "bcg-scroll" && typeof d.id === "string") {
        document.getElementById(d.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    window.addEventListener("message", onMsg);

    // Klik di preview → pilih section yang sesuai di editor; tautan tidak berpindah halaman
    const ids: Record<string, string> = { home: "hero", offer: "offer", programs: "programs", steps: "steps", about: "about", team: "team", testimonials: "testimonials", gallery: "gallery", faq: "faq", cta: "cta", contact: "contact" };
    const style = document.createElement("style");
    style.textContent = "main section[id]{cursor:pointer;transition:outline-color .15s;outline:3px solid transparent;outline-offset:-3px}main section[id]:hover{outline-color:hsl(var(--gold)/.7)}";
    document.head.appendChild(style);
    const onClick = (e: MouseEvent) => {
      const sec = (e.target as HTMLElement).closest("main section[id]");
      e.preventDefault();
      e.stopPropagation();
      if (sec && ids[sec.id]) window.parent?.postMessage({ type: "bcg-select", panel: ids[sec.id] }, window.location.origin);
    };
    document.addEventListener("click", onClick, true);

    window.parent?.postMessage({ type: "bcg-preview-ready" }, window.location.origin);
    return () => {
      window.removeEventListener("message", onMsg);
      document.removeEventListener("click", onClick, true);
      style.remove();
    };
  }, []);

  useEffect(() => { applyTheme(cfg); }, [cfg]);

  return <Ctx.Provider value={cfg}>{children}</Ctx.Provider>;
};
