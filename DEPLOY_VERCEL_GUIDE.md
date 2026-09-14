# 🚀 Panduan Deploy E-Rapor ke Vercel (Staging)

> **PENTING:** Proyek ini TIDAK menggunakan akun/organisasi **MFU Production**.
> Gunakan akun Vercel dan project Supabase **E-Rapor Anda sendiri**.

---

## 0. Prasyarat

| Item | Status |
|---|---|
| Migration 001–006 sudah dijalankan di Supabase E-Rapor | ✅ (Anda sudah menjalankan 005 & 006) |
| Akun Vercel khusus E-Rapor (bukan MFU Production) | ✅ Siapkan |
| Nilai `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | ✅ Ambil dari project Supabase E-Rapor |

> Di local, file `.env.local` sudah berisi nilai tersebut. Untuk Vercel, nilai yang sama harus dimasukkan sebagai **Environment Variables** di dashboard Vercel.

---

## 1. Siapkan Repository (Jika Belum Pakai Git)

Jika folder `e-raport/` belum menjadi repository Git:

```bash
cd "C:\Users\USER\OneDrive\Documents\Default Project\e-raport"
git init
git add .
git commit -m "E-Rapor: fondasi lengkap"
```

Kemudian push ke GitHub/GitLab/GitHub Enterprise pilihan Anda (contoh GitHub):

```bash
git remote add origin https://github.com/NAMA_AKUN_ANDARA/e-raport.git
git push -u origin main
```

> Ganti `NAMA_AKUN_ANDARA` dengan akun Anda. **Jangan** push ke repo milik MFU Production.

---

## 2. Import ke Vercel

1. Buka **https://vercel.com** → login **akun E-Rapor Anda**.
2. Klik **Add New… → Project**.
3. Hubungkan GitHub Anda dan pilih repository **e-raport**.
4. Vercel otomatis mendeteksi **Next.js** (framework).
5. (Opsional) Pilih **Root Directory**: `e-raport/` bila repo berisi banyak project.
6. Klik **Deploy**.

> Vercel akan membaca `vercel.json` yang sudah disediakan (framework `nextjs`).

---

## 3. Atur Environment Variables (WAJIB)

Buka **Project → Settings → Environment Variables**, lalu tambahkan nilai dari project Supabase **E-Rapor**:

| Nama | Contoh | Tipe |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | Public (boleh lihat client) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIs...` | **Build-time + Runtime, server-only** |

- Klik **Add** untuk tiap variabel.
- Centang **Environment**: `Preview` dan `Production` (hampir selalu keduanya).
- `SUPABASE_SERVICE_ROLE_KEY` **jangan pernah** dibaca dari client; tetap di server. Jangan beri prefix `NEXT_PUBLIC_`.

Setelah menambah variabel, klik **Redeploy** supaya environment baru ikut terbawa ke build.

---

## 4. Deploy & Domain

Setelah `git push` / **Deploy**, Vercel memberi domain:

```text
https://e-raport-something.vercel.app
```

Untuk menambahkan domain khusus (mis. `raport.sekolah.sch.id`):

1. **Settings → Domains**.
2. Tambahkan domain.
3. Atur DNS sesuai petunjuk Vercel (record A/CNAME).

---

## 5. Sesuaikan Supabase untuk URL Produksi

Buka Dashboard Supabase (project E-Rapor) → **Authentication → URL Configuration**:

| Field | Isi |
|---|---|
| **Site URL** | `https://e-raport-something.vercel.app` |
| **Redirect URLs** | `https://e-raport-something.vercel.app/**` <br> `http://localhost:3000/**` (untuk dev) |

Ini penting agar login/password di produksi bekerja dan redirect sesuai domain Anda.

---

## 6. Verifikasi Setelah Deploy

Buka domain produksi lalu uji:

- [ ] Halaman `/login` tampil.
- [ ] Login `admin@sekolah.id` → masuk `/admin/dashboard`.
- [ ] Login `guru@sekolah.id` → masuk `/teacher/dashboard`.
- [ ] Login `wali@sekolah.id` → masuk `/homeroom/dashboard`.
- [ ] Guru coba buka `/admin/*` → dialihkan ke "Akses tidak diizinkan".
- [ ] Buka `/admin/students` → tombol **Impor Excel / Template / Ekspor** berfungsi.
- [ ] Buka `/admin/audit-log` → perubahan data master tercatat.
- [ ] Buka `/homeroom/reports` → preview rapor + tombol cetak muncul.

---

## 7. Troubleshooting Cepat

| Gejala | Kemungkinan | Solusi |
|---|---|---|
| Login gagal di produksi | Redirect URL belum diatur | Update Auth → URL Configuration (langkah 5) + Redeploy |
| Error "Konfigurasi Supabase belum lengkap" | Env tidak terisi / salah project | Periksa environment vars di Settings → Environment |
| Service key bocor/tidak berfungsi | Gunakan key project lain | Pastikan pakai key project E-Rapor sendiri |
| Data kosong | Migration belum jalan di project tsb | Jalankan 001–006 di SQL Editor Supabase E-Rapor |
| Logo tidak muncul | Bucket storage belum dibuat | Pastikan migration `005` sudah dijalankan |

---

## 8. Keandalan & Keamanan

- `vercel.json` sudah menambahkan HTTP security headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- Region default `sin1` (Singapura) — sesuaikan bila diperlukan.
- RLS tetap aktif; `SUPABASE_SERVICE_ROLE_KEY` hanya dipakai di server (`lib/supabase/admin.ts`).
- Jangan commit `.env.local` (sudah di `.gitignore`).

---

## 9. Ringkasan Alur

```text
1. git init + commit + push ke repo Anda
2. Import repo ke Vercel (akun E-Rapor)
3. Tambah 3 environment variables
4. Deploy
5. Set Site URL & Redirect URL di Supabase (E-Rapor)
6. Uji ketiga role
```

Selesai — aplikasi E-Rapor Anda live di Vercel menggunakan Supabase E-Rapor, terpisah sepenuhnya dari MFU Production.