import { requireRole } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { ArrowRight, BookOpen, ClipboardCheck, TrendingUp, Users, Award } from 'lucide-react'
import { getHomeroomContext, getClassSummaries } from '@/services/homeroom.service'

export default async function HomeroomDashboardPage() {
  const profile = await requireRole('homeroom_teacher')
  const supabase = await createClient()
  const admin = createAdminClient()

  const context = await getHomeroomContext(admin, supabase)

  if (context.error) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard Wali Kelas</h1>
          <p className="mt-2 text-slate-600">{context.error}</p>
        </header>
        <Card padding="lg">
          <p className="text-sm leading-6 text-slate-600">Hubungi administrator sekolah jika menurut Anda seharusnya kelas wali sudah terdata.</p>
          <div className="mt-4"><Button variant="outline" href="/homeroom/students">Lihat Siswa</Button></div>
        </Card>
      </div>
    )
  }

  const homeroomClass = context.homeroomClass
  if (!homeroomClass) {
    return (
      <div className="space-y-6">
        <header><h1 className="text-3xl font-bold text-slate-900">Dashboard Wali Kelas</h1></header>
        <Card padding="lg" className="text-center">
          <p className="text-lg font-semibold text-slate-900">Belum ada kelas wali</p>
          <p className="mt-2 text-sm text-slate-600">Anda belum ditetapkan sebagai wali kelas. Hubungi administrator sekolah.</p>
        </Card>
      </div>
    )
  }

  const summariesResult = await getClassSummaries(admin, supabase, context)
  const summaries = summariesResult.ok ? summariesResult.data.rows : []

  const totalStudents = context.students.length

  // Class average across all complete students (or all with any score)
  const averages = summaries.filter(s => s.complete).map(s => s.average)
  const classAverage = averages.length > 0 ? averages.reduce((a, b) => a + b, 0) / averages.length : 0

  const highest = Math.max(...summaries.map(s => s.average).filter(Number.isFinite), 0)
  const lowestFiltered = summaries.map(s => s.average).filter(Number.isFinite)
  const lowest = lowestFiltered.length > 0 ? Math.min(...lowestFiltered) : 0

  // Progress: total expected grade cells = students × subjects × assessments; filled where any final score
  let progressFilled = 0
  let progressTotal = 0
  for (const row of summaries) {
    for (const subject of context.subjects) {
      progressTotal += 1
      if (row.subjectScores[subject.subjectId] !== null && row.subjectScores[subject.subjectId] !== undefined) progressFilled += 1
    }
  }
  const progressPercent = progressTotal > 0 ? Math.round((progressFilled / progressTotal) * 100) : 0

  const periodLabel = `Tahun Ajaran ${homeroomClass.academicYearName} • Semester ${homeroomClass.semesterName === 'ganjil' ? 'Ganjil' : 'Genap'}`

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Selamat datang, {profile.full_name ?? 'Wali Kelas'}</h1>
        <p className="mt-1 text-sm text-slate-600">Kelas {homeroomClass.className} • {periodLabel}</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Pantau nilai, kehadiran, dan perkembangan siswa dalam kelas wali Anda.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card padding="md">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100"><Users className="h-6 w-6 text-blue-700" /></div>
            <div><p className="text-sm font-medium text-slate-600">Total Siswa</p><p className="mt-1 text-3xl font-bold text-slate-900">{totalStudents}</p><p className="mt-1 text-xs text-slate-500">siswa di kelas {homeroomClass.className}</p></div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100"><BookOpen className="h-6 w-6 text-green-700" /></div>
            <div><p className="text-sm font-medium text-slate-600">Rata-rata Kelas</p><p className="mt-1 text-3xl font-bold text-slate-900">{classAverage > 0 ? classAverage.toFixed(2) : '—'}</p><p className="mt-1 text-xs text-slate-500">rata-rata nilai akhir</p></div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100"><ClipboardCheck className="h-6 w-6 text-purple-700" /></div>
            <div><p className="text-sm font-medium text-slate-600">Progress Nilai</p><p className="mt-1 text-3xl font-bold text-slate-900">{progressTotal > 0 ? `${progressPercent}%` : '—'}</p><p className="mt-1 text-xs text-slate-500">{progressFilled} dari {progressTotal} nilai mapel terisi</p></div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100"><TrendingUp className="h-6 w-6 text-orange-700" /></div>
            <div><p className="text-sm font-medium text-slate-600">Nilai Tertinggi</p><p className="mt-1 text-3xl font-bold text-slate-900">{lowestFiltered.length > 0 ? highest.toFixed(2) : '—'}</p><p className="mt-1 text-xs text-slate-500">terendah {lowestFiltered.length > 0 ? lowest.toFixed(2) : '—'}</p></div>
          </div>
        </Card>
      </div>

      <section aria-labelledby="class-heading">
        <h2 id="class-heading" className="mb-4 text-lg font-bold text-slate-900">Ringkasan Nilai Kelas</h2>
        {summaries.length === 0 ? (
          <Card padding="lg" className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100"><Award className="h-7 w-7 text-slate-500" /></div>
            <h3 className="mt-4 text-lg font-bold">Belum Ada Nilai</h3>
            <p className="mt-2 text-sm text-slate-600">Nilai siswa akan muncul setelah guru mata pelajaran mengisi nilai untuk semester ini.</p>
          </Card>
        ) : (
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50"><tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">No</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nama</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">NIS</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Jumlah</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Rata-rata</th>
                  {context.rankingEnabled && <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Ranking</th>}
                </tr></thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {summaries.map((row, index) => (
                    <tr key={row.studentId}>
                      <td className="px-4 py-2.5 text-sm text-slate-700">{index + 1}</td>
                      <td className="px-4 py-2.5 text-sm font-medium text-slate-900">{row.fullName}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">{row.nis ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right text-sm tabular-nums text-slate-700">{row.total.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right text-sm font-semibold tabular-nums text-slate-900">{row.average.toFixed(2)}</td>
                      {context.rankingEnabled && <td className="px-4 py-2.5 text-right text-sm tabular-nums text-slate-700">{row.complete ? row.ranking : '—'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" href="/homeroom/grades">Detail Nilai <ArrowRight className="ml-1 h-4 w-4" /></Button>
          <Button variant="outline" size="sm" href="/homeroom/leger">Leger</Button>
          <Button variant="outline" size="sm" href="/homeroom/ranking">Ranking</Button>
        </div>
      </section>
    </div>
  )
}