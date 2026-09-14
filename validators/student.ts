import { z } from 'zod'
const optionalText = z.string().trim().max(500).nullable().optional()
export const studentSchema = z.object({
  nis: z.string().trim().min(1, 'NIS wajib diisi.').max(50), nisn: z.string().trim().regex(/^\d{10}$/, 'NISN harus tepat 10 digit.').nullable().optional(), full_name: z.string().trim().min(1).max(200), gender: z.enum(['L', 'P']).nullable().optional(),
  birth_place: optionalText, birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), nik: optionalText, address: optionalText,
  father_name: optionalText, mother_name: optionalText, phone: optionalText, is_active: z.boolean().optional(),
}).strict()
export type StudentInput = z.infer<typeof studentSchema>
