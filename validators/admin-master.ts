import { z } from 'zod'
const optional = z.string().trim().max(500).transform(value => value || null)
export const idSchema = z.string().uuid()
export const subjectSchema = z.object({ code: z.string().trim().min(1).max(30), name: z.string().trim().min(1).max(200), group_name: optional, minimum_score: z.coerce.number().finite().min(0).max(100) })
export const assessmentSchema = z.object({ name: z.string().trim().min(1).max(100), code: z.string().trim().min(1).max(30), weight: z.coerce.number().finite().positive().max(100) })
export const assignmentSchema = z.object({ teacher_id: idSchema, subject_id: idSchema, class_id: idSchema, academic_year_id: idSchema })
export const settingsSchema = z.object({ school_name: z.string().trim().min(1).max(200), school_npsn: optional, school_address: optional, school_phone: optional, school_email: z.union([z.literal(''), z.string().trim().email()]).transform(value => value || null), school_website: z.union([z.literal(''), z.string().trim().url()]).transform(value => value || null), principal_name: optional, principal_nip: optional, logo_url: z.union([z.literal(''), z.string().trim().url()]).transform(value => value || null), ranking_enabled: z.boolean() })

const excelText = z.string().trim().max(500).transform(value => value || null)

/** Baris import siswa dari Excel. NIS wajib; field lain opsional tetapi divalidasi. */
export const studentImportSchema = z.object({
  NIS: z.string().trim().min(1, 'NIS wajib diisi.').max(50),
  NISN: z.union([z.literal(''), z.string().trim().regex(/^\d{10}$/, 'NISN harus tepat 10 digit.')]).transform(value => value || null),
  'Nama Lengkap': z.string().trim().min(1, 'Nama lengkap wajib diisi.').max(200),
  'Jenis Kelamin (L/P)': z.union([z.literal(''), z.enum(['L', 'P'])]).transform(value => value || null),
  'Tempat Lahir': excelText,
  'Tanggal Lahir (YYYY-MM-DD)': z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal lahir harus YYYY-MM-DD.')]).transform(value => value || null),
  NIK: excelText,
  Alamat: excelText,
  'Nama Ayah': excelText,
  'Nama Ibu': excelText,
  Telepon: excelText,
})

/** Baris export siswa ke Excel (snake_case dari database). */
export const studentExportSchema = z.object({
  nis: z.union([z.string(), z.null()]),
  nisn: z.union([z.string(), z.null()]).nullable(),
  full_name: z.string(),
  gender: z.union([z.literal('L'), z.literal('P'), z.null()]).nullable(),
  birth_place: z.union([z.string(), z.null()]).nullable(),
  birth_date: z.union([z.string(), z.null()]).nullable(),
  nik: z.union([z.string(), z.null()]).nullable(),
  address: z.union([z.string(), z.null()]).nullable(),
  father_name: z.union([z.string(), z.null()]).nullable(),
  mother_name: z.union([z.string(), z.null()]).nullable(),
  phone: z.union([z.string(), z.null()]).nullable(),
  is_active: z.union([z.boolean(), z.null()]).nullable(),
})
