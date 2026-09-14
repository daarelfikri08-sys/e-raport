import { requireRole } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { getHomeroomContext, getClassSummaries } from '@/services/homeroom.service'
import HomeroomLegerClient from '@/components/homeroom/HomeroomLegerClient'

export default async function HomeroomLegerPage() {
  await requireRole('homeroom_teacher')
  const supabase = await createClient()
  const admin = createAdminClient()

  const context = await getHomeroomContext(admin, supabase)
  if (context.error || !context.homeroomClass) {
    return <div className="space-y-6"><header><h1 className="text-3xl font-bold text-slate-900">Leger Nilai</h1><p className="mt-2 text-slate-600">{context.error ?? 'Kelas wali belum ditetapkan.'}</p></header></div>
  }

  const homeroomClass = context.homeroomClass
  const summariesResult = await getClassSummaries(admin, supabase, context)
  const rows = summariesResult.ok ? summariesResult.data.rows : []

  const legerRows = rows.map(row => ({
    studentId: row.studentId,
    nis: row.nis,
    fullName: row.fullName,
    subjectScores: row.subjectScores,
    total: row.total,
    average: row.average,
    ranking: row.ranking,
    complete: row.complete,
  }))

  return (
    <div className="space-y-6">
      <header className="print:hidden">
        <p className="text-sm font-semibold text-primary-700">Wali kelas</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Leger Nilai Kelas {homeroomClass.className}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          {`Tahun Ajaran ${homeroomClass.academicYearName} • Semester ${homeroomClass.semesterName === 'ganjil' ? 'Ganjil' : 'Genap'}`} — rekapitulasi nilai seluruh siswa.
        </p>
      </header>

      <HomeroomLegerClient
        rows={legerRows}
        subjects={context.subjects}
        className={homeroomClass.className}
        academicYearName={homeroomClass.academicYearName}
        semesterName={homeroomClass.semesterName}
        rankingEnabled={context.rankingEnabled}
      />
    </div>
  )
}