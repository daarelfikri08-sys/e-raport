import { requireRole } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import HomeroomStudentsClient from '@/components/homeroom/HomeroomStudentsClient'
import { getHomeroomContext } from '@/services/homeroom.service'

export default async function HomeroomStudentsPage() {
  await requireRole('homeroom_teacher')
  const supabase = await createClient()
  const admin = createAdminClient()

  const context = await getHomeroomContext(admin, supabase)

  if (context.error || !context.homeroomClass) {
    return (
      <div className="space-y-6">
        <header><h1 className="text-3xl font-bold text-slate-900">Siswa Kelas</h1><p className="mt-2 text-slate-600">{context.error ?? 'Kelas wali belum ditetapkan.'}</p></header>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-primary-700">Wali kelas</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Siswa Kelas {context.homeroomClass.className}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Daftar siswa dalam kelas wali Anda pada tahun pelajaran aktif. Data hanya dapat dibaca, bukan diubah.</p>
      </header>
      <HomeroomStudentsClient students={context.students} className={context.homeroomClass.className} academicYearName={context.homeroomClass.academicYearName} />
    </div>
  )
}