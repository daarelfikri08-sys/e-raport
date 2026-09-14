import { z } from 'zod'

// Single grade entry schema (0-100)
export const gradeEntrySchema = z.object({
  student_id: z.string().uuid(),
  teacher_subject_id: z.string().uuid(),
  assessment_type_id: z.string().uuid(),
  semester_id: z.string().uuid(),
  score: z.coerce.number().min(0, 'Nilai minimal 0').max(100, 'Nilai maksimal 100'),
})

export type GradeEntryInput = z.infer<typeof gradeEntrySchema>

// Batch of entries
export const gradeBatchSchema = z.array(gradeEntrySchema).min(1, 'Tidak ada nilai untuk disimpan')

export type GradeBatchInput = z.infer<typeof gradeBatchSchema>

// Submit grades payload
export const submitGradesSchema = z.object({
  teacher_subject_id: z.string().uuid(),
  semester_id: z.string().uuid(),
})

export type SubmitGradesInput = z.infer<typeof submitGradesSchema>
