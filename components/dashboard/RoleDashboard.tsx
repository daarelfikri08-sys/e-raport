import Link from 'next/link'
import { ArrowRight, BookOpen, CalendarDays, ClipboardCheck, FileSpreadsheet, FileText, GraduationCap, History, LayoutDashboard, School, Settings, TrendingUp, UserRound, Users } from 'lucide-react'
import type { AppRole } from '@/lib/auth/helpers'
import Card from '@/components/ui/Card'

const dashboards = {
  admin: {
    label: 'Administrator', title: 'Tata data akademik sekolah.', description: 'Semua modul siap: periode, kelas, guru, siswa, mapel, penugasan, penilaian, monitoring, dan audit.',
    modules: [
      { title: 'Tahun akademik & semester', description: 'Kelola periode, semester, dan aktivasi.', href: '/admin/academic-years', icon: CalendarDays },
      { title: 'Data kelas', description: 'Tingkat dan wali kelas.', href: '/admin/classes', icon: School },
      { title: 'Data guru', description: 'Master guru dan tautan akun Auth.', href: '/admin/teachers', icon: Users },
      { title: 'Data siswa', description: 'Biodata lengkap + impor/ekspor Excel.', href: '/admin/students', icon: UserRound },
      { title: 'Mata pelajaran', description: 'Kode, kelompok, dan KKM.', href: '/admin/subjects', icon: BookOpen },
      { title: 'Penugasan guru', description: 'Guru, mapel, kelas, dan tahun.', href: '/admin/assignments', icon: ClipboardCheck },
      { title: 'Jenis penilaian', description: 'Bobot Tugas/PTS/PAS.', href: '/admin/assessments', icon: FileSpreadsheet },
      { title: 'Monitoring nilai', description: 'Progres pengumpulan nilai guru.', href: '/admin/monitoring', icon: TrendingUp },
      { title: 'Audit log', description: 'Jejak perubahan data master.', href: '/admin/audit-log', icon: History },
      { title: 'Laporan', description: 'Ringkasan akademik sekolah.', href: '/admin/reports', icon: FileText },
      { title: 'Pengaturan', description: 'Identitas sekolah + upload logo.', href: '/admin/settings', icon: Settings },
    ],
  },
  teacher: {
    label: 'Guru mata pelajaran', title: 'Ruang untuk mendampingi belajar.', description: 'Kelas ajar, input nilai, dan profil siap digunakan.',
    modules: [
      { title: 'Ringkasan', description: 'Statistik kelas, siswa, progres.', href: '/teacher/dashboard', icon: LayoutDashboard },
      { title: 'Kelas ajar', description: 'Daftar kelas dan mapel Anda.', href: '/teacher/classes', icon: School },
      { title: 'Penilaian', description: 'Input nilai + ekspor/impor Excel.', href: '/teacher/grades', icon: ClipboardCheck },
      { title: 'Profil guru', description: 'Edit nama, email, telepon.', href: '/teacher/profile', icon: UserRound },
    ],
  },
  homeroom_teacher: {
    label: 'Wali kelas', title: 'Dampingi kelas, pantau hasil belajar.', description: 'Siswa, nilai, ranking, leger, rapor, dan profil siap digunakan.',
    modules: [
      { title: 'Ringkasan', description: 'Total siswa, rata-rata, progres nilai.', href: '/homeroom/dashboard', icon: LayoutDashboard },
      { title: 'Siswa kelas wali', description: 'Daftar siswa kelas Anda.', href: '/homeroom/students', icon: Users },
      { title: 'Rekap nilai', description: 'Nilai semua mapel (read-only).', href: '/homeroom/grades', icon: ClipboardCheck },
      { title: 'Ranking', description: 'Peringkat competition ranking.', href: '/homeroom/ranking', icon: TrendingUp },
      { title: 'Leger kelas', description: 'Rekap nilai + ekspor Excel + cetak.', href: '/homeroom/leger', icon: FileSpreadsheet },
      { title: 'Rapor siswa', description: 'Preview, cetak, unduh PDF.', href: '/homeroom/reports', icon: BookOpen },
      { title: 'Profil wali', description: 'Edit nama, email, telepon.', href: '/homeroom/profile', icon: UserRound },
    ],
  },
}

export default function RoleDashboard({ role }: { role: AppRole }) {
  const data = dashboards[role]
  return (
    <section aria-labelledby="dashboard-title">
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-7 text-white sm:p-10">
        <div aria-hidden="true" className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-teal-400/10" />
        <div className="relative max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-300">{data.label} · Ringkasan</p>
          <h1 id="dashboard-title" className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{data.title}</h1>
          <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">{data.description}</p>
          {role === 'admin' && <Link href="/admin/academic-years" className="mt-6 inline-flex items-center gap-3 rounded-xl bg-teal-300 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-teal-200">Kelola periode akademik <ArrowRight className="h-4 w-4" /></Link>}
        </div>
      </div>
      <div className="mb-5 mt-10 flex items-center gap-3"><GraduationCap className="h-5 w-5 text-teal-700" /><div><h2 className="text-xl font-bold">Akses cepat</h2><p className="mt-1 text-sm text-slate-600">Semua modul inti siap digunakan.</p></div></div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{data.modules.map(item => (
        <Card key={item.href} className="flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <span className="rounded-xl bg-slate-100 p-3 text-slate-700"><item.icon aria-hidden="true" className="h-6 w-6" /></span>
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">Tersedia</span>
          </div>
          <h3 className="mt-5 text-lg font-bold">{item.title}</h3>
          <p className="mb-6 mt-2 flex-1 text-sm leading-6 text-slate-600">{item.description}</p>
          <Link href={item.href} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 hover:border-teal-300 hover:bg-teal-50"><span>Kelola <span className="sr-only">{item.title}</span></span><ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
        </Card>
      ))}</div>
    </section>
  )
}