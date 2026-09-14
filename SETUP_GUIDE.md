# 🎓 E-RAPORT SEKOLAH - FINAL SETUP GUIDE

## Status Implementasi: ✅ Production Ready

Semua fitur sudah lengkap dan siap deploy ke Supabase + Vercel.

---

## 🚀 Quick Start (5 Langkah)

### 1️⃣ Setup Supabase Database (10 menit)

```bash
# Buka https://supabase.com/dashboard
# Buat project baru: "E-Raport Sekolah"
# Salin Project URL dan Anon Key ke .env.local nanti
```

**Install Migration:**

1. **Dashboard → SQL Editor → New Query**
2. **Copy-paste SEMUA isi migration ini**: `e-raport/supabase/migrations/001_initial_schema.sql`
3. Klik **"Run"** atau tekan `Ctrl+Enter`
4. Ulangi untuk file kedua: `e-raport/supabase/migrations/002_class_management.sql`

✅ Pastikan tidak ada error merah di SQL Editor

---

### 2️⃣ Siapkan Akun Demo (5 menit)

**Dashboard → Authentication → Users → Create new user** (Ulangi 6 kali):

| Email | Password | Role | Keterangan |
|-------|----------|------|------------|
| admin@sekolah.id | Admin123! | admin | Admin sekolah |
| guru1@sekolah.id | Guru123! | teacher | Budi Santoso |
| guru2@sekolah.id | Guru123! | teacher | Siti Nurhayati |
| guru3@sekolah.id | Guru123! | teacher | Agus Prasetyo |
| wali1@sekolah.id | Wali123! | homeroom_teacher | Dewi Lestari |
| wali2@sekolah.id | Wali123! | homeroom_teacher | Rizky Setiawan |

**Setelah membuat user, salin UUID masing-masing:**
- Klik user → Detail → Copy UUID
- Update seed SQL (lihat bagian Seed Data di README.md)

---

### 3️⃣ Setup Environment Variables (.env.local)

Buat file `.env.local` di root folder `e-raport/`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc9...,  # Copy dari Project Settings → API Keys
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc9...,  # Copy dari Project Settings → API Keys
```

⚠️ **JANGAN commit `.env.local` ke Git!** (sudah ada di .gitignore)

---

### 4️⃣ Install & Run Development (2 menit)

```bash
cd e-raport
npm install
npm run dev
```

Buka browser: **http://localhost:3000**

Login dengan email/password yang sudah dibuat.

---

### 5️⃣ Deploy ke Vercel (3 menit)

**Vercel Dashboard:**

1. **Import Repository** → Pilih repo/folder E-Raport
2. **Framework Preset**: Next.js (otomatis terdetect)
3. **Root Directory**: `e-raport`
4. **Build Command**: `npm run build`
5. **Output Directory**: `.next`
6. **Environment Variables**: Copy nilai dari `.env.local` ke Vercel Settings → Environment Variables

Klik **"Deploy"**

✅ Done! Aplikasi live di domain seperti `https://e-raport.vercel.app`

---

## 📋 Fitur yang Tersedia

### ✅ Admin Module (`/admin/*`)
- [x] Tahun Pelajaran & Semester (`/admin/academic-years`)
- [x] Kelas & Wali Kelas (`/admin/classes`)
- [x] Siswa (`/admin/students`)
- [x] Mata Pelajaran (`/admin/subjects`)
- [x] Guru (`/admin/teachers`)
- [x] Penugasan (`/admin/assignments`)

### ✅ Teacher Module (`/teacher/*`)
- [x] Dashboard (`/teacher/dashboard`)
- [x] Input Nilai (`/teacher/grades`) ⭐ FITUR UTAMA
- [x] Kelas Ajar (`/teacher/classes`)
- [x] Profil (`/teacher/profile`)

### ✅ Homeroom Module (`/homeroom/*`)
- [x] Dashboard (`/homeroom/dashboard`)
- [x] Monitoring Siswa (`/homeroom/students`)
- [x] View Nilai (`/homeroom/grades`)
- [x] Ranking (`/homeroom/ranking`)
- [x] Leger (`/homeroom/leger`)
- [x] Rapor (`/homeroom/reports`)
- [x] Profil (`/homeroom/profile`)

### 🔧 Workflow Nilai Lengkap
```
Input → Draft → Submit → Verified → Locked
```
- Real-time calculation dengan bobot
- Batch save multiple grades
- Validation kelengkapan semua siswa
- Competition ranking algorithm
- PDF raport generation ready
- Excel import/export ready

---

## 🎯 Cara Penggunaan Cepat

### Untuk Admin:
1. Login sebagai admin@sekolah.id
2. Setup **Tahun Pelajaran** dulu
3. Aktifkan **Semester Ganjil/Genap**
4. Tambah **Kelas** dan tunjuk **Wali Kelas**
5. Tambah **Siswa** dan tempatkan ke kelas
6. Tambah **Mata Pelajaran**
7. Tambah **Guru** dan berikan **Penugasan Mengajar**
8. Setting **Jenis Penilaian** (bobot Tugas/PTS/PAS)

### Untuk Guru Mapel:
1. Login sebagai guru@sekolah.id
2. Masuk `/teacher/grades`
3. Pilih penugasan mengajar
4. Input nilai setiap siswa per komponen
5. Save Draft → Submit setelah lengkap

### Untuk Wali Kelas:
1. Login sebagai wali@sekolah.id
2. Lihat semua siswa di kelasnya
3. View nilai dan hitung rata-rata
4. Generate rapor PDF

---

## ⚠️ Important Notes

### Security Features Active:
- ✅ Role-based access control (RLS di database)
- ✅ Protected routes with middleware
- ✅ Teacher cannot edit other teachers' grades
- ✅ Homeroom cannot edit subject grades
- ✅ Profile role/active status protected from self-edit
- ✅ Delete cascade protection for academic data

### Known Limitations:
- No automatic audit log triggers yet (manual logging)
- No real-time updates via Supabase Realtime
- No email notifications system
- PDF rapor uses placeholder signatures (update logo URL first)

### Performance Optimizations:
- Server-side pagination (20 rows/page)
- Lazy loading components
- Optimized SQL queries with indexes
- Static generation for non-dynamic pages

---

## 🆘 Troubleshooting

### Error: "Database connection failed"
- Verify SUPABASE_URL and keys in `.env.local`
- Check project is active in Supabase dashboard

### Error: "Unauthorized" after login
- Ensure profile exists in database for your auth.user
- Run manual profile creation SQL if needed:
```sql
insert into public.profiles (id, full_name, role, is_active)
values ('YOUR_AUTH_USER_UUID', 'Nama', 'admin', true);
```

### Error: "Migration failed"
- Ensure pgcrypto extension available (automatic in Supabase)
- Run migrations sequentially, not simultaneously

### Not seeing student grades
- Check assignment is linked to correct class/subject
- Verify semester is active
- Confirm teacher has grade entry permissions

---

## 📞 Support Resources

- **Documentation**: See each module's inline comments
- **Schema Reference**: `docs/erd.md` for database structure
- **API Endpoints**: All handled via RLS policies, no direct API needed
- **Type Definitions**: See `types/database.ts` for complete schema

---

## 🎉 Selamat!

Anda sekarang memiliki sistem E-Rapor sekolah yang production-ready dengan:
- 3 user roles properly secured
- Complete grade workflow with validation
- Responsive UI for all devices
- Full TypeScript type safety
- Comprehensive test coverage
- Clean, maintainable codebase

**Ready to educate!** 🏫📚

*Last Updated: September 2026*
