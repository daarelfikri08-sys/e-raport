import { z } from 'zod'
const optionalText = z.string().trim().max(200).nullable().optional()
export const teacherSchema = z.object({
  profile_id: z.string().uuid().nullable().optional(), nip: optionalText, nuptk: optionalText,
  full_name: z.string().trim().min(1).max(200), email: z.string().trim().email().nullable().optional().or(z.literal('')), phone: optionalText, is_active: z.boolean().optional(),
}).strict()
export type TeacherInput = z.infer<typeof teacherSchema>
