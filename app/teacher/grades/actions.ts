'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { gradeBatchSchema, submitGradesSchema } from '@/validators/grade'
import type { GradeStatus } from '@/types/database'
import * as XLSX from 'xlsx'

function isObject<T extends Record<string, unknown>>(value: unknown): value is T {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export type GradeActionResult = { ok: true; message: string } | { ok: false; message: string }

const invalid = (): GradeActionResult => ({ ok: false, message: 'Data nilai tidak valid. Periksa kembali input.' })
const failed = (): GradeActionResult => ({ ok: false, message: 'Operasi tidak dapat diproses. Silakan coba lagi.' })

async function resolveTeacherId(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('current_teacher_id')
  return typeof data === 'string' ? data : null
}

async function verifyOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teacherSubjectId: string,
  teacherId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('teacher_subjects')
    .select('id')
    .eq('id', teacherSubjectId)
    .eq('teacher_id', teacherId)
    .maybeSingle()
  return Boolean(data)
}

async function verifyActiveSemester(supabase: Awaited<ReturnType<typeof createClient>>, semesterId: string): Promise<boolean> {
  const { data } = await supabase.from('semesters').select('id').eq('id', semesterId).eq('is_active', true).maybeSingle()
  return Boolean(data)
}

async function getActiveSemesterId(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('semesters').select('id').eq('is_active', true).maybeSingle()
  return data?.id ?? null
}

export async function saveGradeBatch(
  teacherSubjectId: string,
  semesterId: string,
  entries: Array<{ studentId: string; assessmentTypeId: string; score: number }>
): Promise<GradeActionResult> {
  await requireRole('teacher')
  const teacherId = await resolveTeacherId()
  if (!teacherId) return { ok: false, message: 'Data guru tidak ditemukan. Hubungi administrator.' }

  const parsed = gradeBatchSchema.safeParse(
    entries.map(e => ({
      student_id: e.studentId,
      teacher_subject_id: teacherSubjectId,
      assessment_type_id: e.assessmentTypeId,
      semester_id: semesterId,
      score: e.score,
    }))
  )
  if (!parsed.success) return invalid()

  const supabase = await createClient()

  if (!await verifyOwnership(supabase, teacherSubjectId, teacherId)) {
    return { ok: false, message: 'Anda tidak memiliki akses ke penugasan ini.' }
  }

  if (!await verifyActiveSemester(supabase, semesterId)) {
    return { ok: false, message: 'Semester tidak aktif.' }
  }

  const assessmentTypeIds = [...new Set(parsed.data.map(e => e.assessment_type_id))]
  const { data: validTypes } = await supabase
    .from('assessment_types')
    .select('id')
    .eq('is_active', true)
    .in('id', assessmentTypeIds)
  if (!validTypes || validTypes.length !== assessmentTypeIds.length) {
    return { ok: false, message: 'Jenis penilaian tidak valid atau tidak aktif.' }
  }

  const rows = parsed.data.map(e => ({
    student_id: e.student_id,
    teacher_subject_id: e.teacher_subject_id,
    assessment_type_id: e.assessment_type_id,
    semester_id: e.semester_id,
    score: e.score,
    status: 'draft' as const,
  }))

  const { error } = await supabase.from('grades').upsert(rows, { onConflict: 'student_id,teacher_subject_id,assessment_type_id,semester_id' })
  if (error) return failed()

  revalidatePath('/teacher/grades')
  return { ok: true, message: `Berhasil menyimpan ${rows.length} nilai.` }
}

export async function submitGrades(teacherSubjectId: string, semesterId: string): Promise<GradeActionResult> {
  await requireRole('teacher')
  const teacherId = await resolveTeacherId()
  if (!teacherId) return { ok: false, message: 'Data guru tidak ditemukan. Hubungi administrator.' }

  const parsed = submitGradesSchema.safeParse({ teacher_subject_id: teacherSubjectId, semester_id: semesterId })
  if (!parsed.success) return invalid()

  const supabase = await createClient()
  const admin = createAdminClient()

  if (!await verifyOwnership(supabase, teacherSubjectId, teacherId)) {
    return { ok: false, message: 'Anda tidak memiliki akses ke penugasan ini.' }
  }

  if (!await verifyActiveSemester(supabase, semesterId)) {
    return { ok: false, message: 'Semester tidak aktif.' }
  }

  const { data: assignment } = await supabase
    .from('teacher_subjects')
    .select('class_id,academic_year_id')
    .eq('id', teacherSubjectId)
    .maybeSingle()
  if (!assignment) return { ok: false, message: 'Penugasan tidak ditemukan.' }

  const { data: rosterRaw } = await admin
    .from('student_classes')
    .select('student_id')
    .eq('class_id', assignment.class_id)
    .eq('academic_year_id', assignment.academic_year_id)

  const roster = rosterRaw ?? []
  if (roster.length === 0) {
    return { ok: false, message: 'Belum ada siswa di kelas ini.' }
  }

  const { data: assessmentTypes } = await supabase.from('assessment_types').select('id').eq('is_active', true)
  if (!assessmentTypes || assessmentTypes.length === 0) {
    return { ok: false, message: 'Belum ada jenis penilaian yang aktif.' }
  }

  const { data: existingGrades } = await supabase
    .from('grades')
    .select('student_id,assessment_type_id,score,status')
    .eq('teacher_subject_id', teacherSubjectId)
    .eq('semester_id', semesterId)

  const gradeMap = new Map<string, { score: number | null; status: string }>()
  for (const g of existingGrades ?? []) {
    gradeMap.set(`${g.student_id}:${g.assessment_type_id}`, { score: g.score, status: g.status })
  }

  let missingCount = 0
  for (const student of roster) {
    for (const at of assessmentTypes) {
      const entry = gradeMap.get(`${student.student_id}:${at.id}`)
      if (!entry || entry.score === null) missingCount++
    }
  }

  if (missingCount > 0) {
    return { ok: false, message: `Masih ada ${missingCount} nilai yang belum diisi lengkap.` }
  }

  const { data: submission } = await admin
    .from('grade_submissions')
    .select('status')
    .eq('teacher_subject_id', teacherSubjectId)
    .eq('semester_id', semesterId)
    .maybeSingle()
  if (submission && submission.status !== 'draft') {
    return { ok: false, message: 'Nilai sudah diajukan sebelumnya.' }
  }

  const now = new Date().toISOString()
  const { error: gradeUpdateError } = await admin
    .from('grades')
    .update({ status: 'submitted', submitted_at: now })
    .eq('teacher_subject_id', teacherSubjectId)
    .eq('semester_id', semesterId)
    .eq('status', 'draft')
  if (gradeUpdateError) return failed()

  const { error: submissionError } = await admin
    .from('grade_submissions')
    .upsert({
      teacher_subject_id: teacherSubjectId,
      semester_id: semesterId,
      status: 'submitted',
      submitted_by: (await supabase.auth.getUser()).data.user?.id ?? '',
      submitted_at: now,
    }, { onConflict: 'teacher_subject_id,semester_id' })
  if (submissionError) return failed()

  revalidatePath('/teacher/grades')
  return { ok: true, message: 'Nilai berhasil diajukan untuk verifikasi.' }
}

export async function loadAssignmentGradebook(teacherSubjectId: string): Promise<{ ok: boolean; error?: string; roster?: Array<{ student_id: string; full_name: string; nis: string | null; grades: Record<string, number | null> }>; submission?: { status: GradeStatus; submitted_at: string | null } | null; semesterId?: string }> {
  const teacherId = await resolveTeacherId()
  if (!teacherId) return { ok: false, error: 'Data guru tidak ditemukan.' }

  const supabase = await createClient()
  const admin = createAdminClient()

  if (!await verifyOwnership(supabase, teacherSubjectId, teacherId)) {
    return { ok: false, error: 'Anda tidak memiliki akses ke penugasan ini.' }
  }

  const semesterId = await getActiveSemesterId()
  if (!semesterId) return { ok: false, error: 'Belum ada semester aktif.' }

  const { data: assignment } = await supabase
    .from('teacher_subjects')
    .select('class_id,academic_year_id')
    .eq('id', teacherSubjectId)
    .maybeSingle()
  if (!assignment) return { ok: false, error: 'Penugasan tidak ditemukan.' }

  const { data: rosterRaw } = await admin
    .from('student_classes')
    .select('student_id,students(id,full_name,nis)')
    .eq('class_id', assignment.class_id)
    .eq('academic_year_id', assignment.academic_year_id)
    .order('students.full_name')

  const rosterTyped = (rosterRaw ?? []) as unknown as Array<{ student_id: string; students: { id: string; full_name: string | null; nis: string | null } | null }>
  if (rosterTyped.length === 0) return { ok: false, error: 'Data siswa tidak dapat dimuat.' }

  const { data: gradesRaw } = await supabase
    .from('grades')
    .select('student_id,assessment_type_id,score')
    .eq('teacher_subject_id', teacherSubjectId)
    .eq('semester_id', semesterId)

  const gradesTyped = (gradesRaw ?? []) as unknown as Array<{ student_id: string; assessment_type_id: string; score: number | null }>
  const gradesMap: Record<string, Record<string, number | null>> = {}
  for (const g of gradesTyped) {
    if (!gradesMap[g.student_id]) gradesMap[g.student_id] = {}
    gradesMap[g.student_id][g.assessment_type_id] = g.score
  }

  const { data: submission } = await admin
    .from('grade_submissions')
    .select('status,submitted_at')
    .eq('teacher_subject_id', teacherSubjectId)
    .eq('semester_id', semesterId)
    .maybeSingle()

  return {
    ok: true,
    semesterId,
    roster: rosterTyped.map(sc => ({
      student_id: sc.student_id,
      full_name: sc.students?.full_name ?? '',
      nis: sc.students?.nis ?? null,
      grades: gradesMap[sc.student_id] ?? {},
    })),
    submission: submission ? { status: submission.status, submitted_at: submission.submitted_at } : null,
  }
}

// ---------- Excel Export Functionality ----------

interface ExportRow {
  'No': number
  'NISN': string
  'Nama Siswa': string
  [assessmentName: string]: number | string
}

export async function exportGradesToExcel(teacherSubjectId: string, semesterId: string): Promise<{ ok: boolean; error?: string; blob?: Blob; filename?: string }> {
  await requireRole('teacher')
  const teacherId = await resolveTeacherId()
  if (!teacherId) return { ok: false, error: 'Data guru tidak ditemukan.' }

  const supabase = await createClient()
  const admin = createAdminClient()

  if (!await verifyOwnership(supabase, teacherSubjectId, teacherId)) {
    return { ok: false, error: 'Anda tidak memiliki akses ke penugasan ini.' }
  }

  if (!await verifyActiveSemester(supabase, semesterId)) {
    return { ok: false, error: 'Semester tidak aktif.' }
  }

  const { data: assignment } = await supabase
    .from('teacher_subjects')
    .select('class_id,academic_year_id,subject_id')
    .eq('id', teacherSubjectId)
    .maybeSingle()
  
  if (!assignment) return { ok: false, error: 'Penugasan tidak ditemukan.' }

  // Get student roster via admin client (RLS restriction)
  const { data: rosterRaw } = await admin
    .from('student_classes')
    .select('student_id,students(id,nisn,full_name)')
    .eq('class_id', assignment.class_id)
    .eq('academic_year_id', assignment.academic_year_id)
    .order('students.full_name')

  if (!rosterRaw || rosterRaw.length === 0) {
    return { ok: false, error: 'Tidak ada siswa di kelas ini.' }
  }

  // Validate students have required fields
  interface ValidatedStudent {
    student_id: string
    nisn: string | null
    full_name: string
  }
  
  const validatedStudents: ValidatedStudent[] = []
  const rosterTyped = rosterRaw ?? []
  for (const row of rosterTyped) {
    if (!isObject(row)) continue
    
    // Row structure from Supabase join
    const studentData = row as Record<string, unknown>
    const studentsData = studentData.students as Record<string, unknown> | null | undefined
    
    if (!studentsData || !isObject(studentsData)) continue
    
    if (typeof studentsData.id !== 'string' || typeof studentsData.full_name !== 'string') continue
    
    validatedStudents.push({
      student_id: typeof studentData.student_id === 'string' ? studentData.student_id : '',
      nisn: (typeof studentsData.nisn === 'string' || studentsData.nisn === null) ? studentsData.nisn : null,
      full_name: studentsData.full_name,
    })
  }

  // Get assessment types
  const { data: assessmentTypes } = await supabase
    .from('assessment_types')
    .select('id,name,code')
    .eq('is_active', true)
  
  if (!assessmentTypes || assessmentTypes.length === 0) {
    return { ok: false, error: 'Belum ada jenis penilaian aktif.' }
  }

  // Get grades
  const { data: gradesRaw } = await supabase
    .from('grades')
    .select('student_id,assessment_type_id,score')
    .eq('teacher_subject_id', teacherSubjectId)
    .eq('semester_id', semesterId)

  // Build grades map: student_id -> assessment_type_id -> score
  const gradesMap = new Map<string, Map<string, number | null>>()
  for (const g of gradesRaw ?? []) {
    if (!gradesMap.has(g.student_id)) gradesMap.set(g.student_id, new Map())
    gradesMap.get(g.student_id)?.set(g.assessment_type_id, g.score)
  }

  // Build export rows
  const rows: ExportRow[] = []
  for (let idx = 0; idx < validatedStudents.length; idx++) {
    const student = validatedStudents[idx]
    const studentGrades = gradesMap.get(student.student_id) ?? new Map()
    
    const row: ExportRow = {
      'No': idx + 1,
      'NISN': String(student.nisn ?? '-'),
      'Nama Siswa': student.full_name,
    }
    
    // Add assessment columns
    for (const at of assessmentTypes) {
      row[at.name] = studentGrades.get(at.id) ?? '-'
    }
    
    rows.push(row)
  }

  // Create workbook
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Nilai Siswa')

  // Generate buffer
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })

  // Return as Response for download
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const filename = `Nilai-${assignment.subject_id}-${assignment.class_id}.xlsx`
  
  return { ok: true, blob, filename }
}

// ---------- Import Functionality ----------

export async function importGradesFromExcel(
  teacherSubjectId: string,
  semesterId: string,
  file: File
): Promise<GradeActionResult> {
  await requireRole('teacher')
  const teacherId = await resolveTeacherId()
  if (!teacherId) return { ok: false, message: 'Data guru tidak ditemukan.' }

  // Validate file
  if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
    return { ok: false, message: 'Format file tidak valid. Gunakan .xlsx atau .xls' }
  }

  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, message: 'Ukuran file terlalu besar (maksimal 10MB)' }
  }

  const supabase = await createClient()
  const admin = createAdminClient()

  if (!await verifyOwnership(supabase, teacherSubjectId, teacherId)) {
    return { ok: false, message: 'Anda tidak memiliki akses ke penugasan ini.' }
  }

  if (!await verifyActiveSemester(supabase, semesterId)) {
    return { ok: false, message: 'Semester tidak aktif.' }
  }

  // Read file
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    return { ok: false, message: 'File Excel kosong.' }
  }

  // Read first sheet
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[]

  if (jsonData.length === 0) {
    return { ok: false, message: 'Tidak ada data dalam file Excel.' }
  }

  // Identify column headers (case-insensitive)
  const firstRow = jsonData[0]
  const headerKeys = Object.keys(firstRow)
  
  const noIndex = headerKeys.findIndex(k => /\b(no|\d+)\b/i.test(k))
  const nisIndex = headerKeys.findIndex(k => /\bnisn\b/i.test(k))
  const nameIndex = headerKeys.findIndex(k => /\b(nama|nama siswa)\b/i.test(k))
  
  if (noIndex === -1 || nisIndex === -1 || nameIndex === -1) {
    return { ok: false, message: 'Header file tidak valid. Pastikan kolom "No", "NISN", dan "Nama Siswa" tersedia.' }
  }

  // Get assessment type IDs and names
  const { data: assessmentTypes } = await supabase
    .from('assessment_types')
    .select('id,name,code')
    .eq('is_active', true)
  
  if (!assessmentTypes || assessmentTypes.length === 0) {
    return { ok: false, message: 'Belum ada jenis penilaian aktif.' }
  }

  // Get current submission status
  const { data: submission } = await admin
    .from('grade_submissions')
    .select('status')
    .eq('teacher_subject_id', teacherSubjectId)
    .eq('semester_id', semesterId)
    .maybeSingle()

  if (submission && submission.status !== 'draft') {
    return { ok: false, message: `Tidak dapat mengimpor karena status adalah "${getStatusLabel(submission.status)}". Hubungi administrator.` }
  }

  // Get class info for roster lookup
  const { data: assignment } = await supabase
    .from('teacher_subjects')
    .select('class_id,academic_year_id')
    .eq('id', teacherSubjectId)
    .maybeSingle()
  
  if (!assignment) return { ok: false, message: 'Penugasan tidak ditemukan.' }

  // Get all students in class via admin client
  const { data: rosterRaw } = await admin
    .from('student_classes')
    .select('student_id,students(id,nisn)')
    .eq('class_id', assignment.class_id)
    .eq('academic_year_id', assignment.academic_year_id)
  
  if (!rosterRaw || rosterRaw.length === 0) {
    return { ok: false, message: 'Tidak ada siswa di kelas ini.' }
  }

  // Build NISN -> student_id map
  const nisnToStudentId = new Map<string, string>()
  const rosterImportTyped = rosterRaw ?? []
  if (Array.isArray(rosterImportTyped)) {
    for (const row of rosterImportTyped) {
      if (!isObject(row)) continue
      
      const rowData = row as Record<string, unknown>
      const studentsData = rowData.students as Record<string, unknown> | null | undefined
      
      if (!studentsData || !isObject(studentsData)) continue
      
      if (typeof studentsData.nisn === 'string' && typeof rowData.student_id === 'string') {
        nisnToStudentId.set(studentsData.nisn.trim().toLowerCase(), rowData.student_id)
      }
    }
  }

  // Parse and validate import rows
  const entriesToUpsert: Array<{ student_id: string; assessment_type_id: string; score: number }> = []
  const errors: Array<{ row: number; reason: string; nisn?: string; name?: string }> = []

  for (let rowIndex = 0; rowIndex < jsonData.length; rowIndex++) {
    const rowData = jsonData[rowIndex]
    const nisnVal = rowData[headerKeys[nisIndex]]
    const nameVal = rowData[headerKeys[nameIndex]]
    const rowNumber = rowIndex + 2 // 1-indexed starting after header
    
    if (!nisnVal || typeof nisnVal !== 'string') {
      // Try to convert from number
      const convertedNisn = typeof nisnVal === 'number' ? String(nisnVal) : null
      if (!convertedNisn) {
        errors.push({ row: rowNumber, reason: 'NISN kosong', nisn: String(nisnVal), name: String(nameVal ?? '') })
        continue
      }
    }
    
    const studentId = nisnToStudentId.get((typeof nisnVal === 'string' ? nisnVal : String(nisnVal)).trim().toLowerCase())
    if (!studentId) {
      const nisnStr = typeof nisnVal === 'string' ? nisnVal : (nisnVal?.toString() ?? '')
      const nameStr = typeof nameVal === 'string' ? nameVal : ''
      errors.push({ row: rowNumber, reason: 'NISN tidak terdaftar', nisn: nisnStr, name: nameStr })
      continue
    }

    // Process assessment columns (all columns except No, NISN, Nama Siswa)
    const processedKeys = new Set([noIndex, nisIndex, nameIndex])
    for (const [colIdx, colKey] of headerKeys.entries()) {
      if (processedKeys.has(colIdx)) continue

      // Match against assessment type names
      const matchingAt = assessmentTypes.find(at => 
        new RegExp(`\\b${at.name}\\b`, 'i').test(colKey)
      )

      if (!matchingAt) continue // Skip unrecognized columns
      
      const scoreVal = rowData[colKey]
      if (scoreVal === null || scoreVal === undefined || scoreVal === '' || scoreVal === '-') {
        continue // Skip empty scores (keep existing or leave blank)
      }

      const scoreNum = Number(scoreVal)
      if (!Number.isFinite(scoreNum) || scoreNum < 0 || scoreNum > 100) {
        errors.push({ row: rowNumber, reason: 'Nilai tidak valid (0-100)', nisn: String(nisnVal), name: String(nameVal) })
        continue
      }

      entriesToUpsert.push({
        student_id: studentId,
        assessment_type_id: matchingAt.id,
        score: scoreNum,
      })
    }
  }

  if (entriesToUpsert.length === 0) {
    return { ok: false, message: errors.length > 0 
      ? `Baris pertama yang valid: ${errors[0].reason}. ${errors.length} baris lainnya akan diabaikan.` 
      : 'Tidak ada data nilai yang dapat diimpor.' }
  }

  // Upsert all entries
  const rows = entriesToUpsert.map(e => ({
    student_id: e.student_id,
    teacher_subject_id: teacherSubjectId,
    assessment_type_id: e.assessment_type_id,
    semester_id: semesterId,
    score: e.score,
    status: 'draft' as const,
  }))

  const { error } = await supabase
    .from('grades')
    .upsert(rows, { onConflict: 'student_id,teacher_subject_id,assessment_type_id,semester_id' })

  if (error) {
    console.error('Import failed:', error)
    return { ok: false, message: `Gagal menyimpan nilai: ${error.message}` }
  }

  revalidatePath('/teacher/grades')
  
  const successMessage = `${entriesToUpsert.length} nilai berhasil diimpor. ${errors.length} baris diabaikan dengan alasan berikut:`
  
  if (errors.length > 0) {
    const uniqueErrors = Array.from(new Set(errors.map(e => e.reason)))
    return { ok: true, message: `${successMessage} ${uniqueErrors.join(', ')}` }
  }

  return { ok: true, message: successMessage }
}

function getStatusLabel(status: GradeStatus): string {
  switch (status) {
    case 'draft': return 'Draft'
    case 'submitted': return 'Terkirim'
    case 'verified': return 'Terverifikasi'
    case 'locked': return 'Terkunci'
    default: return status
  }
}
