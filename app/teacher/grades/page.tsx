import { requireRole } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import GradeEntryManager from '@/components/grades/GradeEntryManager'
import { getTeacherAssignments, getActiveAssessmentTypes, getActiveSemester } from '@/services/grades.service'

export default async function TeacherGradesPage() {
  await requireRole('teacher')
  const supabase = await createClient()

  const semesterResult = await getActiveSemester(supabase)
  if (!semesterResult.ok || !semesterResult.data?.id) {
    return (
      <div className="space-y-6">
        <header><h1 className="text-3xl font-bold text-slate-900">Input Nilai</h1><p className="mt-2 text-slate-600">Belum ada semester aktif.</p></header>
        <p className="text-sm leading-6 text-red-700">Hubungi administrator untuk mengaktifkan semester terlebih dahulu.</p>
      </div>
    )
  }

  const teacherId = await supabase.rpc('current_teacher_id')
  if (typeof teacherId !== 'string') {
    return <div className="space-y-6"><header><h1 className="text-3xl font-bold text-slate-900">Input Nilai</h1><p className="mt-2 text-slate-600">Data guru tidak ditemukan.</p></header><p className="text-sm leading-6 text-red-700">Hubungi administrator sekolah.</p></div>
  }

  const assignmentsResult = await getTeacherAssignments(supabase, teacherId)
  if (!assignmentsResult.ok) {
    return <div className="space-y-6"><header><h1 className="text-3xl font-bold text-slate-900">Input Nilai</h1><p className="mt-2 text-slate-600">Tidak ada penugasan mengajar.</p></header><p className="text-sm leading-6 text-slate-600">Anda belum ditugaskan mengajar mata pelajaran di kelas manapun pada tahun akademik aktif.</p></div>
  }

  const assessmentTypesResult = await getActiveAssessmentTypes(supabase)
  if (!assessmentTypesResult.ok) {
    return <div className="space-y-6"><header><h1 className="text-3xl font-bold text-slate-900">Input Nilai</h1><p className="mt-2 text-slate-600">Jenis penilaian tidak tersedia.</p></header><p className="text-sm leading-6 text-red-700">Hubungi administrator.</p></div>
  }

  const formattedAssignments = assignmentsResult.data.map(a => ({
    id: a.id,
    subject_name: a.subjectName,
    subject_code: a.subjectCode,
    class_name: a.className,
    class_grade_level: a.gradeLevel,
    academic_year_name: a.academicYearName,
  }))

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary-700">Penilaian</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Input Nilai</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Masukkan nilai Tugas, PTS, dan PAS untuk semua siswa dalam kelas Anda.</p>
        </div>
      </header>

      <GradeEntryManager
        assignments={formattedAssignments}
        semester={semesterResult.data}
        assessmentTypes={assessmentTypesResult.data}
        initialSubmissions={{}}
        initialError={null}
      />
    </div>
  )
}
