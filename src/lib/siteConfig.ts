import euisPhoto from "@/assets/team/euis-paramitha.jpg";
import harisPhoto from "@/assets/team/haris-fadilah.jpg";
import yogaPhoto from "@/assets/team/yoga-satrya.jpg";
import logoDefault from "@/assets/logo-bcg.png";

/* ------------------------------------------------------------------ *
 * Satu sumber kebenaran untuk tampilan situs publik.
 * Disimpan di tabel `site_content` dengan key "site_config".
 * Yang tidak diisi superadmin otomatis memakai DEFAULT_CONFIG di bawah.
 * ------------------------------------------------------------------ */

export const CONFIG_KEY = "site_config";

export type SectionId = "hero" | "programs" | "steps" | "offer" | "about" | "team" | "testimonials" | "gallery" | "faq" | "cta" | "contact";

export interface StatItem { value: string; label: string }
export interface OfferItem { icon: "graduation" | "award" | "briefcase" | "users" | "shield" | "book"; title: string; desc: string }
export interface TeamMember { photo: string; name: string; role: string; bio: string }
export interface StepItem { title: string; desc: string }
export interface Testimonial { name: string; program: string; quote: string; photo: string }
export interface FaqItem { q: string; a: string }

export interface SiteConfig {
  brand: {
    name: string;
    tagline: string;
    logo: string;
    phoneDisplay: string;
    phoneTel: string;
    whatsapp: string;
    email: string;
    address: string;
    city: string;
    legalAddress: string;
    nib: string;
    hoursWeekday: string;
    hoursWeekend: string;
    mapEmbed: string;
    instagram: string;
    facebook: string;
    tiktok: string;
    youtube: string;
  };
  theme: {
    preset: string;
    primary: string;
    accent: string;
    secondary: string;
    headingFont: string;
    bodyFont: string;
    radius: number;
  };
  seo: { title: string; description: string; ogImage: string };
  sectionOrder: SectionId[];
  sections: {
    hero: {
      enabled: boolean; badge: string; titleBefore: string; titleHighlight: string; titleAfter: string;
      subtitle: string; primaryCta: string; secondaryCta: string; image: string;
      highlights: string[]; stats: StatItem[];
    };
    offer: { enabled: boolean; eyebrow: string; title: string; titleHighlight: string; subtitle: string; items: OfferItem[] };
    programs: { enabled: boolean; eyebrow: string; title: string; titleHighlight: string; subtitle: string; ctaText: string; ctaButton: string };
    about: {
      enabled: boolean; eyebrow: string; title: string; titleHighlight: string; description: string;
      quote: string; quoteAuthor: string; featuresTitle: string; features: string[];
      vision: string; mission: string; stats: StatItem[]; closingQuote: string;
    };
    team: { enabled: boolean; eyebrow: string; title: string; titleHighlight: string; subtitle: string; members: TeamMember[] };
    gallery: { enabled: boolean; eyebrow: string; title: string; titleHighlight: string; subtitle: string };
    contact: { enabled: boolean; eyebrow: string; title: string; titleHighlight: string; subtitle: string; formTitle: string; formNote: string };
    steps: { enabled: boolean; eyebrow: string; title: string; titleHighlight: string; subtitle: string; items: StepItem[] };
    testimonials: { enabled: boolean; eyebrow: string; title: string; titleHighlight: string; subtitle: string; items: Testimonial[] };
    faq: { enabled: boolean; eyebrow: string; title: string; titleHighlight: string; subtitle: string; items: FaqItem[] };
    cta: { enabled: boolean; title: string; subtitle: string; primaryCta: string; secondaryCta: string };
  };
}

export const DEFAULT_CONFIG: SiteConfig = {
  brand: {
    name: "LPK Borneo Citra Gemilang",
    tagline: "Lembaga Pelatihan Kerja",
    logo: logoDefault,
    phoneDisplay: "+62 822 5418 7096",
    phoneTel: "+6282254187096",
    whatsapp: "6282254187096",
    email: "lpk.borneocg@gmail.com",
    address: "Jl. Brigjend Katamso No. 41B",
    city: "Bontang, Kalimantan Timur",
    legalAddress: "Jl. Dewi Sartika Gg. Kulintang 4 No. 21, Kel. Bontang Baru, Kec. Bontang Utara, Kota Bontang 75311",
    nib: "3001250056199",
    hoursWeekday: "Senin - Jumat: 08:00 - 17:00",
    hoursWeekend: "Sabtu: 08:00 - 12:00",
    mapEmbed:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3989.8070829105063!2d117.46605467546635!3d0.13598616394783314!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x320a130010d879fd%3A0x65547125d8c222f5!2sBorneo%20Citra%20Gemilang!5e0!3m2!1sen!2sid!4v1759376856862!5m2!1sen!2sid",
    instagram: "",
    facebook: "",
    tiktok: "",
    youtube: "",
  },
  theme: {
    preset: "navy",
    primary: "#0b2447",
    accent: "#e7b623",
    secondary: "#19376d",
    headingFont: "Plus Jakarta Sans",
    bodyFont: "Inter",
    radius: 12,
  },
  seo: {
    title: "LPK Borneo Citra Gemilang | Lembaga Pelatihan Kerja di Bontang",
    description:
      "LPK Borneo Citra Gemilang (BCG Academy) — lembaga pelatihan kerja di Bontang dengan kurikulum berbasis SKKNI, instruktur profesional, dan akses uji kompetensi BNSP.",
    ogImage: "",
  },
  sectionOrder: ["hero", "programs", "steps", "offer", "about", "team", "testimonials", "gallery", "faq", "cta", "contact"],
  sections: {
    hero: {
      enabled: true,
      badge: "Lembaga Pelatihan Kerja • Bontang, Kalimantan Timur",
      titleBefore: "Bangun Keterampilan,",
      titleHighlight: "Raih Karier",
      titleAfter: "yang Anda Impikan",
      subtitle:
        "BCG Academy menyelenggarakan pelatihan berbasis kompetensi (SKKNI) dengan instruktur profesional dan akses uji kompetensi BNSP — dirancang agar peserta siap bekerja maupun berwirausaha.",
      primaryCta: "Lihat Program",
      secondaryCta: "Konsultasi via WhatsApp",
      image: "",
      highlights: [
        "Kurikulum berbasis SKKNI",
        "Akses uji kompetensi BNSP",
        "Praktik langsung bersama instruktur",
        "Kelas kecil, pendampingan personal",
      ],
      stats: [
        { value: "6", label: "Program Pelatihan" },
        { value: "BNSP", label: "Sertifikasi Resmi" },
        { value: "SKKNI", label: "Standar Kurikulum" },
      ],
    },
    offer: {
      enabled: true,
      eyebrow: "Keunggulan",
      title: "Mengapa",
      titleHighlight: "BCG Academy",
      subtitle:
        "Pelatihan yang terstruktur, terukur, dan diakui — dari belajar keterampilan hingga sertifikasi kompetensi.",
      items: [
        {
          icon: "graduation",
          title: "Pelatihan Berbasis Kompetensi",
          desc: "Program praktis yang disusun berdasarkan Standar Kompetensi Kerja Nasional Indonesia (SKKNI), siap kerja dan wirausaha.",
        },
        {
          icon: "award",
          title: "Sertifikasi Resmi BNSP",
          desc: "Akses uji kompetensi dari Badan Nasional Sertifikasi Profesi. Sertifikat sah dan diakui secara nasional.",
        },
        {
          icon: "briefcase",
          title: "Dukungan Karier & Wirausaha",
          desc: "Jejaring dengan perusahaan, UMKM, dan komunitas lokal untuk membuka peluang kerja dan lahirnya wirausaha muda.",
        },
      ],
    },
    programs: {
      enabled: true,
      eyebrow: "Program",
      title: "Program Pelatihan",
      titleHighlight: "Unggulan",
      subtitle:
        "Pilih program yang sesuai dengan minat dan tujuan karier Anda. Setiap program dipandu instruktur profesional dan mengacu pada standar kompetensi nasional.",
      ctaText: "Belum menemukan program yang sesuai? Tim kami siap membantu Anda memilih.",
      ctaButton: "Konsultasi Program",
    },
    about: {
      enabled: true,
      eyebrow: "Tentang Kami",
      title: "Tentang",
      titleHighlight: "BCG Academy",
      description:
        "LPK Borneo Citra Gemilang (BCG Academy) adalah lembaga pelatihan kerja yang berfokus pada pengembangan keterampilan praktis dan profesional di Kota Bontang dan sekitarnya. Program pelatihan dirancang berdasarkan SKKNI dengan akses uji kompetensi BNSP, dipandu instruktur berpengalaman.",
      quote:
        "Kami berkomitmen mencetak SDM yang unggul, berdaya saing, dan siap kerja melalui program pelatihan berbasis kompetensi sesuai standar nasional.",
      quoteAuthor: "Euis Paramitha, Direktur",
      featuresTitle: "Keunggulan Kami",
      features: [
        "Kurikulum berbasis SKKNI dan standar BNSP",
        "Instruktur profesional dengan pengalaman di bidangnya",
        "Praktik langsung, bukan sekadar teori",
        "Akses uji kompetensi dan sertifikat resmi",
        "Jejaring perusahaan, UMKM, dan komunitas lokal",
      ],
      vision:
        "Menjadi lembaga pelatihan kerja unggulan di Kalimantan Timur yang menghasilkan SDM profesional, berkarakter, dan berdaya saing global.",
      mission:
        "Memberikan pendidikan dan pelatihan kerja berkualitas yang relevan dengan kebutuhan industri dan mengembangkan potensi peserta didik secara optimal.",
      stats: [
        { value: "SKKNI", label: "Acuan Kurikulum" },
        { value: "BNSP", label: "Uji Kompetensi" },
        { value: "6", label: "Program Pelatihan" },
        { value: "3", label: "Instruktur Profesional" },
      ],
      closingQuote:
        "Pendidikan dan keterampilan adalah kunci untuk membuka peluang yang lebih luas. LPK Borneo Citra Gemilang hadir sebagai mitra bagi masyarakat yang ingin meningkatkan kemampuan, mengembangkan karier, dan membangun masa depan yang lebih gemilang.",
    },
    team: {
      enabled: true,
      eyebrow: "Tim Pengajar",
      title: "Instruktur",
      titleHighlight: "Kami",
      subtitle:
        "Setiap program dipandu instruktur profesional yang berpengalaman, membimbing peserta menghadapi dunia kerja maupun wirausaha.",
      members: [
        {
          photo: euisPhoto,
          name: "Euis Paramitha H., S.Pd",
          role: "Direktur / Instruktur",
          bio: "Memimpin LPK Borneo Citra Gemilang dengan visi membangun lembaga pelatihan yang berkualitas dan relevan dengan kebutuhan industri. Juga berperan sebagai instruktur administrasi modern, manajemen dokumen, serta aplikasi perkantoran.",
        },
        {
          photo: harisPhoto,
          name: "Haris Fadilah, S.M",
          role: "Instruktur Digital Marketing & Desain Grafis",
          bio: "Berpengalaman di bidang desain kreatif dan proyek digital. Membimbing peserta menguasai software desain modern, prinsip visual, dan karya yang profesional untuk kebutuhan industri kreatif maupun dunia usaha.",
        },
        {
          photo: yogaPhoto,
          name: "Yoga Satrya Bagus, SH., A.Md.T",
          role: "Instruktur Operator Komputer",
          bio: "Berpengalaman di bidang teknologi informasi, membimbing peserta menguasai keterampilan komputer, pengolahan data, dan aplikasi perkantoran untuk kebutuhan kerja yang praktis dan efektif.",
        },
      ],
    },
    gallery: {
      enabled: true,
      eyebrow: "Dokumentasi",
      title: "Galeri",
      titleHighlight: "Kegiatan",
      subtitle: "Dokumentasi kegiatan pelatihan, sertifikasi, dan kerja sama LPK Borneo Citra Gemilang.",
    },
    contact: {
      enabled: true,
      eyebrow: "Kontak",
      title: "Hubungi",
      titleHighlight: "Kami",
      subtitle:
        "Ingin tahu program yang cocok untuk Anda? Hubungi kami untuk konsultasi dan informasi pendaftaran.",
      formTitle: "Kirim Pesan",
      formNote: "Pesan Anda akan diteruskan ke WhatsApp tim kami agar mendapat respons lebih cepat.",
    },
    steps: {
      enabled: true,
      eyebrow: "Cara Daftar",
      title: "Mulai dalam",
      titleHighlight: "4 langkah",
      subtitle: "Dari memilih program sampai memegang sertifikat, semuanya jelas sejak awal.",
      items: [
        { title: "Pilih program", desc: "Lihat jadwal, biaya, kurikulum, dan syarat di halaman tiap program." },
        { title: "Daftar online", desc: "Isi data diri dan konfirmasi pendaftaran. Tim kami akan menghubungi Anda." },
        { title: "Ikuti pelatihan", desc: "Belajar langsung bersama instruktur, praktik, dan materi pendukung." },
        { title: "Raih sertifikat", desc: "Selesaikan pelatihan dan dapatkan sertifikat yang bisa diverifikasi online." },
      ],
    },
    testimonials: {
      enabled: true,
      eyebrow: "Kata Alumni",
      title: "Cerita dari",
      titleHighlight: "alumni kami",
      subtitle: "Pengalaman peserta yang telah menyelesaikan pelatihan di BCG Academy.",
      items: [],
    },
    faq: {
      enabled: true,
      eyebrow: "FAQ",
      title: "Pertanyaan yang",
      titleHighlight: "sering diajukan",
      subtitle: "Belum menemukan jawabannya? Tanyakan langsung lewat WhatsApp.",
      items: [
        { q: "Bagaimana cara mendaftar?", a: "Pilih program di halaman Program, lalu klik Daftar. Anda juga bisa menghubungi kami lewat WhatsApp untuk dibantu mendaftar." },
        { q: "Apakah perlu pengalaman sebelumnya?", a: "Sebagian besar program dirancang untuk pemula. Level setiap program tercantum di halaman programnya." },
        { q: "Apakah peserta mendapat sertifikat?", a: "Ya. Peserta yang menyelesaikan pelatihan mendapat sertifikat kelulusan yang keasliannya bisa diperiksa di halaman Verifikasi Sertifikat." },
        { q: "Berapa biaya pelatihan?", a: "Biaya tercantum di halaman setiap program. Untuk pertanyaan seputar pembayaran, hubungi kami lewat WhatsApp." },
        { q: "Di mana lokasi pelatihan?", a: "Pelatihan tatap muka berlangsung di kantor kami di Bontang. Alamat lengkap dan peta ada di bagian Kontak." },
      ],
    },
    cta: {
      enabled: true,
      title: "Siap meningkatkan keterampilan Anda?",
      subtitle: "Pilih program yang sesuai, atau konsultasikan dulu dengan tim kami. Gratis.",
      primaryCta: "Lihat Program",
      secondaryCta: "Konsultasi via WhatsApp",
    },
  },
};

/* ----------------------------- tema ------------------------------ */

export interface ThemePreset { id: string; label: string; primary: string; accent: string; secondary: string }

export const THEME_PRESETS: ThemePreset[] = [
  { id: "navy", label: "Navy & Emas (default)", primary: "#0b2447", accent: "#e7b623", secondary: "#19376d" },
  { id: "emas", label: "Hitam & Emas (lama)", primary: "#09090b", accent: "#e7b623", secondary: "#052c6b" },
  { id: "hijau", label: "Hijau Profesional", primary: "#052e2b", accent: "#d4a72c", secondary: "#0f766e" },
  { id: "maroon", label: "Maroon Elegan", primary: "#2a0a10", accent: "#e0a526", secondary: "#7f1d1d" },
  { id: "slate", label: "Slate Modern", primary: "#0f172a", accent: "#38bdf8", secondary: "#1e40af" },
];

export const HEADING_FONTS = ["Plus Jakarta Sans", "Sora", "Outfit", "Manrope", "Poppins", "Montserrat", "DM Serif Display", "Playfair Display", "Lora"];
export const BODY_FONTS = ["Inter", "Plus Jakarta Sans", "Manrope", "DM Sans", "Nunito Sans", "Open Sans"];

export function hexToHsl(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  if (Number.isNaN(n) || h.length !== 6) return [0, 0, 0];
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let hue = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
  }
  return [Math.round(hue), Math.round(s * 100), Math.round(l * 100)];
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));
export const hsl = (h: number, s: number, l: number) => `${h} ${clamp(s)}% ${clamp(l)}%`;

/* --------------------------- util merge --------------------------- */

const isObj = (v: any) => v && typeof v === "object" && !Array.isArray(v);

/** Deep-merge: objek digabung rekursif, array & primitif diganti. `undefined`/`null` diabaikan. */
export function mergeConfig<T>(base: T, over: any): T {
  if (!isObj(base) || !isObj(over)) return (over === undefined || over === null ? base : over) as T;
  const out: any = { ...(base as any) };
  for (const k of Object.keys(over)) {
    const v = over[k];
    if (v === undefined || v === null) continue;
    out[k] = isObj((base as any)[k]) ? mergeConfig((base as any)[k], v) : v;
  }
  return out;
}

export function normalizeConfig(raw: any): SiteConfig {
  const cfg = mergeConfig(DEFAULT_CONFIG, raw);
  // sectionOrder harus memuat semua section (section baru di masa depan tetap muncul)
  const known = DEFAULT_CONFIG.sectionOrder;
  const order = (Array.isArray(cfg.sectionOrder) ? cfg.sectionOrder : []).filter((s) => known.includes(s));
  known.forEach((s) => { if (!order.includes(s)) order.push(s); });
  cfg.sectionOrder = order;
  return cfg;
}

export const SECTION_LABELS: Record<SectionId, string> = {
  hero: "Hero (banner utama)",
  programs: "Program Pelatihan",
  steps: "Cara Daftar",
  offer: "Keunggulan",
  testimonials: "Testimoni",
  faq: "FAQ",
  cta: "Ajakan Daftar",
  about: "Tentang Kami",
  team: "Instruktur",
  gallery: "Galeri",
  contact: "Kontak",
};
