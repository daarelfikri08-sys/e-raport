import { z } from 'zod'

const dateField = z.string().trim().refine((value) => {
  if (value === '') return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}, 'Tanggal tidak valid.')

export const academicYearSchema = z.object({
  name: z.string().trim().regex(/^\d{4}\/\d{4}$/, 'Gunakan format YYYY/YYYY.'),
  start_date: dateField,
  end_date: dateField,
}).superRefine((value, context) => {
  const [firstYear, secondYear] = value.name.split('/').map(Number)
  if (secondYear !== firstYear + 1) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['name'], message: 'Tahun kedua harus satu tahun setelah tahun pertama.' })
  }
  if (value.start_date && value.end_date && value.start_date > value.end_date) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['end_date'], message: 'Tanggal selesai tidak boleh sebelum tanggal mulai.' })
  }
})

export const semesterSchema = z.object({
  academic_year_id: z.string().uuid('Tahun akademik tidak valid.'),
  name: z.enum(['ganjil', 'genap'], { required_error: 'Semester wajib dipilih.' }),
})

export const recordIdSchema = z.string().uuid('Data tidak valid.')

export type AcademicYearInput = z.infer<typeof academicYearSchema>
export type SemesterInput = z.infer<typeof semesterSchema>
