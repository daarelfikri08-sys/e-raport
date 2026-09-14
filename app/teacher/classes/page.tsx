import type { Metadata } from 'next'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireRole } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { getClassRoster } from '@/services/grades.service'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ClassesTable from '@/components/classes/ClassesTable'

export const metadata: Metadata = {
  title: 'Kelas Ajar - Guru',
  description: 'Lihat daftar kelas dan mata pelajaran yang diajarkan',
}

interface TeacherClassRow {
  assignmentId: string
  className: string
  gradeLevel: number
  subjectNames: string
  academicYearName: string
  studentCount: number
  hasActiveSemester: boolean
}

interface GroupedClass {
  classId: string
  className: string
  gradeLevel: number
  subjectNames: string[]
  academicYearId: string
  academicYearName: string
  studentCount: number
  hasActiveSemester: boolean
}

/** Type guards for untyped joined rows from Supabase (RLS-bypassed admin query). */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

interface TeacherSubjectRow {
  id: string
  class_id: string
  academic_year_id: string
  class_name: string
  grade_level: number
  subject_name: string
  academic_year_name: string
  academic_year_active: boolean
}

function isTeacherSubjectRow(value: unknown): value is TeacherSubjectRow {
  if (!isRecord(value)) return false
  return typeof value.id === 'string'
    && typeof value.class_id === 'string'
    && typeof value.academic_year_id === 'string'
    && typeof value.class_name === 'string'
    && typeof value.grade_level === 'number'
    && typeof value.subject_name === 'string'
    && typeof value.academic_year_name === 'string'
    && typeof value.academic_year_active === 'boolean'
}

async function fetchTeacherClasses(adminClient: SupabaseClient, teacherId: string): Promise<TeacherClassRow[]> {
  // 1) Load assignments of this teacher, grouped later by class
  const { data, error } = await adminClient
    .from('teacher_subjects')
    .select(`id, class_id, academic_year_id, subjects(name), classes(name, grade_level), academic_years(name, is_active)`)
    .eq('teacher_id', teacherId)
  if (error || !data) return []

  // 2) Filter for active academic year and guard joined shapes
  const validRows: TeacherSubjectRow[] = []
  for (const row of data) {
    if (!isRecord(row)) continue
    const subjects = row.subjects
    const classes = row.classes
    const academicYears = row.academic_years
    if (!isRecord(subjects) || !isRecord(classes) || !isRecord(academicYears)) continue
    if (academicYears.is_active !== true) continue

    const candidate = {
      id: readString(row.id),
      class_id: readString(row.class_id),
      academic_year_id: readString(row.academic_year_id),
      class_name: readString(classes.name),
      grade_level: readNumber(classes.grade_level),
      subject_name: readString(subjects.name),
      academic_year_name: readString(academicYears.name),
      academic_year_active: true,
    }
    if (isTeacherSubjectRow(candidate)) validRows.push(candidate)
  }
  if (validRows.length === 0) return []

  // 3) Determine active semesters for status badges
  const { data: semestersData } = await adminClient
    .from('semesters')
    .select('academic_year_id')
    .eq('is_active', true)
  const activeSemesterAcademicYearIds = new Set<string>()
  if (semestersData) {
    for (const s of semestersData) {
      if (isRecord(s) && typeof s.academic_year_id === 'string') activeSemesterAcademicYearIds.add(s.academic_year_id)
    }
  }

  // 4) Roster counts per class via admin client (RLS restriction on student_classes)
  const rosterCountPromises = validRows.map(async (row) => {
    const rosterResult = await getClassRoster(adminClient, row.class_id, row.academic_year_id)
    return { row, count: rosterResult.ok ? rosterResult.data.length : 0 }
  })
  const rosterCounts = await Promise.all(rosterCountPromises)

  // 5) Group by class_id, dedupe subjects, sum counts per class
  const grouped = new Map<string, GroupedClass>()
  for (const { row, count } of rosterCounts) {
    const key = row.class_id
    const existing = grouped.get(key)
    if (!existing) {
      grouped.set(key, {
        classId: row.class_id,
        className: row.class_name,
        gradeLevel: row.grade_level,
        subjectNames: [row.subject_name],
        academicYearId: row.academic_year_id,
        academicYearName: row.academic_year_name,
        studentCount: count,
        hasActiveSemester: activeSemesterAcademicYearIds.has(row.academic_year_id),
      })
    } else {
      if (!existing.subjectNames.includes(row.subject_name)) existing.subjectNames.push(row.subject_name)
      existing.studentCount = count
    }
  }

  // 6) Build rows for display, sorted by grade level then class name
  return Array.from(grouped.values())
    .map(g => ({
      assignmentId: g.classId,
      className: g.className,
      gradeLevel: g.gradeLevel,
      subjectNames: g.subjectNames.join(', '),
      academicYearName: g.academicYearName,
      studentCount: g.studentCount,
      hasActiveSemester: g.hasActiveSemester,
    }))
    .sort((a, b) => a.gradeLevel - b.gradeLevel || a.className.localeCompare(b.className, 'id'))
}

export default async function TeacherClassesPage() {
  await requireRole('teacher')
  const supabase = await createClient()

  const teacherId = await supabase.rpc('current_teacher_id')
  if (typeof teacherId !== 'string') {
    return (
      <div className="space-y-6">
        <header>
          <p className="text-sm font-semibold text-primary-700">Kelas</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Kelas Ajar</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Lihat kelas dan mata pelajaran yang menjadi tanggung jawab Anda.</p>
        </header>
        <Card>
          <p className="text-sm leading-6 text-red-600">Data guru tidak ditemukan. Hubungi administrator sekolah.</p>
          <div className="mt-4">
            <Button variant="outline" href="/teacher/dashboard">Kembali ke Dashboard</Button>
          </div>
        </Card>
      </div>
    )
  }

  // Admin client for student_classes JOIN (RLS restriction)
  const adminClient = createAdminClient()


  const classes = await fetchTeacherClasses(adminClient, teacherId)

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary-700">Kelas</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Kelas Ajar</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Lihat kelas dan mata pelajaran yang menjadi tanggung jawab Anda.</p>
        </div>
        <Button href="/teacher/grades" variant="outline">Input Nilai</Button>
      </header>

      <Card title="Daftar Kelas Ajar" subtitle={`Total ${classes.length} kelas · Tahun Akademik aktif`}>
        {classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="text-sm font-medium text-slate-900">Tidak ada kelas yang diajar</p>
            <p className="max-w-md text-sm leading-6 text-slate-600">Anda belum ditugaskan mengajar mata pelajaran di kelas mana pun pada tahun akademik aktif. Silakan hubungi administrator sekolah.</p>
          </div>
        ) : (
          <ClassesTable assignments={classes} />
        )}
      </Card>
    </div>
  )
}
