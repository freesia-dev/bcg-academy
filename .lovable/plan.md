
# Rencana: Auth Peserta + Katalog Kursus + Enrollment

Membangun jalur lengkap dari **registrasi peserta → pilih kursus → daftar/bayar → masuk ke "Kursus Saya"**. Portal belajar (player video, kuis, sertifikat) menyusul di langkah berikutnya.

## 1. Auth Peserta

`src/pages/Auth.tsx` sekarang dipakai admin & peserta bersama — saya pisahkan perannya, bukan filenya:

- Tetap satu halaman `/auth` (Login + Daftar dalam tab).
- Form **Daftar** tambah field: Nama lengkap, Nomor WhatsApp (disimpan ke `profiles` via trigger `handle_new_user` yang sudah ada — diteruskan via `options.data`).
- Setelah login:
  - Jika user punya role `admin` → redirect `/admin` (perilaku lama).
  - Selain itu → redirect `/kursus-saya`.
- Tambah halaman `/reset-password` untuk recovery (wajib).
- Aktifkan Google OAuth + email/password (sudah didefault Lovable Cloud).
- Aktifkan auto-confirm email agar peserta bisa langsung login tanpa verifikasi (dapat dimatikan nanti).

## 2. Katalog Kursus Publik

Route baru `/kursus` (sekaligus alias dari menu yang ada):

- Grid kursus dari tabel `courses` (yang `is_published=true`).
- Filter: **Tipe** (Online / Offline), **Harga** (Gratis / Berbayar), **Kategori**.
- Setiap kartu: cover, judul, badge tipe + harga (Rp/Gratis), durasi, level, tombol "Detail".
- Update Header dropdown "Program Pelatihan" → arahkan ke `/kursus`.

## 3. Detail Kursus

Route `/kursus/:slug`:

- Hero: cover, judul, instruktur, harga, badge tipe.
- Silabus: daftar modul + pelajaran (judul saja; lock icon kalau belum enrolled).
- Pelajaran dengan `is_preview=true` boleh diintip tanpa daftar.
- Tombol aksi dinamis:
  - Belum login → "Masuk untuk Daftar".
  - Sudah login, belum enrolled, kursus **gratis** → "Daftar Sekarang" (langsung `status='active'`).
  - Sudah login, belum enrolled, kursus **berbayar** → "Beli Kursus" → buka **CheckoutDialog**.
  - Sudah enrolled `pending_payment` → badge "Menunggu Verifikasi Admin".
  - Sudah enrolled `active`/`completed` → tombol "Mulai Belajar" (route `/learn/:slug` — placeholder dulu, dibangun langkah berikutnya).

## 4. Checkout (Transfer Manual)

`CheckoutDialog`:

- Tampilkan ringkasan: nama kursus + total harga.
- Info rekening transfer (diambil dari `site_content.payment_info` — saya seed default + bisa diedit admin nanti).
- Field: nominal transfer, metode (Transfer Bank/QRIS), upload bukti.
- Bukti diupload ke **bucket Storage baru `payment-proofs`** (private, RLS: peserta upload milik sendiri, admin baca semua).
- Submit → buat row `enrollments` (`status='pending_payment'`, `payment_proof_url`, `paid_at`).
- Edge function `notify-payment` kirim email ke `lpk.borneocg@gmail.com` (pakai Resend yang sudah ada).
- Toast: "Pembayaran terkirim. Admin akan verifikasi maks 1×24 jam".

## 5. Halaman "Kursus Saya"

Route `/kursus-saya` (proteksi: login wajib):

- Tab **Aktif** | **Menunggu Verifikasi** | **Selesai**.
- Kartu per enrollment: judul, status, progress bar (placeholder), tombol "Mulai Belajar" atau "Lihat Bukti".

## 6. Header & Navigasi

- Item menu baru "Kursus" → `/kursus` (menggantikan "Program Pelatihan" yang lama, tapi link offline-only tetap ada di footer).
- Jika user login: avatar dropdown (Kursus Saya · Logout). Jika admin: tambah "Dashboard Admin".

## 7. Storage Bucket

- Buat bucket **private** `payment-proofs` via `storage_create_bucket`.
- RLS pada `storage.objects`:
  - INSERT: authenticated, path harus diawali `{auth.uid()}/`.
  - SELECT: pemilik file atau admin.
  - DELETE: admin.

## 8. Konfigurasi Auth

- `configure_auth`: `auto_confirm_email=true`, `password_hibp_enabled=true`, `disable_signup=false`.
- Konfigurasi Google provider.

## File yang Dibuat/Diubah

**Baru:**
- `src/pages/CoursesPage.tsx`
- `src/pages/CourseDetail.tsx`
- `src/pages/MyCourses.tsx`
- `src/pages/ResetPassword.tsx`
- `src/pages/Learn.tsx` *(placeholder)*
- `src/components/CheckoutDialog.tsx`
- `src/components/auth/ProtectedRoute.tsx`
- `src/hooks/useAuth.ts` *(session + role + profile)*
- `src/hooks/useCourses.ts`, `src/hooks/useEnrollments.ts`
- `supabase/functions/notify-payment/index.ts`

**Diubah:**
- `src/App.tsx` — route baru
- `src/components/Header.tsx` — link "Kursus" + avatar dropdown
- `src/pages/Auth.tsx` — field nama/WA + redirect berbasis role
- `supabase/config.toml` — daftarkan `notify-payment`

## Catatan

- Belum ada portal belajar (player video, mark complete, kuis) — itu langkah berikutnya.
- Belum ada sertifikat — langkah berikutnya.
- Pembayaran masih manual; Midtrans menyusul saat Anda siapkan kredensial.
- Panel admin perlu tab baru "Verifikasi Pembayaran" — saya tambahkan di langkah ini agar alur end-to-end bisa Anda uji (tanpanya enrollment akan menggantung).

Lanjutkan?
