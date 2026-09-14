import { z } from 'zod'
export const classSchema = z.object({
  name: z.string().trim().min(1, 'Nama kelas wajib diisi.').max(100, 'Maksimal 100 karakter.'),
  grade_level: z.number().int('Tingkat harus bilangan bulat.').min(1, 'Tingkat minimal 1.').max(12, 'Tingkat maksimal 12.'),
  homeroom_teacher_id: z.string().uuid('Wali kelas tidak valid.').nullable(),
}).strict()
export type ClassInput = z.infer<typeof classSchema>
