import Link from 'next/link'
import { ArrowRight, BookOpen, CalendarDays, ClipboardCheck, Compass, School, ShieldCheck, Users } from 'lucide-react'
import type { AppRole } from '@/lib/auth/helpers'
import Card from '@/components/ui/Card'

const dashboards = {
  admin: { label: 'Administrator', title: 'Mari tata data akademik sekolah.', description: 'Mulai dari periode akademik dan struktur kelas. Data yang tertata menjadi fondasi proses pelaporan hasil belajar.', note: 'Tahun akademik, semester, dan kelas sudah dapat dikelola. Modul lain masih dalam persiapan.', modules: [
    { title: 'Tahun akademik & semester', description: 'Tambah periode, kelola semester, dan tentukan periode aktif.', href: '/admin/academic-years', icon: CalendarDays, ready: true },
    { title: 'Data kelas', description: 'Kelola nama kelas, tingkat, dan penetapan wali kelas.', href: '/admin/classes', icon: School, ready: true },
    { title: 'Data guru & penugasan', description: 'Pengelolaan data guru belum tersedia. Penugasan juga masih disiapkan.', href: '/admin/teachers', icon: Users, ready: false },
    { title: 'Monitoring akademik', description: 'Ringkasan progres penilaian belum tersedia.', href: '/admin/monitoring', icon: ClipboardCheck, ready: false },
  ] },
  teacher: { label: 'Guru mata pelajaran', title: 'Ruang untuk mendampingi belajar.', description: 'Temukan akses kelas ajar dan penilaian sesuai penugasan Anda. Ketersediaan setiap modul ditandai dengan jelas.', note: 'Data kelas ajar dan penilaian belum tersedia. Halaman ini tidak menampilkan jumlah kelas, tugas, atau progres yang belum terhubung.', modules: [
    { title: 'Kelas ajar', description: 'Daftar kelas dan mata pelajaran sesuai penugasan belum tersedia.', href: '/teacher/classes', icon: School, ready: false },
    { title: 'Penilaian', description: 'Input dan pengelolaan nilai mata pelajaran belum tersedia.', href: '/teacher/grades', icon: ClipboardCheck, ready: false },
    { title: 'Profil guru', description: 'Halaman pengelolaan profil masih disiapkan.', href: '/teacher/profile', icon: Users, ready: false },
  ] },
  homeroom_teacher: { label: 'Wali kelas', title: 'Dampingi kelas, pantau hasil belajar.', description: 'Ruang kerja untuk pemantauan siswa dan pelaporan kelas wali. Modul akan tersedia secara bertahap.', note: 'Wali kelas tidak mengubah nilai mata pelajaran. Nilai dikelola oleh guru mata pelajaran sesuai penugasan. Data siswa, rekap nilai, dan rapor belum tersedia.', modules: [
    { title: 'Siswa kelas wali', description: 'Daftar siswa kelas yang Anda dampingi belum tersedia.', href: '/homeroom/students', icon: Users, ready: false },
    { title: 'Rekap nilai', description: 'Pemantauan hasil penilaian mata pelajaran belum tersedia.', href: '/homeroom/grades', icon: ClipboardCheck, ready: false },
    { title: 'Leger kelas', description: 'Rekapitulasi nilai dalam leger belum tersedia.', href: '/homeroom/leger', icon: BookOpen, ready: false },
    { title: 'Rapor siswa', description: 'Penyiapan dan penerbitan rapor belum tersedia.', href: '/homeroom/reports', icon: BookOpen, ready: false },
  ] },
}

export default function RoleDashboard({ role }: { role: AppRole }) {
  const data = dashboards[role]
  return <section aria-labelledby="dashboard-title">
    <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-7 text-white sm:p-10"><div aria-hidden="true" className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-teal-400/10" /><div className="relative max-w-2xl"><p className="text-xs font-semibold uppercase tracking-widest text-teal-300">{data.label} · Ringkasan</p><h1 id="dashboard-title" className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{data.title}</h1><p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">{data.description}</p>{role === 'admin' && <Link href="/admin/academic-years" className="mt-6 inline-flex items-center gap-3 rounded-xl bg-teal-300 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-teal-200">Kelola periode akademik <ArrowRight className="h-4 w-4" /></Link>}</div></div>
    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-5"><ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-teal-800" /><div><h2 className="text-sm font-bold text-teal-950">{role === 'admin' ? 'Modul yang bisa digunakan sekarang' : 'Status dan kewenangan Anda'}</h2><p className="mt-1 text-sm leading-6 text-teal-900">{data.note}</p></div></div>
    <div className="mb-5 mt-10 flex items-center gap-3"><Compass className="h-5 w-5 text-teal-700" /><div><h2 className="text-xl font-bold">Akses cepat</h2><p className="mt-1 text-sm text-slate-600">Pilih modul untuk melanjutkan pekerjaan Anda.</p></div></div>
    <div className="grid gap-5 md:grid-cols-2">{data.modules.map(item => <Card key={item.href} className="flex flex-col"><div className="flex items-start justify-between gap-3"><span className="rounded-xl bg-slate-100 p-3 text-slate-700"><item.icon aria-hidden="true" className="h-6 w-6" /></span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.ready ? 'bg-teal-50 text-teal-800' : 'bg-amber-50 text-amber-900'}`}>{item.ready ? 'Tersedia' : 'Segera hadir'}</span></div><h3 className="mt-5 text-lg font-bold">{item.title}</h3><p className="mb-6 mt-2 flex-1 text-sm leading-6 text-slate-600">{item.description}</p><Link href={item.href} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 hover:border-teal-300 hover:bg-teal-50"><span>{item.ready ? 'Kelola' : 'Lihat status'} <span className="sr-only">{item.title}</span></span><ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></Card>)}</div>
    <p className="mt-7 text-sm leading-6 text-slate-600">Butuh bantuan akses atau penugasan? {role === 'admin' ? 'Koordinasikan dengan pengelola sistem sekolah.' : 'Hubungi administrator sekolah.'}</p>
  </section>
}
