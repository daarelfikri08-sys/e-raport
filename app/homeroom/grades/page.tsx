import { requireRole } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import Card from '@/components/ui/Card'
import { getHomeroomContext, getClassSummaries } from '@/services/homeroom.service'

export default async function HomeroomGradesPage() {
  await requireRole('homeroom_teacher')
  const supabase = await createClient()
  const admin = createAdminClient()

  const context = await getHomeroomContext(admin, supabase)
  if (context.error || !context.homeroomClass) {
    return <div className="space-y-6"><header><h1 className="text-3xl font-bold text-slate-900">Rekap Nilai</h1><p className="mt-2 text-slate-600">{context.error ?? 'Kelas wali belum ditetapkan.'}</p></header></div>
  }

  const summariesResult = await getClassSummaries(admin, supabase, context)
  const summaries = summariesResult.ok ? summariesResult.data.rows : []
  const homeroomClass = context.homeroomClass

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-primary-700">Wali kelas</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Rekap Nilai Kelas {homeroomClass.className}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          {`Tahun Ajaran ${homeroomClass.academicYearName} • Semester ${homeroomClass.semesterName === 'ganjil' ? 'Ganjil' : 'Genap'}`} — tampilan hanya-baca seluruh nilai mapel siswa kelas wali.
        </p>
      </header>

      {context.subjects.length === 0 ? (
        <Card padding="lg" className="text-center">
          <h2 className="text-lg font-semibold text-slate-900">Belum ada mata pelajaran</h2>
          <p className="mt-2 text-sm text-slate-600">Belum ada penugasan mengajar untuk kelas ini pada tahun pelajaran aktif.</p>
        </Card>
      ) : summaries.length === 0 ? (
        <Card padding="lg" className="text-center">
          <h2 className="text-lg font-semibold text-slate-900">Belum ada siswa</h2>
          <p className="mt-2 text-sm text-slate-600">Belum ada siswa terdaftar di kelas ini untuk tahun pelajaran aktif.</p>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50"><tr>
                <th scope="col" rowSpan={2} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">No</th>
                <th scope="col" rowSpan={2} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nama</th>
                <th scope="col" rowSpan={2} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">NIS</th>
                {context.subjects.map(s => <th key={s.subjectId} scope="col" className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">{s.name}</th>)}
                <th scope="col" rowSpan={2} className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Jumlah</th>
                <th scope="col" rowSpan={2} className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Rata-rata</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {summaries.map((row, index) => (
                  <tr key={row.studentId}>
                    <td className="px-3 py-2 text-sm text-slate-700">{index + 1}</td>
                    <td className="px-3 py-2 text-sm font-medium text-slate-900">{row.fullName}</td>
                    <td className="px-3 py-2 text-sm text-slate-600">{row.nis ?? '—'}</td>
                    {context.subjects.map(subject => (
                      <td key={subject.subjectId} className="px-3 py-2 text-center text-sm tabular-nums text-slate-700">
                        {row.subjectScores?.[subject.subjectId] !== null && row.subjectScores?.[subject.subjectId] !== undefined ? Number(row.subjectScores[subject.subjectId]).toFixed(2) : '—'}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right text-sm tabular-nums text-slate-700">{row.total.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums text-slate-900">{row.average.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}