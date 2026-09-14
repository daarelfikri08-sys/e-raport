import { requireRole } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import Card from '@/components/ui/Card'
import { getHomeroomContext, getClassSummaries } from '@/services/homeroom.service'

export default async function HomeroomRankingPage() {
  await requireRole('homeroom_teacher')
  const supabase = await createClient()
  const admin = createAdminClient()

  const context = await getHomeroomContext(admin, supabase)
  if (context.error || !context.homeroomClass) {
    return <div className="space-y-6"><header><h1 className="text-3xl font-bold text-slate-900">Ranking Siswa</h1><p className="mt-2 text-slate-600">{context.error ?? 'Kelas wali belum ditetapkan.'}</p></header></div>
  }

  const homeroomClass = context.homeroomClass
  const summariesResult = await getClassSummaries(admin, supabase, context)
  const summaries = summariesResult.ok ? summariesResult.data.rows : []

  // Ranking only among complete students, competition ranking already applied in service.
  // Sort by ranking ascending for display.
  const sorted = [...summaries].sort((a, b) => (a.complete ? a.ranking : Infinity) - (b.complete ? b.ranking : Infinity) || a.fullName.localeCompare(b.fullName, 'id'))

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-primary-700">Wali kelas</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Peringkat Siswa Kelas {homeroomClass.className}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          {`Tahun Ajaran ${homeroomClass.academicYearName} • Semester ${homeroomClass.semesterName === 'ganjil' ? 'Ganjil' : 'Genap'}`} — peringkat dihitung berdasarkan rata-rata nilai akhir, hanya dalam kelas dan semester yang sama.
        </p>
      </header>

      {!context.rankingEnabled ? (
        <Card padding="lg" className="text-center">
          <h2 className="text-lg font-semibold text-slate-900">Ranking Dinonaktifkan</h2>
          <p className="mt-2 text-sm text-slate-600">Sekolah telah menonaktifkan fitur ranking. Peringkat tidak ditampilkan pada halaman ini maupun rapor.</p>
        </Card>
      ) : summaries.length === 0 ? (
        <Card padding="lg" className="text-center">
          <h2 className="text-lg font-semibold text-slate-900">Belum Ada Nilai</h2>
          <p className="mt-2 text-sm text-slate-600">Peringkat akan muncul setelah nilai seluruh siswa terisi.</p>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50"><tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ranking</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nama</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">NIS</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Jumlah</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Rata-rata</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sorted.map(row => (
                  <tr key={row.studentId}>
                    <td className="px-4 py-2.5 text-sm">{row.complete
                      ? <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${row.ranking === 1 ? 'bg-amber-100 text-amber-800' : row.ranking === 2 ? 'bg-slate-200 text-slate-700' : row.ranking === 3 ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-600'}`}>{row.ranking}</span>
                      : <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-2.5 text-sm font-medium text-slate-900">{row.fullName}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-600">{row.nis ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right text-sm tabular-nums text-slate-700">{row.total.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right text-sm font-semibold tabular-nums text-slate-900">{row.average.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-3 text-xs text-slate-500">Siswa dengan nilai belum lengkap ditampilkan tanpa ranking (—). Peringkat menggunakan metode competition ranking.</p>
        </Card>
      )}
    </div>
  )
}