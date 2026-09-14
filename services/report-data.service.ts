import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateFinalScore, calculateTotal, calculateAverage } from '@/lib/calculations'
import type { ServiceResult } from './service-result'
import type { HomeroomClass, HomeroomStudent, HomeroomSubject, HomeroomContext, StudentSummary } from './homeroom.service'
import { getClassSummaries, getHomeroomContext } from './homeroom.service'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Predikat + deskripsi berdasarkan nilai akhir (skala 0-100). Mudah disesuaikan. */
export function subjectPredicate(score: number): { grade: string; description: string } {
  if (score >= 90) return { grade: 'A', description: 'Sangat baik. Siswa menguasai materi dengan sangat baik.' }
  if (score >= 80) return { grade: 'B', description: 'Baik. Siswa menguasai materi dengan baik.' }
  if (score >= 70) return { grade: 'C', description: 'Cukup. Siswa menguasai sebagian besar materi.' }
  if (score >= 60) return { grade: 'D', description: 'Kurang. Siswa perlu meningkatkan penguasaan materi.' }
  return { grade: 'E', description: 'Sangat kurang. Siswa perlu bimbingan tambahan.' }
}

export interface ReportSubjectRow {
  subjectName: string
  subjectCode: string | null
  finalScore: number | null
  grade: string
  description: string
}

export interface ExtracurricularRow {
  name: string
  score: number | null
  description: string | null
}

export interface ReportStudentData {
  studentId: string
  nis: string | null
  nisn: string | null
  fullName: string
  gender: 'L' | 'P' | null
  className: string
  gradeLevel: number
  academicYearName: string
  semesterName: string
  subjects: ReportSubjectRow[]
  total: number
  average: number
  ranking: number
  rankingEnabled: boolean
  complete: boolean
  attendance: { sick: number; permission: number; absent: number }
  extracurriculars: ExtracurricularRow[]
  achievements: Array<{ title: string; level: string | null; description: string | null }>
  homeroomNote: string | null
}

export interface ReportBundle {
  context: HomeroomContext
  students: ReportStudentData[]
  school: {
    schoolName: string
    npsn: string | null
    address: string | null
    phone: string | null
    email: string | null
    principalName: string | null
    principalNip: string | null
    logoUrl: string | null
  }
  homeroomTeacherName: string | null
}

async function readSchoolAndTeacher(
  client: SupabaseClient,
  admin: SupabaseClient,
  teacherId: string
): Promise<{ school: ReportBundle['school']; homeroomTeacherName: string | null }> {
  let schoolName = 'Sekolah'
  let npsn: string | null = null
  let address: string | null = null
  let phone: string | null = null
  let email: string | null = null
  let principalName: string | null = null
  let principalNip: string | null = null
  let logoUrl: string | null = null

  const { data: settings } = await client.from('school_settings').select('*').maybeSingle()
  if (isRecord(settings)) {
    if (typeof settings.school_name === 'string' && settings.school_name.trim()) schoolName = settings.school_name
    if (typeof settings.school_npsn === 'string') npsn = settings.school_npsn
    if (typeof settings.school_address === 'string') address = settings.school_address
    if (typeof settings.school_phone === 'string') phone = settings.school_phone
    if (typeof settings.school_email === 'string') email = settings.school_email
    if (typeof settings.principal_name === 'string') principalName = settings.principal_name
    if (typeof settings.principal_nip === 'string') principalNip = settings.principal_nip
    if (typeof settings.logo_url === 'string') logoUrl = settings.logo_url
  }

  let homeroomTeacherName: string | null = null
  const { data: teacher } = await admin.from('teachers').select('full_name').eq('id', teacherId).maybeSingle()
  if (isRecord(teacher) && typeof teacher.full_name === 'string') homeroomTeacherName = teacher.full_name

  return { school: { schoolName, npsn, address, phone, email, principalName, principalNip, logoUrl }, homeroomTeacherName }
}

async function loadSubjectScores(
  client: SupabaseClient,
  admin: SupabaseClient,
  context: HomeroomContext
): Promise<Map<string, Map<string, number | null>>> {
  // key studentId|subjectId -> final score (weights applied)
  const result = new Map<string, Map<string, number | null>>()
  const home = context.homeroomClass
  if (!home) return result

  const { data: tsRows } = await admin
    .from('teacher_subjects')
    .select('id,subject_id')
    .eq('class_id', home.classId)
    .eq('academic_year_id', home.academicYearId)
  const assignmentBySubject = new Map<string, string>()
  for (const ts of tsRows ?? []) {
    if (isRecord(ts) && typeof ts.id === 'string' && typeof ts.subject_id === 'string') assignmentBySubject.set(ts.subject_id, ts.id)
  }
  const assignmentIds = Array.from(assignmentBySubject.values())
  if (assignmentIds.length === 0) return result

  const { data: assessmentRows } = await client.from('assessment_types').select('id,code,weight,is_active').eq('is_active', true)
  const assessments = (assessmentRows ?? []).filter(isRecord) as Array<{ id: string; code: string; weight: number; is_active: boolean }>
  const validAssessments = assessments.filter(a => typeof a.id === 'string' && typeof a.code === 'string' && typeof a.weight === 'number')

  const { data: gradeRows } = await client
    .from('grades')
    .select('student_id,teacher_subject_id,assessment_type_id,score')
    .eq('semester_id', home.semesterId)
    .in('teacher_subject_id', assignmentIds)

  const scoreMap = new Map<string, Array<{ code: string; weight: number; score: number | null }>>()
  for (const g of gradeRows ?? []) {
    if (!isRecord(g)) continue
    const subjectId = [...assignmentBySubject.entries()].find(([, id]) => id === g.teacher_subject_id)?.[0]
    if (!subjectId || typeof g.student_id !== 'string' || typeof g.assessment_type_id !== 'string') continue
    const assessment = validAssessments.find(a => a.id === g.assessment_type_id)
    if (!assessment) continue
    const key = `${g.student_id}|${subjectId}`
    if (!scoreMap.has(key)) scoreMap.set(key, [])
    scoreMap.get(key)?.push({ code: assessment.code, weight: assessment.weight, score: typeof g.score === 'number' ? g.score : null })
  }

  for (const student of context.students) {
    const bySubject = new Map<string, number | null>()
    for (const subject of context.subjects) {
      const entries = scoreMap.get(`${student.studentId}|${subject.subjectId}`) ?? []
      const composed: Record<string, { score: number; weight: number }> = {}
      for (const e of entries) if (e.score !== null) composed[e.code] = { score: e.score, weight: e.weight }
      bySubject.set(subject.subjectId, Object.keys(composed).length > 0 ? calculateFinalScore(composed) : null)
    }
    result.set(student.studentId, bySubject)
  }
  return result
}

async function loadAttendance(client: SupabaseClient, studentId: string, semesterId: string): Promise<{ sick: number; permission: number; absent: number }> {
  const { data } = await client.from('attendance').select('sick,permission,absent').eq('student_id', studentId).eq('semester_id', semesterId).maybeSingle()
  if (!isRecord(data)) return { sick: 0, permission: 0, absent: 0 }
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  return { sick: num(data.sick), permission: num(data.permission), absent: num(data.absent) }
}

async function loadExtracurriculars(admin: SupabaseClient, studentId: string, semesterId: string): Promise<ExtracurricularRow[]> {
  const { data } = await admin
    .from('student_extracurriculars')
    .select('score,description,extracurriculars(name)')
    .eq('student_id', studentId)
    .eq('semester_id', semesterId)
  const rows: ExtracurricularRow[] = []
  for (const r of data ?? []) {
    const ex = r?.extracurriculars
    if (isRecord(ex) && typeof ex.name === 'string') {
      rows.push({
        name: ex.name,
        score: typeof r.score === 'number' ? r.score : null,
        description: typeof r.description === 'string' ? r.description : null,
      })
    }
  }
  return rows
}

async function loadAchievements(client: SupabaseClient, studentId: string, semesterId: string): Promise<ReportStudentData['achievements']> {
  const { data } = await client.from('achievements').select('title,level,description').eq('student_id', studentId).eq('semester_id', semesterId)
  return (data ?? [])
    .filter(isRecord)
    .filter(r => typeof r.title === 'string')
    .map(r => ({
      title: r.title as string,
      level: typeof r.level === 'string' ? r.level : null,
      description: typeof r.description === 'string' ? r.description : null,
    }))
}

async function loadHomeroomNote(client: SupabaseClient, studentId: string, semesterId: string): Promise<string | null> {
  const { data } = await client.from('report_cards').select('homeroom_note').eq('student_id', studentId).eq('semester_id', semesterId).maybeSingle()
  if (isRecord(data) && typeof data.homeroom_note === 'string') return data.homeroom_note
  return null
}

/** Build full report data for every student in the homeroom class for the active semester. */
export async function buildReportBundle(admin: SupabaseClient, client: SupabaseClient): Promise<ServiceResult<ReportBundle>> {
  try {
    const context = await getHomeroomContext(admin, client)
    if (context.error || !context.homeroomClass) {
      return { ok: false, message: context.error ?? 'Kelas wali belum ditetapkan.' }
    }
    const home = context.homeroomClass

    const summariesResult = await getClassSummaries(admin, client, context)
    const summaryRows = summariesResult.ok ? summariesResult.data.rows : []
    const summaryByStudent = new Map<string, StudentSummary>()
    for (const s of summaryRows) summaryByStudent.set(s.studentId, s)

    const scoreMap = await loadSubjectScores(client, admin, context)
    const { school, homeroomTeacherName } = await readSchoolAndTeacher(client, admin, home.homeroomTeacherId ?? '')

    const students: ReportStudentData[] = []
    for (const student of context.students) {
      const bySubject = scoreMap.get(student.studentId) ?? new Map<string, number | null>()
      const summary = summaryByStudent.get(student.studentId)

      const subjects: ReportSubjectRow[] = context.subjects.map(subject => {
        const score = bySubject.get(subject.subjectId) ?? null
        const pred = score !== null && Number.isFinite(score) ? subjectPredicate(score) : { grade: '—', description: '' }
        return {
          subjectName: subject.name,
          subjectCode: subject.code,
          finalScore: score,
          grade: pred.grade,
          description: pred.description,
        }
      })

      const attendance = await loadAttendance(client, student.studentId, home.semesterId)
      const extracurriculars = await loadExtracurriculars(admin, student.studentId, home.semesterId)
      const achievements = await loadAchievements(client, student.studentId, home.semesterId)
      const homeroomNote = await loadHomeroomNote(client, student.studentId, home.semesterId)

      students.push({
        studentId: student.studentId,
        nis: student.nis,
        nisn: student.nisn,
        fullName: student.fullName,
        gender: student.gender,
        className: home.className,
        gradeLevel: home.gradeLevel,
        academicYearName: home.academicYearName,
        semesterName: home.semesterName,
        subjects,
        total: summary?.total ?? calculateTotal(subjects.map(s => s.finalScore ?? 0)),
        average: summary?.average ?? calculateAverage(subjects.map(s => s.finalScore ?? 0)),
        ranking: summary?.ranking ?? 0,
        rankingEnabled: context.rankingEnabled,
        complete: summary?.complete ?? false,
        attendance,
        extracurriculars,
        achievements,
        homeroomNote,
      })
    }

    return { ok: true, data: { context, students, school, homeroomTeacherName } }
  } catch {
    return { ok: false, message: 'Data rapor tidak dapat dimuat.' }
  }
}

export type { HomeroomClass, HomeroomStudent, HomeroomSubject }
