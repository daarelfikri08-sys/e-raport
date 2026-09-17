import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, BookOpenCheck, CalendarDays, GraduationCap, LockKeyhole, School, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { destinationForRole, isAppRole } from '@/lib/auth/helpers'
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  let destination: string | null = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role,is_active')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.is_active === true && isAppRole(profile.role)) {
        destination = destinationForRole(profile.role)
      }
    }
  } catch {
    // Halaman publik tetap dapat ditampilkan sebelum environment dikonfigurasi.
  }
  if (destination) redirect(destination)

  return (
    <main id="main-content" className="min-h-screen">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-6" aria-label="Navigasi utama">
        <Link href="/" className="flex items-center gap-3 font-semibold">
          <span className="rounded-xl bg-slate-950 p-2.5 text-teal-300"><GraduationCap className="h-6 w-6" /></span>
          <span className="text-xl font-bold tracking-tight">E-Rapor<span className="block text-xs font-normal tracking-normal text-slate-600">Sistem akademik sekolah</span></span>
        </Link>
        <Link href="/login" className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">Masuk <span className="hidden sm:inline">ke akun</span></Link>
      </nav>
      <section className="relative mx-4 overflow-hidden rounded-[2rem] bg-slate-950 text-white sm:mx-6"><div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" /><div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-14 sm:px-10 lg:grid-cols-[1.2fr_.8fr] lg:gap-16 lg:py-24">
        <div>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-300/25 bg-teal-300/10 px-4 py-2 text-xs font-semibold tracking-wide text-teal-200"><BookOpenCheck className="h-4 w-4" /> RUANG KERJA AKADEMIK</p>
          <h1 className="max-w-3xl text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">Administrasi lebih rapi.<br /><span className="text-teal-300">Fokus pada belajar.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">Kelola fondasi data sekolah dalam satu tempat. E-Rapor menghadirkan ruang kerja yang jelas bagi administrator, guru mata pelajaran, dan wali kelas.</p>
          <div className="mt-8 flex flex-wrap items-center gap-5"><Link href="/login" className="inline-flex items-center gap-3 rounded-xl bg-teal-300 px-6 py-3.5 font-semibold text-slate-950 hover:bg-teal-200">Masuk ke E-Rapor <ArrowRight className="h-5 w-5" /></Link><a href="#akses" className="rounded-lg py-3 text-sm font-medium text-slate-200 underline decoration-slate-600 underline-offset-4 hover:text-white">Kenali ruang kerja Anda</a></div>
          <p className="mt-6 flex items-center gap-2 text-xs text-slate-400"><LockKeyhole className="h-4 w-4" /> Gunakan akun yang diberikan oleh sekolah.</p>
        </div>
        <aside className="self-center rounded-3xl border border-white/15 bg-white/[.06] p-6 shadow-2xl sm:p-8">
          <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-widest text-teal-200">Mulai dari fondasi</p><School className="h-6 w-6 text-teal-300" /></div><h2 className="mt-5 text-2xl font-bold">Alur kerja yang terarah</h2><p className="mt-2 text-sm leading-6 text-slate-300">Siapkan data akademik sebelum melangkah ke pelaporan hasil belajar.</p>
          <ol className="mt-6 space-y-3">{[['01', 'Atur periode akademik', 'Tahun pelajaran dan semester', true], ['02', 'Susun data kelas', 'Tingkat dan penetapan wali kelas', true], ['03', 'Penilaian & rapor', 'Input nilai, ranking, leger, dan rapor PDF', true]].map(([step, title, text, ready]) => <li key={String(step)} className="flex gap-4 rounded-2xl border border-white/10 bg-slate-950/30 p-4"><span className="pt-1 text-sm font-semibold text-teal-300">{step}</span><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-slate-400">{text}</p><span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] ${ready ? 'bg-teal-300/10 text-teal-200' : 'bg-white/10 text-slate-300'}`}>{ready ? 'Tersedia' : 'Segera hadir'}</span></div></li>)}</ol>
        </aside>
      </div></section>
      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20" aria-labelledby="features-title"><p className="text-xs font-bold uppercase tracking-widest text-teal-800">Sederhana, sejak awal</p><h2 id="features-title" className="mt-3 text-3xl font-bold tracking-tight">Data terstruktur. Langkah lebih jelas.</h2><div className="mt-8 grid gap-5 md:grid-cols-3">{[{ icon: CalendarDays, title: 'Periode akademik tertata', text: 'Kelola tahun pelajaran, semester, dan periode aktif dari ruang administrator.' }, { icon: School, title: 'Kelas mudah dikelola', text: 'Cari, tambah, dan perbarui kelas beserta tingkat dan wali kelasnya.' }, { icon: LockKeyhole, title: 'Ruang sesuai peran', text: 'Akun yang aktif diarahkan ke ruang kerja sesuai kewenangan yang ditetapkan sekolah.' }].map(item => <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-7"><item.icon aria-hidden="true" className="h-7 w-7 text-teal-700" /><h3 className="mt-6 text-lg font-bold">{item.title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p></article>)}</div></section>
      <section id="akses" className="border-y border-slate-200 bg-white"><div className="mx-auto max-w-7xl px-6 py-16"><div className="flex items-center gap-3 text-teal-800"><Users className="h-5 w-5" /><p className="text-xs font-bold uppercase tracking-widest">Akses berdasarkan peran</p></div><h2 className="mt-3 text-3xl font-bold tracking-tight">Satu aplikasi, tanggung jawab yang jelas.</h2><div className="mt-8 grid gap-8 md:grid-cols-3">{[['Administrator', 'Kelola tahun akademik, semester, dan kelas. Modul administrasi lainnya akan menyusul.'], ['Guru mata pelajaran', 'Ruang untuk kelas ajar dan penilaian sesuai penugasan. Modul pengajaran belum tersedia.'], ['Wali kelas', 'Ruang untuk memantau siswa dan pelaporan kelas. Modul belum tersedia; wali kelas tidak mengubah nilai mata pelajaran.']].map(([title, text]) => <article key={title} className="border-l-2 border-teal-200 pl-5"><h3 className="text-lg font-bold">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{text}</p></article>)}</div><p className="mt-10 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">Tidak perlu memilih peran saat masuk. Jika belum memiliki akun atau mengalami kendala akses, hubungi administrator sekolah.</p></div></section>
      <footer className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 px-6 py-7 text-xs text-slate-600"><span className="font-semibold">E-Rapor · Sistem akademik sekolah</span><span>Dirancang untuk administrasi pendidikan yang lebih tertib.</span></footer>
    </main>
  )
}
