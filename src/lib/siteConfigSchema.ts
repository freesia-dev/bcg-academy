export type FieldType = "text" | "textarea" | "image" | "url" | "toggle" | "select" | "strings" | "list" | "number";

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  hint?: string;
  rows?: number;
  options?: { value: string; label: string }[];
  fields?: Field[];        // untuk type "list"
  itemLabel?: string;      // nama satu item list
  itemTitleKey?: string;   // field yang dipakai sebagai judul item
  max?: number;
  min?: number;
}

export interface Group { id: string; label: string; path: string[]; description?: string; fields: Field[] }

const stat: Field[] = [
  { key: "value", label: "Angka / kata", type: "text" },
  { key: "label", label: "Keterangan", type: "text" },
];

const titleFields: Field[] = [
  { key: "title", label: "Judul", type: "text" },
  { key: "titleHighlight", label: "Judul (kata berwarna)", type: "text" },
];

export const GROUPS: Group[] = [
  {
    id: "brand", label: "Identitas & Kontak", path: ["brand"],
    description: "Dipakai di header, footer, tombol WhatsApp, dan halaman kontak.",
    fields: [
      { key: "name", label: "Nama lembaga", type: "text" },
      { key: "tagline", label: "Tagline", type: "text" },
      { key: "logo", label: "Logo", type: "image", hint: "PNG transparan, rasio mendekati persegi atau lebar." },
      { key: "phoneDisplay", label: "Telepon (tampilan)", type: "text", hint: "+62 822 5418 7096" },
      { key: "phoneTel", label: "Telepon (untuk tombol telepon)", type: "text", hint: "+6282254187096" },
      { key: "whatsapp", label: "WhatsApp (tanpa + dan spasi)", type: "text", hint: "6282254187096" },
      { key: "email", label: "Email", type: "text" },
      { key: "address", label: "Alamat kantor / tempat pelatihan", type: "text" },
      { key: "city", label: "Kota", type: "text" },
      { key: "legalAddress", label: "Alamat terdaftar (legal)", type: "textarea", rows: 2, hint: "Tampil kecil di footer. Kosongkan jika sama dengan alamat kantor." },
      { key: "nib", label: "NIB", type: "text" },
      { key: "hoursWeekday", label: "Jam operasional (hari kerja)", type: "text" },
      { key: "hoursWeekend", label: "Jam operasional (akhir pekan)", type: "text" },
      { key: "mapEmbed", label: "URL embed Google Maps", type: "textarea", rows: 3, hint: "Google Maps → Bagikan → Sematkan peta → salin isi src." },
      { key: "instagram", label: "Instagram (URL)", type: "url" },
      { key: "facebook", label: "Facebook (URL)", type: "url" },
      { key: "tiktok", label: "TikTok (URL)", type: "url" },
      { key: "youtube", label: "YouTube (URL)", type: "url" },
    ],
  },
  {
    id: "seo", label: "SEO & Berbagi Link", path: ["seo"],
    description: "Judul dan gambar yang muncul di Google dan saat link dibagikan ke WhatsApp/sosmed.",
    fields: [
      { key: "title", label: "Judul halaman", type: "text", hint: "Ideal ≤ 60 karakter.", max: 70 },
      { key: "description", label: "Deskripsi", type: "textarea", rows: 3, hint: "Ideal ≤ 160 karakter.", max: 180 },
      { key: "ogImage", label: "Gambar pratinjau link (1200×630)", type: "image" },
    ],
  },
  {
    id: "hero", label: "Hero (banner utama)", path: ["sections", "hero"],
    fields: [
      { key: "badge", label: "Label kecil di atas judul", type: "text" },
      { key: "titleBefore", label: "Judul — bagian awal", type: "text" },
      { key: "titleHighlight", label: "Judul — kata berwarna", type: "text" },
      { key: "titleAfter", label: "Judul — bagian akhir", type: "text" },
      { key: "subtitle", label: "Subjudul", type: "textarea", rows: 3 },
      { key: "primaryCta", label: "Teks tombol utama", type: "text" },
      { key: "secondaryCta", label: "Teks tombol WhatsApp", type: "text" },
      { key: "image", label: "Foto hero (opsional)", type: "image", hint: "Foto kegiatan asli, rasio 4:3. Jika kosong, tampil kartu identitas + poin keunggulan." },
      { key: "highlights", label: "Poin keunggulan (kartu, saat tanpa foto)", type: "strings", hint: "Satu poin per baris." },
      { key: "stats", label: "Angka ringkas", type: "list", itemLabel: "Angka", itemTitleKey: "value", max: 3, fields: stat },
    ],
  },
  {
    id: "offer", label: "Keunggulan", path: ["sections", "offer"],
    fields: [
      ...titleFields,
      { key: "subtitle", label: "Subjudul", type: "textarea", rows: 2 },
      {
        key: "items", label: "Kartu keunggulan", type: "list", itemLabel: "Kartu", itemTitleKey: "title", max: 6,
        fields: [
          {
            key: "icon", label: "Ikon", type: "select",
            options: [
              { value: "graduation", label: "Topi wisuda" }, { value: "award", label: "Penghargaan" },
              { value: "briefcase", label: "Tas kerja" }, { value: "users", label: "Orang" },
              { value: "shield", label: "Perisai" }, { value: "book", label: "Buku" },
            ],
          },
          { key: "title", label: "Judul", type: "text" },
          { key: "desc", label: "Deskripsi", type: "textarea", rows: 3 },
        ],
      },
    ],
  },
  {
    id: "programs", label: "Program Pelatihan", path: ["sections", "programs"],
    description: "Daftar program diambil dari menu Admin → Kursus / Program. Di sini hanya teks pengantarnya.",
    fields: [
      ...titleFields,
      { key: "subtitle", label: "Subjudul", type: "textarea", rows: 3 },
      { key: "ctaText", label: "Kalimat ajakan di bawah daftar", type: "text" },
      { key: "ctaButton", label: "Teks tombol", type: "text" },
    ],
  },
  {
    id: "about", label: "Tentang Kami", path: ["sections", "about"],
    fields: [
      ...titleFields,
      { key: "description", label: "Deskripsi", type: "textarea", rows: 5 },
      { key: "quote", label: "Kutipan", type: "textarea", rows: 3 },
      { key: "quoteAuthor", label: "Penulis kutipan", type: "text" },
      { key: "featuresTitle", label: "Judul daftar keunggulan", type: "text" },
      { key: "features", label: "Daftar keunggulan", type: "strings", hint: "Satu poin per baris." },
      { key: "vision", label: "Visi", type: "textarea", rows: 3 },
      { key: "mission", label: "Misi", type: "textarea", rows: 3 },
      { key: "stats", label: "Angka ringkas", type: "list", itemLabel: "Angka", itemTitleKey: "value", max: 4, fields: stat },
      { key: "closingQuote", label: "Kutipan penutup", type: "textarea", rows: 3 },
    ],
  },
  {
    id: "team", label: "Instruktur", path: ["sections", "team"],
    fields: [
      ...titleFields,
      { key: "subtitle", label: "Subjudul", type: "textarea", rows: 2 },
      {
        key: "members", label: "Anggota tim", type: "list", itemLabel: "Instruktur", itemTitleKey: "name", max: 12,
        fields: [
          { key: "photo", label: "Foto (persegi)", type: "image" },
          { key: "name", label: "Nama & gelar", type: "text" },
          { key: "role", label: "Jabatan", type: "text" },
          { key: "bio", label: "Bio singkat", type: "textarea", rows: 4 },
        ],
      },
    ],
  },
  {
    id: "gallery", label: "Galeri", path: ["sections", "gallery"],
    description: "Foto galeri diunggah lewat Admin → Galeri. Section otomatis tersembunyi bila belum ada foto.",
    fields: [...titleFields, { key: "subtitle", label: "Subjudul", type: "textarea", rows: 2 }],
  },
  {
    id: "contact", label: "Kontak", path: ["sections", "contact"],
    description: "Detail kontak diatur di “Identitas & Kontak”.",
    fields: [
      ...titleFields,
      { key: "subtitle", label: "Subjudul", type: "textarea", rows: 2 },
      { key: "formTitle", label: "Judul formulir", type: "text" },
      { key: "formNote", label: "Catatan formulir", type: "text" },
    ],
  },
];
