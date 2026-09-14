import type { Attendance, Grade, ReportCard, Student } from './database'
export interface ReportSubjectResult { subjectId: string; subjectName: string; finalScore: number | null; grades: readonly Grade[] }
export interface StudentReport { student: Student; reportCard: ReportCard; attendance: Attendance | null; subjects: readonly ReportSubjectResult[] }
export interface GradeProgress { completed: number; total: number; percentage: number }
