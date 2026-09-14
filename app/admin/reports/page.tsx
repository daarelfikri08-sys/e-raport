import { requireRole } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Users, UserRound, School, BookOpen, ClipboardCheck, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function countRows(admin: SupabaseClient, table: 'teachers' | 'students' | 'classes' | 'subjects', activeOnly = false): Promise<number> {
  try {
    if (activeOnly) {
      const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true }).eq('is_active', true)
      if (error) return 0
      return count ?? 0
    }
    const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true })
    if (error) return 0
    return count ?? 0
  } catch { return 0 }
}

export default async function AdminReportsPage() {
  await requireRole('admin')
  const admin = createAdminClient()

  const [teachers, students, classes, subjects] = await Promise.all([
    countRows(admin, 'teachers', true),
    countRows(admin, 'students', true),
    countRows(admin, 'classes'),
    countRows(admin, 'subjects', true),
  ])

  let periodLabel = 'Tahun pelajaran aktif belum ditetapkan'
  const client = await createClient()
  const { data: year } = await client.from('academic_years').select('id,name').eq('is_active', true).maybeSingle()
  const { data: semester } = await client.from('semesters').select('id,name').eq('is_active', true).maybeSingle()
  if (year && typeof year.name === 'string') {
    if (semester && typeof semester.name === 'string') {
      periodLabel = `Tahun ${year.name} • Semester ${semester.name === 'genap' ? 'Genap' : 'Ganjil'}`
    } else {
      periodLabel = `Tahun ${year.name} • semester belum ditetapkan`
    }
  }

  const links = [
    { href: '/admin/teachers', label: 'Laporan data guru', desc: 'Data master tenaga pendidik', tone: 'blue' as const },
    { href: '/admin/students', label: 'Laporan data siswa', desc: 'Data master peserta didik', tone: 'green' as const },
    { href: '/admin/classes', label: 'Laporan kelas', desc: 'Daftar kelas dan wali kelas', tone: 'purple' as const },
    { href: '/admin/subjects', label: 'Laporan mata pelajaran', desc: 'Data master mapel', tone: 'orange' as const },
    { href: '/admin/assignments', label: 'Laporan penugasan', desc: 'Guru mengajar per kelas dan tahun', tone: 'teal' as const },
    { href: '/admin/monitoring', label: 'Monitoring nilai', desc: 'Progres pengisian nilai per penugasan', tone: 'cyan' as const },
    { href: '/admin/assessments', label: 'Jenis penilaian & bobot', desc: 'Komponen penilaian aktif', tone: 'rose' as const },
    { href: '/admin/audit-log', label: 'Audit log', desc: 'Riwayat perubahan data master', tone: 'slate' as const },
  ]

  const tones: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-700' },
    green: { bg: 'bg-green-100', text: 'text-green-700' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-700' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-700' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-700' },
    cyan: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
    rose: { bg: 'bg-rose-100', text: 'text-rose-700' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-700' },
  }

  const ToneIcon = ({ tone }: { tone: keyof typeof tones }) => {
    const conf = tones[tone]
    const Icon = tone === 'blue' ? Users : tone === 'green' ? UserRound : tone === 'purple' ? School : tone === 'orange' ? BookOpen : ClipboardCheck
    return <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${conf.bg}`}><Icon className={`h-5 w-5 ${conf.text}`} /></div>
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-primary-700">Laporan</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Ringkasan Laporan Akademik</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Pusat laporan sekolah. {periodLabel}.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card padding="md"><div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100"><Users className="h-6 w-6 text-blue-700" /></div><div><p className="text-sm font-medium text-slate-600">Guru Aktif</p><p className="mt-1 text-3xl font-bold text-slate-900">{teachers}</p></div></div></Card>
        <Card padding="md"><div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100"><UserRound className="h-6 w-6 text-green-700" /></div><div><p className="text-sm font-medium text-slate-600">Siswa Aktif</p><p className="mt-1 text-3xl font-bold text-slate-900">{students}</p></div></div></Card>
        <Card padding="md"><div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100"><School className="h-6 w-6 text-purple-700" /></div><div><p className="text-sm font-medium text-slate-600">Jumlah Kelas</p><p className="mt-1 text-3xl font-bold text-slate-900">{classes}</p></div></div></Card>
        <Card padding="md"><div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100"><BookOpen className="h-6 w-6 text-orange-700" /></div><div><p className="text-sm font-medium text-slate-600">Mapel Aktif</p><p className="mt-1 text-3xl font-bold text-slate-900">{subjects}</p></div></div></Card>
      </div>

      <section aria-labelledby="reports-heading">
        <h2 id="reports-heading" className="mb-4 text-lg font-bold text-slate-900">Laporan Tersedia</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {links.map(link => (
            <Card key={link.href} padding="md">
              <div className="flex items-start gap-3">
                <ToneIcon tone={link.tone} />
                <div><h3 className="font-semibold text-slate-900">{link.label}</h3><p className="text-sm text-slate-600">{link.desc}</p></div>
              </div>
              <div className="mt-4"><Button variant="outline" size="sm" href={link.href}>Buka laporan <ArrowRight className="ml-1 h-4 w-4" /></Button></div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}