import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateFinalScore, calculateAverage, calculateTotal } from '@/lib/calculations'
import { queryFailed, type ServiceResult } from './service-result'

export interface HomeroomClass {
  classId: string
  className: string
  gradeLevel: number
  homeroomTeacherId: string | null
  academicYearId: string
  academicYearName: string
  semesterId: string
  semesterName: 'ganjil' | 'genap'
}

export interface HomeroomStudent {
  studentId: string
  nis: string | null
  nisn: string | null
  fullName: string
  gender: 'L' | 'P' | null
  isActive: boolean
}

export interface HomeroomSubject {
  subjectId: string
  code: string | null
  name: string
}

export interface StudentFinalScore {
  subjectId: string
  subjectName: string
  subjectCode: string | null
  finalScore: number | null
  hasAllAssessments: boolean
}

export interface StudentSummary {
  studentId: string
  nis: string | null
  fullName: string
  subjectScores: Record<string, number | null>
  total: number
  average: number
  ranking: number
  complete: boolean
}

export interface HomeroomContext {
  homeroomClass: HomeroomClass | null
  students: HomeroomStudent[]
  subjects: HomeroomSubject[]
  rankingEnabled: boolean
  error?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function resolveTeacherId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.rpc('current_teacher_id')
  return typeof data === 'string' ? data : null
}

/** Find the homeroom class for the current teacher and active academic year+semester */
export async function getHomeroomContext(
  admin: SupabaseClient,
  client: SupabaseClient
): Promise<HomeroomContext> {
  try {
    const teacherId = await resolveTeacherId(client)
    if (!teacherId) return { homeroomClass: null, students: [], subjects: [], rankingEnabled: false, error: 'Data guru tidak ditemukan.' }

    // Active academic year + semester
    const { data: activeYear } = await client.from('academic_years').select('id,name,is_active').eq('is_active', true).maybeSingle()
    const { data: activeSemester } = await client.from('semesters').select('id,name,academic_year_id,is_active').eq('is_active', true).maybeSingle()
    if (!activeYear || !activeSemester) {
      return { homeroomClass: null, students: [], subjects: [], rankingEnabled: false, error: 'Tahun pelajaran atau semester aktif belum ditetapkan.' }
    }

    // Homeroom class for this teacher (classes are year-agnostic in this schema)
    const { data: classRow } = await admin.from('classes').select('id,name,grade_level,homeroom_teacher_id').eq('homeroom_teacher_id', teacherId).maybeSingle()
    if (!classRow) {
      return { homeroomClass: null, students: [], subjects: [], rankingEnabled: false, error: 'Anda belum menjadi wali kelas pada kelas mana pun.' }
    }

    // Students in that class for active year
    const { data: scRows } = await admin
      .from('student_classes')
      .select('student_id,students(id,nis,nisn,full_name,gender,is_active)')
      .eq('class_id', classRow.id)
      .eq('academic_year_id', activeYear.id)
      .order('students.full_name')

    const students: HomeroomStudent[] = []
    for (const sc of scRows ?? []) {
      if (!isRecord(sc)) continue
      const s = sc.students
      if (!isRecord(s)) continue
      if (typeof s.id !== 'string' || typeof s.full_name !== 'string' || typeof s.is_active !== 'boolean') continue
      students.push({
        studentId: s.id,
        nis: typeof s.nis === 'string' ? s.nis : null,
        nisn: typeof s.nisn === 'string' ? s.nisn : null,
        fullName: s.full_name,
        gender: s.gender === 'L' || s.gender === 'P' ? s.gender : null,
        isActive: s.is_active,
      })
    }

    // Subjects taught in this class for active year (distinct)
    const { data: tsRows } = await admin
      .from('teacher_subjects')
      .select('subject_id,subjects(id,code,name)')
      .eq('class_id', classRow.id)
      .eq('academic_year_id', activeYear.id)

    const subjectMap = new Map<string, HomeroomSubject>()
    for (const ts of tsRows ?? []) {
      if (!isRecord(ts)) continue
      const sub = ts.subjects
      if (!isRecord(sub)) continue
      if (typeof sub.id !== 'string' || typeof sub.name !== 'string') continue
      if (!subjectMap.has(sub.id)) {
        subjectMap.set(sub.id, {
          subjectId: sub.id,
          code: typeof sub.code === 'string' ? sub.code : null,
          name: sub.name,
        })
      }
    }
    const subjects = Array.from(subjectMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'id'))

    // ranking_enabled setting
    let rankingEnabled = true
    const { data: settings } = await client.from('school_settings').select('ranking_enabled').maybeSingle()
    if (settings && typeof settings.ranking_enabled === 'boolean') rankingEnabled = settings.ranking_enabled

    return {
      homeroomClass: {
        classId: classRow.id,
        className: typeof classRow.name === 'string' ? classRow.name : '',
        gradeLevel: typeof classRow.grade_level === 'number' ? classRow.grade_level : 0,
        homeroomTeacherId: teacherId,
        academicYearId: activeYear.id,
        academicYearName: typeof activeYear.name === 'string' ? activeYear.name : '',
        semesterId: activeSemester.id,
        semesterName: activeSemester.name === 'genap' ? 'genap' : 'ganjil',
      },
      students,
      subjects,
      rankingEnabled,
    }
  } catch {
    return { homeroomClass: null, students: [], subjects: [], rankingEnabled: false, error: 'Data kelas wali tidak dapat dimuat.' }
  }
}

/** Load final scores per subject for every student in a class+semester and produce summaries (with competition ranking). */
export async function getClassSummaries(
  admin: SupabaseClient,
  client: SupabaseClient,
  context: HomeroomContext
): Promise<ServiceResult<{ rows: StudentSummary[]; assessmentCount: number; error?: string }>> {
  if (!context.homeroomClass) return queryFailed()
  const { classId, academicYearId, semesterId } = context.homeroomClass
  if (context.subjects.length === 0) return { ok: true, data: { rows: [], assessmentCount: 0 } }

  // Teacher subjects in this class/year -> subjectId map
  const { data: tsRows } = await admin
    .from('teacher_subjects')
    .select('id,subject_id')
    .eq('class_id', classId)
    .eq('academic_year_id', academicYearId)
  const assignmentBySubject = new Map<string, string>()
  for (const ts of tsRows ?? []) {
    if (isRecord(ts) && typeof ts.id === 'string' && typeof ts.subject_id === 'string') assignmentBySubject.set(ts.subject_id, ts.id)
  }

  const assignmentIds = Array.from(assignmentBySubject.values())
  if (assignmentIds.length === 0) return { ok: true, data: { rows: [], assessmentCount: 0 } }

  // Assessment types active
  const { data: assessmentRows } = await client.from('assessment_types').select('id,name,code,weight,is_active').eq('is_active', true)
  const assessments = (assessmentRows ?? []).filter(isRecord) as Array<{ id: string; name: string; code: string; weight: number; is_active: boolean }>
  const validAssessments = assessments.filter(a => typeof a.id === 'string' && typeof a.weight === 'number')
  

  // All grades for these assignments + semester
  const { data: gradeRows } = await client
    .from('grades')
    .select('student_id,teacher_subject_id,assessment_type_id,score,status')
    .eq('semester_id', semesterId)
    .in('teacher_subject_id', assignmentIds)

  // Map subject -> array of {code, weight, score} per student
  // key: `${studentId}|${subjectId}`
  const scoreMap = new Map<string, Array<{ code: string; weight: number; score: number | null }>>()
  for (const g of gradeRows ?? []) {
    if (!isRecord(g)) continue
    const subjectId = [...assignmentBySubject.entries()].find(([, id]) => id === g.teacher_subject_id)?.[0]
    if (!subjectId || typeof g.student_id !== 'string' || typeof g.assessment_type_id !== 'string') continue
    const assessment = validAssessments.find(a => a.id === g.assessment_type_id)
    if (!assessment) continue
    const key = `${g.student_id}|${subjectId}`
    if (!scoreMap.has(key)) scoreMap.set(key, [])
    scoreMap.get(key)?.push({
      code: assessment.code,
      weight: assessment.weight,
      score: typeof g.score === 'number' ? g.score : null,
    })
  }

  // Build rows
  const rows: StudentSummary[] = context.students.map(student => {
    const subjectScores: Record<string, number | null> = {}
    let total = 0
    let average = 0
    let complete = true

    for (const subject of context.subjects) {
      const key = `${student.studentId}|${subject.subjectId}`
      const assessmentsForSubject = scoreMap.get(key) ?? []
      const finalResult = calculateFinalScoreForSubject(assessmentsForSubject)
      subjectScores[subject.subjectId] = finalResult.finalScore
      if (finalResult.finalScore === null) complete = false
    }

    const allFinite = Object.values(subjectScores).filter((score): score is number => typeof score === 'number' && Number.isFinite(score))
    total = calculateTotal(allFinite)
    average = allFinite.length > 0 ? calculateAverage(allFinite) : 0

    return { studentId: student.studentId, nis: student.nis, fullName: student.fullName, subjectScores, total, average, ranking: 0, complete }
  })

  // Competition ranking by average, only among complete students when ranking required
  const rankedScores = rows.map((r, i) => ({ average: r.complete ? r.average : -Infinity, index: i })).sort((a, b) => b.average - a.average)
  
  // calculateRanking returns map by original index of input array; but we pass only averages. Rebuild:
  const ranks: number[] = []
  let position = 1
  rankedScores.forEach((item, index) => {
    if (index > 0 && item.average < rankedScores[index - 1].average) position = index + 1
    ranks[item.index] = position
  })
  rows.forEach((row, i) => { row.ranking = ranks[i] ?? 1 })

  return { ok: true, data: { rows, assessmentCount: validAssessments.length } }
}

function calculateFinalScoreForSubject(
  entries: Array<{ code: string; weight: number; score: number | null }>
): { finalScore: number | null } {
  if (entries.length === 0) return { finalScore: null }
  const composed: Record<string, { score: number; weight: number }> = {}
  for (const e of entries) {
    if (e.score !== null) composed[e.code] = { score: e.score, weight: e.weight }
  }
  if (Object.keys(composed).length === 0) return { finalScore: null }
  return { finalScore: calculateFinalScore(composed) }
}