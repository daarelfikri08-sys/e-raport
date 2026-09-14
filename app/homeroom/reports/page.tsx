import { requireRole } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import Card from '@/components/ui/Card'
import { buildReportBundle } from '@/services/report-data.service'
import HomeroomReportsManager from '@/components/reports/HomeroomReportsManager'

export const metadata = { title: 'Rapor - Wali Kelas', description: 'Laporan hasil belajar siswa kelas wali.' }

export default async function HomeroomReportsPage() {
  await requireRole('homeroom_teacher')
  const supabase = await createClient()
  const admin = createAdminClient()

  const result = await buildReportBundle(admin, supabase)

  if (!result.ok) {
    return <div className="space-y-6"><header><h1 className="text-3xl font-bold text-slate-900">Rapor Siswa</h1><p className="mt-2 text-slate-600">{result.message}</p></header></div>
  }

  const bundle = result.data
  const homeroomClass = bundle.context.homeroomClass

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-primary-700">Wali kelas</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Rapor Siswa Kelas {homeroomClass?.className}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          {homeroomClass ? `Tahun Ajaran ${homeroomClass.academicYearName} • Semester ${homeroomClass.semesterName === 'ganjil' ? 'Ganjil' : 'Genap'}` : ''} — preview, cetak satu siswa, cetak seluruh kelas, dan unduh PDF.
        </p>
      </header>

      {bundle.students.length === 0 ? (
        <Card padding="lg" className="text-center">
          <h2 className="text-lg font-semibold text-slate-900">Belum ada data rapor</h2>
          <p className="mt-2 text-sm text-slate-600">Belum ada siswa di kelas wali Anda untuk periode ini.</p>
        </Card>
      ) : (
        <HomeroomReportsManager bundle={bundle} students={bundle.students} />
      )}
    </div>
  )
}