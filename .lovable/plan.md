
# Rencana: Sinkronisasi Profil + Transformasi ke LMS

## Bagian 1 — Sinkronisasi Konten Company Profile

Mengganti/menyelaraskan teks di komponen berikut sesuai PDF (tagline resmi, sambutan direktur, visi-misi, "Our Offer", deskripsi layanan, kontak).

- **Hero / Header**: tambah tagline resmi *"Membangun Keterampilan, Mewujudkan Masa Depan Gemilang"*.
- **About (`src/components/About.tsx` + `AboutPage.tsx`)**: ganti narasi dengan ringkasan resmi PDF + Welcome Message dari Direktur (Euis Paramitha) + Visi & Misi.
- **Programs**: pastikan 6 program selaras dengan layanan resmi (Administrasi Perkantoran, Barista, Desain Grafis, Operator Komputer, Tata Kecantikan/Rias, Menjahit/Digital Marketing — disesuaikan data Anda yang ada).
- **"Our Offer"**: section baru di homepage (3 kartu: Pelatihan Berbasis Kompetensi · Sertifikasi BNSP · Dukungan Karier & Wirausaha).
- **Contact**: konfirmasi alamat resmi *Jl. Dewi Sartika Gg. Kulintang 4 No. 21, Kel. Bontang Baru, Kec. Bontang Utara, 75311*, telp/WA `+62 822 5418 7096`, email `lpk.borneocg@gmail.com`.
- **Legalitas / Footer**: tambah info NIB `3001250056199` dan tahun pendirian (Akta Notaris 6 Januari 2025).

## Bagian 2 — Arsitektur LMS

Tiga jenis kursus dalam satu sistem:

| Jenis | Akses | Pembayaran |
|---|---|---|
| **Online berbayar** | Setelah bayar, peserta dapat akses modul/video/kuis di portal | Midtrans (nanti) — sementara "Transfer + konfirmasi admin" |
| **Offline berbayar** | Daftar via form → admin verifikasi pembayaran → dijadwalkan | Idem |
| **Offline gratis** | Daftar via form, langsung dijadwalkan | — |

### Struktur data (tabel baru)

```text
courses
 ├─ id, slug, title, description, cover_image
 ├─ type: 'online' | 'offline'
 ├─ price (nullable, 0 = gratis), is_free, currency
 ├─ duration, capacity, level, category
 ├─ is_published, sort_order
 └─ instructor_name, certificate_template

modules                      (urut per course)
 └─ id, course_id, title, sort_order

lessons                      (urut per module)
 ├─ id, module_id, title, sort_order
 ├─ content_type: 'video'|'text'|'file'|'embed'
 └─ video_url / content_md / file_url

quizzes                      (1 per modul / opsional)
 ├─ id, module_id, title, passing_score
 └─ questions (jsonb: pertanyaan, pilihan, jawaban benar)

enrollments                  (peserta ↔ kursus)
 ├─ id, user_id, course_id
 ├─ status: 'pending_payment'|'active'|'completed'|'cancelled'
 ├─ payment_method, payment_proof_url, paid_at
 └─ enrolled_at, completed_at, certificate_url

lesson_progress
 └─ user_id, lesson_id, completed_at

quiz_attempts
 └─ user_id, quiz_id, score, passed, answers (jsonb), submitted_at

site_content                 (CMS homepage)
 └─ key (unique), value (jsonb)     -- hero, about, offer, contact
```

Profil peserta disimpan di `profiles` (auto-create via trigger saat signup).

### Alur peserta (user flow)

1. Browsing katalog kursus (filter: online/offline, gratis/berbayar, kategori).
2. Klik kursus → halaman detail (silabus, instruktur, harga, tombol *Daftar* / *Beli*).
3. **Online berbayar**: login → "Beli" → upload bukti transfer → status `pending_payment` → admin verifikasi → `active` → tombol "Mulai Belajar".
4. **Offline**: isi form pendaftaran (sama seperti sekarang, email ke admin via edge function), admin verifikasi di panel.
5. **Portal belajar** (`/learn/:slug`): sidebar modul/pelajaran, player video / konten teks, tandai selesai, kuis di akhir modul, sertifikat auto-generate saat semua modul + kuis lulus.

### Akses & keamanan (RLS)

- `courses`, `modules`, `lessons` (judul): publik (`is_published=true`).
- **Konten penuh lesson & quiz**: hanya `authenticated` dengan `enrollment.status='active'` (dicek via security-definer function `has_active_enrollment(user_id, course_id)`).
- `enrollments`, `lesson_progress`, `quiz_attempts`: peserta hanya lihat miliknya; admin lihat semua via `has_role(uid,'admin')`.
- `site_content`: read publik, write admin.

## Bagian 3 — Panel Admin (perluasan `src/pages/Admin.tsx`)

Tab baru di samping Program & Galeri:

1. **Homepage CMS** — form edit konten hero, about, offer cards, contact (CRUD ke `site_content`).
2. **Kursus & Materi** — list kursus → builder modul + lesson (drag-sort), editor video URL/markdown/file upload, builder kuis (tambah pertanyaan + pilihan + jawaban benar).
3. **Peserta & Progress** — tabel enrollment per kursus, lihat % progress, hasil kuis, tombol terbitkan sertifikat manual.
4. **Pembayaran** — tab "Pending Payment": tampil bukti transfer, tombol *Verifikasi* (set status `active`) / *Tolak*. Tab "Laporan": total pendapatan, jumlah peserta per kursus, export CSV.

Komponen sekarang (Programs lama) tetap dipertahankan sebagai "Program Offline Unggulan" — atau dimigrasi ke `courses` dengan `type='offline'`. Saya rekomendasikan **migrasi**: data Programs jadi seed `courses` offline supaya satu sistem.

## Bagian 4 — Payment (Midtrans, persiapan nanti)

Yang perlu Anda siapkan saat siap mengaktifkan Midtrans:
1. Akun Midtrans (sandbox dulu) di https://dashboard.midtrans.com.
2. **Server Key** & **Client Key** dari menu *Settings → Access Keys*.
3. **Merchant ID**.
4. URL callback notifikasi (akan saya beri setelah edge function siap).
5. Aktivasi metode bayar yang diinginkan (QRIS, GoPay, VA BCA/Mandiri/BNI, kartu).

Sementara itu sistem pakai **transfer manual + verifikasi admin** sehingga tetap bisa jualan dari hari pertama.

## Urutan Eksekusi (jika disetujui)

1. **Migrasi DB** — buat tabel `profiles`, `courses`, `modules`, `lessons`, `quizzes`, `enrollments`, `lesson_progress`, `quiz_attempts`, `site_content` + RLS + security-definer + grants. Seed `courses` dari data `programs` yang ada.
2. **Sinkronisasi konten profil** (Bagian 1) — non-LMS, cepat.
3. **Auth peserta** — halaman signup/login peserta (terpisah dari `/auth` admin, atau dipakai bersama dengan role-routing).
4. **Katalog & detail kursus** publik (`/kursus`, `/kursus/:slug`).
5. **Checkout & upload bukti transfer** + edge function notifikasi admin.
6. **Portal belajar** (`/learn/:slug`) + tracking progress + kuis.
7. **Sertifikat auto-generate** (PDF via edge function).
8. **Admin panel — Homepage CMS, Course Builder, Pembayaran, Laporan**.
9. (Nanti) Integrasi Midtrans setelah Anda berikan kredensial.

## Catatan / Risiko

- Scope LMS sangat besar; saya sarankan dikerjakan **bertahap** per nomor di atas, masing-masing bisa direview sebelum lanjut. Mau saya kerjakan **Langkah 1 + 2** lebih dulu (fondasi DB + sinkron konten profil), atau langsung "all-in" sampai portal belajar berfungsi?
- Hak admin awal tetap menggunakan sistem `user_roles` yang sudah ada.
- Sertifikat awal: template HTML→PDF sederhana berisi nama, kursus, tanggal, tanda tangan Direktur. Bisa diperindah nanti.
