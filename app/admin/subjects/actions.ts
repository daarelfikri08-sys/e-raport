'use server'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { idSchema, subjectSchema } from '@/validators/admin-master'
import type { CrudResult } from '@/components/admin/CrudManager'
const path = '/admin/subjects'
export async function saveSubject(form: FormData): Promise<CrudResult> {
  await requireRole('admin')
  const parsed = subjectSchema.safeParse(Object.fromEntries(form))
  const rawId = form.get('id'); const id = rawId ? idSchema.safeParse(rawId) : null
  if (!parsed.success || (id && !id.success)) return { ok: false, message: 'Data mata pelajaran tidak valid.' }
  const client = await createClient(); const values = { ...parsed.data, code: parsed.data.code.toUpperCase() }
  const result = id ? await client.from('subjects').update(values).eq('id', id.data).select('id').maybeSingle() : await client.from('subjects').insert(values).select('id').maybeSingle()
  if (result.error || !result.data) return { ok: false, message: 'Mata pelajaran tidak dapat disimpan. Pastikan kode belum digunakan.' }
  revalidatePath(path); return { ok: true, message: 'Mata pelajaran berhasil disimpan.' }
}
export async function setSubjectStatus(idValue: string, active: boolean): Promise<CrudResult> {
  await requireRole('admin'); const id = idSchema.safeParse(idValue); if (!id.success) return { ok: false, message: 'Data tidak valid.' }
  const { data, error } = await (await createClient()).from('subjects').update({ is_active: active }).eq('id', id.data).select('id').maybeSingle()
  if (error || !data) return { ok: false, message: 'Status mata pelajaran tidak dapat diubah.' }; revalidatePath(path); return { ok: true, message: 'Status mata pelajaran berhasil diubah.' }
}
