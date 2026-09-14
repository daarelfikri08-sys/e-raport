import { requireRole } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { ArrowRight, BookOpen, ClipboardCheck, TrendingUp, Users } from 'lucide-react'
import type { ServiceResult } from '@/services/service-result'
import { queryFailed } from '@/services/service-result'

type ServerClient = Awaited<ReturnType<typeof createClient>>
type AdminClient = ReturnType<typeof createAdminClient>

// ---------- Type guards ----------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

interface SubjectJoin { name: string; code: string | null }
interface AcademicYearJoin { name: string; is_active: boolean }

function isSubjectJoin(value: unknown): value is SubjectJoin {
  if (!isRecord(value)) return false
  return typeof value['name'] === 'string' && (value['code'] === null || typeof value['code'] === 'string')
}

function isAcademicYearJoin(value: unknown): value is AcademicYearJoin {
  if (!isRecord(value)) return false
  return typeof value['name'] === 'string' && typeof value['is_active'] === 'boolean'
}

interface AssignmentRowBase {
  id: string
  subject_id: string
  class_id: string
  academic_year_id: string
  subjects: unknown
  academic_years: unknown
}

// ---------- Data structures ----------

interface ClassInfo {
  id: string
  name: string
  grade_level: number
}

interface AssignmentCard {
  id: string
  subjectName: string
  subjectCode: string | null
  className: string
  gradeLevel: number
  studentCount: number
  progress: ProgressState
}

type ProgressState =
  | { kind: 'unavailable'; reason: 'semester' | 'assessment-types' | 'students' }
  | { kind: 'available'; percent: number; filled: number; expected: number }

// ---------- Fetchers ----------

async function getActiveAcademicYear(client: ServerClient): Promise<ServiceResult<{ id: string; name: string } | null>> {
  try {
    const { data, error } = await client
      .from('academic_years')
      .select('id,name,is_active')
      .eq('is_active', true)
      .maybeSingle()
    
    if (error || !data) return { ok: true, data: null }
    
    if (typeof data.id !== 'string' || typeof data.name !== 'string') return queryFailed()
    return { ok: true, data: { id: data.id, name: data.name } }
  } catch {
    return queryFailed()
  }
}

async function getTeacherAssignments(client: ServerClient, teacherId: string, academicYearId: string): Promise<ServiceResult<Array<Pick<AssignmentRowBase, 'id'|'subject_id'|'class_id'|'academic_year_id'|'subjects'|'academic_years'>>> > {
  try {
    const { data, error } = await client
      .from('teacher_subjects')
      .select('id,subject_id,class_id,academic_year_id,subjects(id,name,code),academic_years(id,name,is_active)')
      .eq('teacher_id', teacherId)
      .eq('academic_year_id', academicYearId)
    
    if (error) return queryFailed()
    if (!data) return { ok: true, data: [] }
    
    // Filter and guard types
    const result: AssignmentRowBase[] = []
    for (const row of data) {
      if (row.subjects && isSubjectJoin(row.subjects) && row.academic_years && isAcademicYearJoin(row.academic_years) && row.academic_years.is_active) {
        result.push({
          id: typeof row.id === 'string' ? row.id : '',
          subject_id: typeof row.subject_id === 'string' ? row.subject_id : '',
          class_id: typeof row.class_id === 'string' ? row.class_id : '',
          academic_year_id: typeof row.academic_year_id === 'string' ? row.academic_year_id : '',
          subjects: row.subjects,
          academic_years: row.academic_years,
        })
      }
    }
    
    return { ok: true, data: result }
  } catch {
    return queryFailed()
  }
}

async function getClassesByIds(admin: AdminClient, classIds: string[]): Promise<ServiceResult<ClassInfo[]>> {
  try {
    const { data, error } = await admin.from('classes').select('id,name,grade_level').in('id', classIds)
    if (error) return queryFailed()
    if (!data) return { ok: true, data: [] }
    
    const result: ClassInfo[] = []
    for (const c of data) {
      if (typeof c.id === 'string' && typeof c.name === 'string' && typeof c.grade_level === 'number') {
        result.push({ id: c.id, name: c.name, grade_level: c.grade_level })
      }
    }
    
    return { ok: true, data: result }
  } catch {
    return queryFailed()
  }
}

async function getClassStudentCounts(admin: AdminClient, classIds: string[], academicYearId: string): Promise<ServiceResult<Map<string, Set<string>>>> {
  // Returns Map<class_id -> set of student_ids>
  try {
    const { data, error } = await admin
      .from('student_classes')
      .select('class_id,student_id')
      .eq('academic_year_id', academicYearId)
      .in('class_id', classIds)
    
    if (error) return queryFailed()
    if (!data) return { ok: true, data: new Map() }
    
    const map = new Map<string, Set<string>>()
    for (const row of data) {
      if (isRecord(row) && typeof row.class_id === 'string' && typeof row.student_id === 'string') {
        if (!map.has(row.class_id)) map.set(row.class_id, new Set())
        map.get(row.class_id)?.add(row.student_id)
      }
    }
    
    return { ok: true, data: map }
  } catch {
    return queryFailed()
  }
}

async function getActiveAssessmentTypeCount(client: ServerClient): Promise<ServiceResult<number>> {
  try {
    const { data, error } = await client
      .from('assessment_types')
      .select('id')
      .eq('is_active', true)
    
    if (error) return queryFailed()
    if (!data) return { ok: true, data: 0 }
    
    return { ok: true, data: data.length }
  } catch {
    return queryFailed()
  }
}

async function getActiveSemester(client: ServerClient): Promise<ServiceResult<{ id: string; name: string } | null>> {
  try {
    const { data, error } = await client
      .from('semesters')
      .select('id,name')
      .eq('is_active', true)
      .maybeSingle()
    
    if (error || !data) return { ok: true, data: null }
    if (typeof data.id !== 'string' || typeof data.name !== 'string') return queryFailed()
    
    return { ok: true, data: { id: data.id, name: data.name } }
  } catch {
    return queryFailed()
  }
}

interface FilledGradesByAssignment {
  [teacher_subject_id: string]: number
}

async function getFilledGradeCounts(client: ServerClient, assignmentIds: string[], semesterId: string): Promise<ServiceResult<FilledGradesByAssignment>> {
  try {
    const { data, error } = await client
      .from('grades')
      .select('teacher_subject_id')
      .eq('semester_id', semesterId)
      .in('teacher_subject_id', assignmentIds)
      .not('score', 'is', null)
    
    if (error) return queryFailed()
    if (!data) return { ok: true, data: {} }
    
    const counts: FilledGradesByAssignment = {}
    for (const row of data) {
      if (isRecord(row) && typeof row.teacher_subject_id === 'string') {
        counts[row.teacher_subject_id] = (counts[row.teacher_subject_id] ?? 0) + 1
      }
    }
    
    return { ok: true, data: counts }
  } catch {
    return queryFailed()
  }
}

// ---------- Render helpers ----------

function renderProgressBadge(progress: ProgressState) {
  if (progress.kind === 'unavailable') {
    switch (progress.reason) {
      case 'semester':
        return <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">Belum Ada Semester Aktif</span>
      case 'assessment-types':
        return <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">Jenis Penilaian Belum Aktif</span>
      case 'students':
        return <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">Belum Ada Siswa</span>
    }
  }
  
  if (progress.percent >= 100) {
    return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Lengkap</span>
  } else if (progress.percent > 0) {
    return <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">Dalam Proses</span>
  } else {
    return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">Belum Dimulai</span>
  }
}

// ---------- Main page ----------

export default async function TeacherDashboardPage() {
  const profile = await requireRole('teacher')
  const supabase = await createClient()
  const admin = createAdminClient()

  // Get teacher ID
  const { data: teacherIdRaw } = await supabase.rpc('current_teacher_id')
  if (typeof teacherIdRaw !== 'string') {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard Guru</h1>
          <p className="mt-2 text-slate-600">Data guru tidak ditemukan.</p>
        </header>
        <p className="text-sm leading-6 text-red-700">Hubungi administrator sekolah untuk pemecahan masalah.</p>
      </div>
    )
  }

  // Get active academic year
  const yearResult = await getActiveAcademicYear(supabase)
  
  // Build period label
  const semesterResult = await getActiveSemester(supabase)
  let periodLabel = ''
  if (yearResult.ok && yearResult.data) {
    if (semesterResult.ok && semesterResult.data) {
      periodLabel = `Tahun Ajaran ${yearResult.data.name} • Semester ${semesterResult.data.name.charAt(0).toUpperCase() + semesterResult.data.name.slice(1)}`
    } else {
      periodLabel = `Tahun Ajaran ${yearResult.data.name} • Semester belum ditetapkan`
    }
  } else {
    periodLabel = 'Periode aktif belum ditetapkan'
  }

  // Get assignments
  const assignmentsBase = yearResult.ok && yearResult.data
    ? await getTeacherAssignments(supabase, teacherIdRaw, yearResult.data.id)
    : { ok: true as const, data: Array.from([]) }
  
  if (!assignmentsBase.ok) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard Guru</h1>
          <p className="mt-2 text-slate-600">Data penugasan mengajar tidak dapat dimuat.</p>
        </header>
        <p className="text-sm leading-6 text-slate-600">Silakan coba lagi nanti atau hubungi administrator.</p>
      </div>
    )
  }

  const assignmentIds = assignmentsBase.data.map(a => a.id)
  const classIds = [...new Set(assignmentsBase.data.map(a => a.class_id))]

  // Get classes info via admin client
  const classesResult = classIds.length > 0
    ? await getClassesByIds(admin, classIds)
    : { ok: true as const, data: [] as ClassInfo[] }
  
  if (!classesResult.ok && assignmentIds.length > 0) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard Guru</h1>
          <p className="mt-2 text-slate-600">Data kelas tidak dapat dimuat.</p>
        </header>
      </div>
    )
  }

  const classesMap = new Map((classesResult.ok ? classesResult.data : []).map(c => [c.id, c]))

  // Get student counts by class
  const rosterResult = classIds.length > 0
    ? await getClassStudentCounts(admin, classIds, yearResult.ok && yearResult.data ? yearResult.data.id : '')
    : { ok: true as const, data: new Map<string, Set<string>>() }
  
  if (!rosterResult.ok && assignmentIds.length > 0) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard Guru</h1>
          <p className="mt-2 text-slate-600">Data siswa tidak dapat dimuat.</p>
        </header>
      </div>
    )
  }

  // Total students across all classes
  const totalStudents = rosterResult.ok
    ? [...rosterResult.data.values()].reduce((sum, s) => sum + (s instanceof Set ? s.size : 0), 0)
    : 0

  // Active assessment types count
  const assessmentCountResult = await getActiveAssessmentTypeCount(supabase)

  // Filled grade counts
  let filledGradesMap: FilledGradesByAssignment = {}
  if (assignmentIds.length > 0 && semesterResult.ok && semesterResult.data) {
    const gradesResult = await getFilledGradeCounts(supabase, assignmentIds, semesterResult.data.id)
    if (gradesResult.ok) {
      filledGradesMap = gradesResult.data
    }
  }

  // Build assignment cards
  const assignmentsCards: AssignmentCard[] = []
  for (const base of assignmentsBase.data) {
    const classInfo = classesMap.get(base.class_id)
    if (!classInfo) continue
    
    const studentSet = rosterResult.ok ? rosterResult.data.get(base.class_id) ?? new Set() : new Set()
    const studentCount = studentSet.size
    const filled = filledGradesMap[base.id] ?? 0
    const assessmentCount = assessmentCountResult.ok ? assessmentCountResult.data : 0
    
    // Determine progress state
    let progress: ProgressState
    if (!semesterResult.ok || !semesterResult.data) {
      progress = { kind: 'unavailable', reason: 'semester' }
    } else if (assessmentCount === 0) {
      progress = { kind: 'unavailable', reason: 'assessment-types' }
    } else if (studentCount === 0) {
      progress = { kind: 'unavailable', reason: 'students' }
    } else {
      const expected = studentCount * assessmentCount
      const percent = Math.round((filled / expected) * 100)
      progress = { kind: 'available', percent, filled, expected }
    }
    
    const subject = base.subjects as { name: string; code: string | null }
    assignmentsCards.push({
      id: base.id,
      subjectName: subject.name,
      subjectCode: subject.code,
      className: classInfo.name,
      gradeLevel: classInfo.grade_level,
      studentCount,
      progress,
    })
  }

  // Sort by class name then subject name
  assignmentsCards.sort((a, b) => a.className.localeCompare(b.className) || a.subjectName.localeCompare(b.subjectName))

  // Compute overall stats
  const totalAssigned = assignmentsCards.length
  const completedCount = assignmentsCards.filter(a => a.progress.kind === 'available' && a.progress.percent >= 100).length
  
  let overallProgress: ProgressState = { kind: 'unavailable', reason: 'semester' }
  if (assignmentsCards.length > 0) {
    const totalExpected = assignmentsCards.reduce((sum, a) => {
      if (a.progress.kind === 'available') return sum + a.progress.expected
      return sum
    }, 0)
    const totalFilled = assignmentsCards.reduce((sum, a) => {
      if (a.progress.kind === 'available') return sum + a.progress.filled
      return sum
    }, 0)
    
    if (totalExpected > 0) {
      overallProgress = { kind: 'available', percent: Math.round((totalFilled / totalExpected) * 100), filled: totalFilled, expected: totalExpected }
    } else {
      overallProgress = assessmentCountResult.ok && assessmentCountResult.data === 0
        ? { kind: 'unavailable', reason: 'assessment-types' }
        : { kind: 'unavailable', reason: 'students' }
    }
  }

  // Render
  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Selamat datang, {profile.full_name ?? 'Guru'}</h1>
        {periodLabel && <p className="mt-1 text-sm text-slate-600">{periodLabel}</p>}
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Pantau kelas ajar, jumlah siswa, dan progres pengisian nilai Anda.</p>
      </header>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Kelas Diajar */}
        <Card padding="md">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <BookOpen className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Kelas Diajar</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{totalAssigned}</p>
              <p className="mt-1 text-xs text-slate-500">mata pelajaran dalam kelas</p>
            </div>
          </div>
        </Card>

        {/* Total Siswa */}
        <Card padding="md">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100">
              <Users className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Total Siswa</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{totalStudents}</p>
              <p className="mt-1 text-xs text-slate-500">siswa di semua kelas ajar</p>
            </div>
          </div>
        </Card>

        {/* Progress Nilai */}
        <Card padding="md">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100">
              <ClipboardCheck className="h-6 w-6 text-purple-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Progress Nilai</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                {overallProgress.kind === 'available' ? `${overallProgress.percent}%` : '—'}
              </p>
              <p className="mt-1 text-xs text-slate-500">rata-rata pengisian nilai</p>
            </div>
          </div>
        </Card>

        {/* Tugas Lengkap */}
        <Card padding="md">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100">
              <TrendingUp className="h-6 w-6 text-orange-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Penugasan Lengkap</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{completedCount}/{totalAssigned}</p>
              <p className="mt-1 text-xs text-slate-500">nilai sudah diisi lengkap</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Empty state or assignments list */}
      {assignmentsCards.length === 0 ? (
        <section aria-labelledby="assignments-heading">
          <h2 id="assignments-heading" className="mb-4 text-lg font-bold text-slate-900">Penugasan Mengajar</h2>
          <Card padding="lg" className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <BookOpen className="h-7 w-7 text-slate-500" />
            </div>
            <h3 className="mt-4 text-lg font-bold">Belum Ada Kelas Diajar</h3>
            <p className="mt-2 text-sm text-slate-600">
              {yearResult.ok && yearResult.data
                ? 'Anda belum ditugaskan mengajar mata pelajaran apa pun pada tahun akademik aktif. Hubungi administrator sekolah.'
                : 'Tahun akademik aktif belum ditetapkan. Hubungi administrator sekolah.'}
            </p>
          </Card>
        </section>
      ) : (
        <section aria-labelledby="assignments-heading">
          <h2 id="assignments-heading" className="mb-4 text-lg font-bold text-slate-900">Penugasan Mengajar</h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            {assignmentsCards.map(card => (
              <Card key={card.id} padding="sm" className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">{card.subjectName}</h3>
                    <p className="text-sm text-slate-600">Kelas {card.className}</p>
                    {card.subjectCode && <p className="text-xs text-slate-500">Kode: {card.subjectCode}</p>}
                  </div>
                  {renderProgressBadge(card.progress)}
                </div>
                
                {/* Student count */}
                <p className="mt-3 text-xs text-slate-500">{card.studentCount} siswa terdaftar</p>
                
                {/* Progress */}
                {card.progress.kind === 'available' && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Progres pengisian</span>
                      <span className={`font-semibold ${card.progress.percent >= 100 ? 'text-green-600' : card.progress.percent >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                        {card.progress.percent}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={card.progress.percent} aria-valuemin={0} aria-valuemax={100}>
                      <div
                        className={`h-full rounded-full ${card.progress.percent >= 100 ? 'bg-green-500' : card.progress.percent >= 50 ? 'bg-orange-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(card.progress.percent, 100)}%` }}
                        aria-hidden="true"
                      />
                    </div>
                    <p className="text-xs text-slate-500">{card.progress.filled} dari {card.progress.expected} nilai terisi</p>
                  </div>
                )}
                
                {card.progress.kind === 'unavailable' && (
                  <p className="mt-4 text-sm text-amber-800">
                    {card.progress.reason === 'semester' && 'Belum ada semester aktif. Progres nilai belum dapat dihitung.'}
                    {card.progress.reason === 'assessment-types' && 'Belum ada jenis penilaian aktif. Hubungi administrator.'}
                    {card.progress.reason === 'students' && 'Belum ada siswa terdaftar di kelas ini.'}
                  </p>
                )}
                
                {/* Action button */}
                <div className="mt-5">
                  <Button variant="outline" size="sm" href="/teacher/grades" fullWidth>
                    Input Nilai <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
