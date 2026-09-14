/** Schema declared by supabase/migrations/001_initial_schema.sql. Database scalar values
 * (uuid, date, timestamptz and numeric) use the representation returned by supabase-js. */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
export type AppRole = 'admin' | 'teacher' | 'homeroom_teacher'
export type SemesterType = 'ganjil' | 'genap'
export type GradeStatus = 'draft' | 'submitted' | 'verified' | 'locked'
export type GenderType = 'L' | 'P'

export interface SchoolSettings { id: string; school_name: string; school_npsn: string | null; school_address: string | null; school_phone: string | null; school_email: string | null; school_website: string | null; principal_name: string | null; principal_nip: string | null; logo_url: string | null; ranking_enabled: boolean; created_at: string; updated_at: string }
export interface AcademicYear { id: string; name: string; start_date: string | null; end_date: string | null; is_active: boolean; created_at: string; updated_at: string }
export interface Semester { id: string; academic_year_id: string; name: SemesterType; is_active: boolean; created_at: string }
export interface Profile { id: string; full_name: string; role: AppRole; avatar_url: string | null; is_active: boolean; created_at: string; updated_at: string }
export interface Teacher { id: string; profile_id: string | null; nip: string | null; nuptk: string | null; full_name: string; email: string | null; phone: string | null; is_active: boolean; created_at: string; updated_at: string }
export interface Student { id: string; nis: string | null; nisn: string | null; full_name: string; gender: GenderType | null; birth_place: string | null; birth_date: string | null; nik: string | null; address: string | null; father_name: string | null; mother_name: string | null; phone: string | null; is_active: boolean; created_at: string; updated_at: string }
export interface Class { id: string; name: string; grade_level: number; homeroom_teacher_id: string | null; created_at: string; updated_at: string }
export interface StudentClass { id: string; student_id: string; class_id: string; academic_year_id: string; created_at: string }
export interface Subject { id: string; code: string | null; name: string; group_name: string | null; minimum_score: number | null; is_active: boolean; created_at: string; updated_at: string }
export interface TeacherSubject { id: string; teacher_id: string; subject_id: string; class_id: string; academic_year_id: string; created_at: string }
export interface AssessmentType { id: string; name: string; code: string; weight: number; is_active: boolean; created_at: string }
export interface Grade { id: string; student_id: string; teacher_subject_id: string; assessment_type_id: string; semester_id: string; score: number | null; notes: string | null; status: GradeStatus; submitted_at: string | null; verified_at: string | null; locked_at: string | null; created_at: string; updated_at: string }
export interface GradeSubmission { id: string; teacher_subject_id: string; semester_id: string; status: GradeStatus; submitted_by: string | null; submitted_at: string | null; verified_by: string | null; verified_at: string | null; locked_by: string | null; locked_at: string | null; created_at: string; updated_at: string }
export interface ReportCard { id: string; student_id: string; class_id: string; semester_id: string; total_score: number | null; average_score: number | null; ranking: number | null; homeroom_note: string | null; status: string; generated_at: string | null; created_at: string; updated_at: string }
export interface Attendance { id: string; student_id: string; semester_id: string; sick: number; permission: number; absent: number; notes: string | null; created_at: string; updated_at: string }
export interface Extracurricular { id: string; name: string; description: string | null; is_active: boolean; created_at: string }
export interface StudentExtracurricular { id: string; student_id: string; extracurricular_id: string; semester_id: string; score: number | null; description: string | null; created_at: string }
export interface Achievement { id: string; student_id: string; semester_id: string; title: string; level: string | null; description: string | null; created_at: string }
export interface BehaviorRecord { id: string; student_id: string; semester_id: string; category: string | null; description: string | null; score: number | null; created_at: string }
export interface AuditLog { id: string; user_id: string | null; action: string; table_name: string | null; record_id: string | null; old_data: Json | null; new_data: Json | null; created_at: string }

export interface PublicTableRows {
  school_settings: SchoolSettings; academic_years: AcademicYear; semesters: Semester; profiles: Profile
  teachers: Teacher; students: Student; classes: Class; student_classes: StudentClass; subjects: Subject
  teacher_subjects: TeacherSubject; assessment_types: AssessmentType; grades: Grade
  grade_submissions: GradeSubmission; report_cards: ReportCard; attendance: Attendance
  extracurriculars: Extracurricular; student_extracurriculars: StudentExtracurricular
  achievements: Achievement; behavior_records: BehaviorRecord; audit_logs: AuditLog
}
export type PublicTableName = keyof PublicTableRows
export type RowOf<T extends PublicTableName> = PublicTableRows[T]

/** Submission snapshot for grade submission workflow */
export interface SubmissionSnapshot {
  status: GradeStatus
  submitted_at: string | null
}
