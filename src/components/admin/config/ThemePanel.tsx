import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BODY_FONTS, HEADING_FONTS, THEME_PRESETS, type SiteConfig } from "@/lib/siteConfig";

const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium">{label}</Label>
    <div className="flex gap-2">
      <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value)}
        className="h-10 w-12 rounded-md border cursor-pointer bg-background p-1" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono" maxLength={7} />
    </div>
  </div>
);

const sel = "w-full h-10 rounded-md border bg-background px-3 text-sm";

const ThemePanel = ({ theme, onChange }: { theme: SiteConfig["theme"]; onChange: (t: SiteConfig["theme"]) => void }) => {
  const set = (patch: Partial<SiteConfig["theme"]>) => onChange({ ...theme, ...patch, preset: patch.preset ?? "custom" });
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Preset warna</Label>
        <div className="grid sm:grid-cols-2 gap-2">
          {THEME_PRESETS.map((p) => (
            <button key={p.id} type="button" onClick={() => onChange({ ...theme, preset: p.id, primary: p.primary, accent: p.accent, secondary: p.secondary })}
              className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${theme.preset === p.id ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40"}`}>
              <span className="flex shrink-0">
                {[p.primary, p.accent, p.secondary].map((c, i) => (
                  <span key={i} className="w-6 h-6 rounded-full border-2 border-background -ml-1.5 first:ml-0" style={{ background: c }} />
                ))}
              </span>
              <span className="text-sm font-medium">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <ColorField label="Warna utama (gelap)" value={theme.primary} onChange={(v) => set({ primary: v })} />
        <ColorField label="Warna aksen" value={theme.accent} onChange={(v) => set({ accent: v })} />
        <ColorField label="Warna sekunder" value={theme.secondary} onChange={(v) => set({ secondary: v })} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Font judul</Label>
          <select className={sel} value={theme.headingFont} onChange={(e) => set({ headingFont: e.target.value })}>
            {HEADING_FONTS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Font isi</Label>
          <select className={sel} value={theme.bodyFont} onChange={(e) => set({ bodyFont: e.target.value })}>
            {BODY_FONTS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between"><Label className="text-sm font-medium">Kelengkungan sudut</Label><span className="text-xs text-muted-foreground">{theme.radius}px</span></div>
        <input type="range" min={0} max={24} value={theme.radius} onChange={(e) => set({ radius: Number(e.target.value) })} className="w-full accent-[hsl(var(--gold))]" />
      </div>
    </div>
  );
};

export default ThemePanel;
