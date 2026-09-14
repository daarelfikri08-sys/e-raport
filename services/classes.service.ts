import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { ClassInput } from '@/validators/class'

export const CLASS_PAGE_SIZE = 20
const rowSchema = z.object({
  id: z.string().uuid(), name: z.string(), grade_level: z.number(),
  homeroom_teacher_id: z.string().uuid().nullable(),
  homeroom: z.object({ full_name: z.string() }).nullable(),
})
const teacherSchema = z.object({ id: z.string().uuid(), full_name: z.string() })
export type ClassRow = z.infer<typeof rowSchema>
export type HomeroomChoice = z.infer<typeof teacherSchema>
export type ClassResult<T> = { ok: true; data: T } | { ok: false; message: string }
const failed = (): { ok: false; message: string } => ({ ok: false, message: 'Data kelas tidak dapat diproses. Silakan coba lagi.' })

export function parseClassQuery(params: { q?: string | string[]; page?: string | string[] }) {
  const search = typeof params.q === 'string' ? params.q.trim().slice(0, 100) : ''
  const page = typeof params.page === 'string' && /^[1-9]\d{0,6}$/.test(params.page) ? Number(params.page) : 1
  return { search, page }
}

export async function listClasses(client: SupabaseClient, search: string, requestedPage: number): Promise<ClassResult<{ rows: ClassRow[]; count: number; page: number }>> {
  try {
    // Escape LIKE metacharacters: search is a literal name substring, not a filter expression.
    const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`
    const countResult = await client.from('classes').select('id', { count: 'exact', head: true }).ilike('name', pattern)
    if (countResult.error || countResult.count === null) return failed()
    const count = countResult.count
    const page = Math.min(Math.max(1, requestedPage), Math.max(1, Math.ceil(count / CLASS_PAGE_SIZE)))
    const { data, error } = await client.from('classes')
      .select('id,name,grade_level,homeroom_teacher_id,homeroom:teachers!classes_homeroom_teacher_id_fkey(full_name)')
      .ilike('name', pattern).order('name').order('id').range((page - 1) * CLASS_PAGE_SIZE, page * CLASS_PAGE_SIZE - 1)
    const parsed = z.array(rowSchema).safeParse(data)
    return error || !parsed.success ? failed() : { ok: true, data: { rows: parsed.data, count, page } }
  } catch { return failed() }
}

export async function listHomeroomChoices(client: SupabaseClient): Promise<ClassResult<HomeroomChoice[]>> {
  try {
    // Fetch all eligible choices in bounded batches, avoiding Supabase's default row cap.
    const choices: HomeroomChoice[] = []
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await client.from('teachers').select('id,full_name,profiles!inner(id)')
        .eq('is_active', true).eq('profiles.is_active', true).eq('profiles.role', 'homeroom_teacher')
        .order('full_name').order('id').range(offset, offset + 499)
      const parsed = z.array(teacherSchema).safeParse(data)
      if (error || !parsed.success) return failed()
      choices.push(...parsed.data)
      if (parsed.data.length < 500) return { ok: true, data: choices }
    }
  } catch { return failed() }
}

export async function persistClass(client: SupabaseClient, id: string | null, values: ClassInput): Promise<ClassResult<string>> {
  try {
    const query = id ? client.from('classes').update(values).eq('id', id) : client.from('classes').insert(values)
    const { data, error } = await query.select('id').maybeSingle()
    return error || !data || typeof data.id !== 'string' ? failed() : { ok: true, data: data.id }
  } catch { return failed() }
}

export async function removeClass(client: SupabaseClient, id: string): Promise<ClassResult<string>> {
  try {
    const { data, error } = await client.from('classes').delete().eq('id', id).select('id').maybeSingle()
    if (error || !data || typeof data.id !== 'string') return { ok: false, message: 'Kelas tidak dapat dihapus. Kelas mungkin masih digunakan atau sudah tidak tersedia.' }
    return { ok: true, data: data.id }
  } catch { return failed() }
}
