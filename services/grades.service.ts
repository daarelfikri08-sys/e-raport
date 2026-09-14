import type { SupabaseClient } from '@supabase/supabase-js'
import type { Grade, AssessmentType, Student, SubmissionSnapshot } from '@/types/database'
import { queryFailed, type ServiceResult } from './service-result'

export interface GradeQuery { teacherSubjectId: string; semesterId: string; studentId?: string }
const COLUMNS = 'id,student_id,teacher_subject_id,assessment_type_id,semester_id,score,notes,status,submitted_at,verified_at,locked_at,created_at,updated_at'

export async function listGrades(client: SupabaseClient, params: GradeQuery): Promise<ServiceResult<Grade[]>> {
  try {
    let query = client.from('grades').select(COLUMNS).eq('teacher_subject_id', params.teacherSubjectId).eq('semester_id', params.semesterId)
    if (params.studentId) query = query.eq('student_id', params.studentId)
    const { data, error } = await query.returns<Grade[]>()
    return error ? queryFailed() : { ok: true, data: data ?? [] }
  } catch { return queryFailed() }
}

export type GradeDraft = Pick<Grade, 'student_id' | 'teacher_subject_id' | 'assessment_type_id' | 'semester_id' | 'score' | 'notes'>
export async function saveDraftGrade(client: SupabaseClient, value: GradeDraft): Promise<ServiceResult<Grade>> {
  try {
    const { data, error } = await client.from('grades').upsert({ ...value, status: 'draft' }, { onConflict: 'student_id,teacher_subject_id,assessment_type_id,semester_id' }).select(COLUMNS).single<Grade>()
    return error || !data ? queryFailed() : { ok: true, data }
  } catch { return queryFailed() }
}

function isStudent(value: unknown): value is Student {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  return typeof row.id === 'string' && typeof row.full_name === 'string'
    && (row.nis === null || typeof row.nis === 'string')
    && (row.nisn === null || typeof row.nisn === 'string')
    && (row.gender === null || row.gender === 'L' || row.gender === 'P')
    && typeof row.is_active === 'boolean' && typeof row.created_at === 'string'
    && typeof row.updated_at === 'string'
}

export type GradeStatus = 'draft' | 'submitted' | 'verified' | 'locked'

export interface AssignmentDetail {
  id: string
  subjectName: string
  subjectCode: string | null
  className: string
  gradeLevel: number
  academicYearName: string
  activeSemester: { id: string; name: string } | null
}

export async function getTeacherAssignments(adminClient: SupabaseClient, teacherId: string): Promise<ServiceResult<AssignmentDetail[]>> {
  try {
    const { data, error } = await adminClient
      .from('teacher_subjects')
      .select(`id,subject_id,class_id,academic_year_id,subjects(id,name,code),classes(id,name,grade_level),academic_years(id,name,is_active)`)
      .eq('teacher_id', teacherId)
    if (error || !data) return queryFailed()

    interface JoinedRow {
      id: string
      subjects: { id: string; name: string; code: string | null } | null
      classes: { id: string; name: string; grade_level: number } | null
      academic_years: { id: string; name: string; is_active: boolean } | null
    }

    const rows = data as unknown as JoinedRow[]
    const result: AssignmentDetail[] = []
    for (const ts of rows) {
      if (ts.academic_years?.is_active && ts.subjects && ts.classes) {
        result.push({
          id: ts.id,
          subjectName: ts.subjects.name,
          subjectCode: ts.subjects.code,
          className: ts.classes.name,
          gradeLevel: ts.classes.grade_level,
          academicYearName: ts.academic_years.name,
          activeSemester: null,
        })
      }
    }

    return { ok: true, data: result }
  } catch { return queryFailed() }
}

export async function getActiveAssessmentTypes(client: SupabaseClient): Promise<ServiceResult<AssessmentType[]>> {
  try {
    const { data, error } = await client.from('assessment_types').select('*').eq('is_active', true).order('name')
    if (error || !data) return queryFailed()
    return { ok: true, data }
  } catch { return queryFailed() }
}

export async function getActiveSemester(client: SupabaseClient): Promise<ServiceResult<{ id: string; name: string } | null>> {
  try {
    const { data, error } = await client.from('semesters').select('id,name').eq('is_active', true).maybeSingle()
    if (error) return queryFailed()
    return { ok: true, data: data ?? null }
  } catch { return queryFailed() }
}

export async function getClassRoster(adminClient: SupabaseClient, classId: string, academicYearId: string): Promise<ServiceResult<Pick<Student, 'id' | 'nis' | 'nisn' | 'full_name' | 'gender'>[]>> {
  try {
    const { data, error } = await adminClient
      .from('student_classes')
      .select('student_id,students(id,nis,nisn,full_name,gender)')
      .eq('class_id', classId)
      .eq('academic_year_id', academicYearId)
      .order('students.full_name')
    if (error || !data) return queryFailed()

    const validStudents: Student[] = []
    for (const sc of data) {
      const students = sc.students
      if (students && isStudent(students)) validStudents.push(students)
    }

    return { ok: true, data: validStudents }
  } catch { return queryFailed() }
}

export async function getAssignmentGrades(client: SupabaseClient, teacherSubjectId: string, semesterId: string): Promise<ServiceResult<Record<string, Grade[]>>> {
  try {
    const { data, error } = await client.from('grades').select('student_id,*').eq('teacher_subject_id', teacherSubjectId).eq('semester_id', semesterId)
    if (error || !data) return queryFailed()

    const byStudent: Record<string, Grade[]> = {}
    for (const g of data) {
      if (!byStudent[g.student_id]) byStudent[g.student_id] = []
      byStudent[g.student_id].push(g)
    }
    return { ok: true, data: byStudent }
  } catch { return queryFailed() }
}

export async function getSubmissionStatus(adminClient: SupabaseClient, teacherSubjectId: string, semesterId: string): Promise<ServiceResult<SubmissionSnapshot | null>> {
  try {
    const { data, error } = await adminClient
      .from('grade_submissions')
      .select('status,submitted_at,verified_at,locked_at')
      .eq('teacher_subject_id', teacherSubjectId)
      .eq('semester_id', semesterId)
      .maybeSingle()
    if (error) return queryFailed()
    if (!data) return { ok: true, data: null }

    return {
      ok: true,
      data: { status: data.status, submitted_at: data.submitted_at },
    }
  } catch { return queryFailed() }
}

export async function batchUpsertGrades(adminClient: SupabaseClient, entries: Array<{ student_id: string; score: number }>): Promise<ServiceResult<boolean>> {
  try {
    const rows = entries.map(e => ({ status: 'draft' as const, ...e }))
    const { error } = await adminClient.from('grades').upsert(rows, { onConflict: 'student_id,teacher_subject_id,assessment_type_id,semester_id' })
    return error ? queryFailed() : { ok: true, data: true }
  } catch { return queryFailed() }
}
