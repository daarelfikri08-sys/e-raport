# E-Rapor Sekolah

Fondasi aplikasi E-Rapor berbasis Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth, dan PostgreSQL Supabase.

## Status implementasi

- **Phase 1:** satu migration SQL awal, RLS, seed demo, ERD, dan test database tersedia.
- **Phase 2:** login email/password, refresh session, proteksi route berdasarkan profil, layout responsif, dan dashboard kosong per role tersedia.
- **Phase 3:** CRUD admin guru, siswa, kelas, mapel, periode, jenis penilaian, penugasan, monitoring, dashboard nyata, dan pengaturan sekolah tersedia.
- CRUD periode akademik (tahun pelajaran + semester), kelas dengan penempatan wali kelas, serta **input nilai guru mapel** tersedia.
- Monitoring wali kelas, ranking real-time, PDF rapor, Excel import/export, dan audit otomatis **belum diimplementasikan**.

### Fitur yang siap digunakan

1. **Login & autentikasi**
   - Email/password melalui Supabase Auth
   - Role-based access control (admin, teacher, homeroom_teacher)
   - Proteksi middleware dan server components
   - Logout terintegrasi dengan error feedback

2. **Tahun Pelajaran & Semester** (`/admin/academic-years`)
   - Tambah/edit tahun pelajaran dengan format `YYYY/YYYY`
   - Validasi tanggal aktif dan periode
   - Aktifkan periode secara atomik via RPC database
   - Satu tahun dan satu semester aktif secara global
   - Tutup edit/delete jika ada data turunan

3. **Kelas & Wali Kelas** (`/admin/classes`)
   - Pencarian nama kelas + pagination 20 baris
   - Penentukan wali kelas dari guru aktif ber-role homeroom_teacher
   - Penempatan dapat dilepas
   - Hapus ditolak jika ada siswa, penugasan, atau rapor

4. **Input Nilai Guru Mapel** (`/teacher/grades`)
   - Pilih mata pelajaran mengajar + kelas + tahun aktif
   - Grid nilai inline untuk semua siswa dalam kelas
   - Komponen penilaian dinamis dari config admin (Tugas, PTS, PAS, dll)
   - Simpan draft nilai tunggal atau batch
   - Submit nilai dengan validasi kelengkapan semua siswa
   - Perhitungan nilai akhir real-time dengan bobot
   - Status draft/submitted/verified/locked
   - Input dinonaktifkan setelah submit, hanya admin yang dapat buka revisi

## Migration aktif

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_class_management.sql
supabase/migrations/003_strengthen_delete_guards.sql
supabase/migrations/004_admin_master_data.sql
```

Jangan menjalankan migration dari versi schema lain pada project Supabase yang sama.

## Persyaratan

- Node.js 20.19+, 22.13+, atau versi LTS yang lebih baru.
- Project Supabase khusus E-Rapor, terpisah dari project lain.
- Project Vercel khusus E-Rapor.

Versi Node lokal saat dokumentasi ini dibuat adalah 22.12.0. Build berhasil, tetapi beberapa tooling menampilkan peringatan engine dan sebaiknya Node dinaikkan ke 22.13+.

## Environment

Salin `.env.example` menjadi `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=PUBLIC_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=SERVER_ONLY_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` hanya untuk proses server tepercaya pada fase yang membutuhkannya. Jangan mengimpor key tersebut ke Client Component, jangan menambahkan prefix `NEXT_PUBLIC_`, dan jangan commit `.env.local`.

## Memasang database

### Supabase Dashboard

1. Buat project Supabase E-Rapor.
2. Buka **SQL Editor**.
3. Jalankan seluruh `supabase/migrations/001_initial_schema.sql` sekali pada database kosong.
4. Jalankan `002_class_management.sql`, `003_strengthen_delete_guards.sql`, lalu `004_admin_master_data.sql` secara berurutan.
5. Pastikan setiap transaksi berakhir dengan `COMMIT`.

### Database yang sudah memakai migration 001

Pada database yang sudah memakai 001–003, terapkan **hanya migration baru `004_admin_master_data.sql`** melalui SQL Editor atau `supabase db push` setelah memeriksa project ref dan riwayat migration. Jangan mengulang migration lama, menjalankan reset, atau menghapus data. Backup dan uji di staging terlebih dahulu.

Modul `/admin/classes` memakai pencarian nama dan pagination server-side 20 baris. Wali kelas hanya dapat dipilih dari guru aktif dengan profil aktif ber-role `homeroom_teacher`; penempatan bisa dilepas. Tidak ada kolom tahun akademik pada kelas. Penghapusan ditolak jika ada `student_classes`, `teacher_subjects`, atau `report_cards`, sebelum FK cascade berjalan. Fungsi trigger memiliki fixed search path dan tidak diberi akses RPC kepada role API.

Migration tidak mengubah penempatan lama. Jika guru/profil dinonaktifkan atau role berubah setelah penempatan, admin harus mengganti atau melepas wali saat mengedit kelas; status guru/profil tidak otomatis diubah oleh modul ini. Harness database menjalankan kedua migration dan menguji CRUD lintas role, validasi penempatan, serta setiap jenis dependensi penghapusan secara terpisah.

### Supabase CLI

Jika CLI tersedia dan folder sudah ditautkan ke project E-Rapor yang benar:

```bash
supabase link --project-ref PROJECT_REF_E_RAPOR
supabase db push
```

Periksa project ref sebelum menjalankan push agar tidak menyentuh project lain.

## Membuat akun

Password hanya dibuat melalui Supabase Auth, bukan disimpan dalam tabel aplikasi.

1. Buat pengguna melalui **Authentication → Users**.
2. Salin UUID pengguna.
3. Provision profil menggunakan SQL tepercaya:

```sql
insert into public.profiles (id, full_name, role, is_active)
values ('UUID_AUTH_USER', 'Nama Administrator', 'admin', true);
```

Untuk guru, tambahkan baris `teachers` yang menunjuk `profiles.id`:

```sql
insert into public.teachers (profile_id, nip, full_name, email)
values ('UUID_AUTH_USER', 'NIP', 'Nama Guru', 'guru@sekolah.id');
```

Role tidak diambil dari metadata yang dapat diubah pengguna. Trigger database juga menolak pengguna yang mencoba mengubah `role` atau `is_active` profilnya sendiri.

## Seed demo

`supabase/seed.sql` tidak membuat Auth user dan tidak menyimpan password.

1. Buat enam akun demo melalui Supabase Auth.
2. Ganti enam UUID placeholder pada temporary table `seed_staff` dengan UUID akun sebenarnya.
3. Jalankan seed sebagai sesi SQL tepercaya.

Dengan enam akun tersedia, seed menghasilkan 1 admin, 3 guru mapel, 2 wali kelas, 3 kelas, 30 siswa, 10 mapel, 30 penugasan, 30 submission draft, dan 90 nilai latihan draft. Seed dapat dijalankan ulang dan menggunakan UUID deterministik.

## Menjalankan aplikasi

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Pemeriksaan kualitas

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Atau jalankan seluruhnya:

```bash
npm run check
```

Test database memakai PGlite dengan stub `auth.users`, `auth.uid()`, `authenticated`, dan `anon`. `pgcrypto` dilewati hanya pada harness karena PGlite tidak membundel extension control file; Supabase menyediakan extension tersebut. Tetap lakukan smoke test pada project Supabase staging sebelum produksi.

## Batas schema SQL awal

Schema ini sengaja mengikuti model SQL awal yang dipilih:

- histori `student_classes` hanya per tahun, bukan per semester;
- `classes` tidak menyimpan tahun akademik;
- penugasan `teacher_subjects` hanya per tahun;
- assessment type bersifat global;
- attendance berupa agregat semester;
- status/timestamp workflow belum dipaksa melalui RPC transaksional;
- audit log belum memiliki trigger otomatis;
- penghapusan beberapa foreign key menggunakan `CASCADE`.

Konsekuensi dan relasi lengkap didokumentasikan di [`docs/erd.md`](docs/erd.md). Sebelum data produksi dimasukkan, perubahan struktur harus dibuat sebagai migration maju baru—jangan mengedit migration yang sudah diterapkan.

## Keamanan aplikasi

- Middleware dan layout server memverifikasi session, role, serta `is_active`.
- Pemeriksaan UI/server bukan pengganti RLS.
- Guru mapel dibatasi ke assignment miliknya oleh policy nilai.
- Wali kelas hanya memiliki akses baca nilai kelasnya pada SQL awal.
- Jangan memberikan service-role key kepada browser atau aplikasi pihak ketiga.
- Project Supabase dan Vercel E-Rapor harus tetap terpisah dari akun/project lain.

## Deploy Vercel

1. Import repository/folder E-Rapor ke project Vercel yang benar.
2. Tambahkan environment variable Supabase E-Rapor untuk Production dan Preview sesuai kebutuhan.
3. Gunakan build command `npm run build`.
4. Atur Supabase **Site URL** dan **Redirect URLs** ke domain Vercel E-Rapor.
5. Jalankan smoke test login untuk ketiga role setelah deploy.

Belum ada deployment otomatis atau koneksi ke akun Supabase/Vercel dalam source ini.
