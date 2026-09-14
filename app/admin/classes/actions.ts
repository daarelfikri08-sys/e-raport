'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireRole } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { classSchema, type ClassInput } from '@/validators/class'
import { persistClass, removeClass } from '@/services/classes.service'

export type ClassActionResult = { ok: true; message: string } | { ok: false; message: string }
const idSchema = z.string().uuid()

export async function saveClass(id: string | null, input: ClassInput): Promise<ClassActionResult> {
  await requireRole('admin')
  const parsedId = id === null ? null : idSchema.safeParse(id)
  const parsed = classSchema.safeParse(input)
  if (!parsed.success || (parsedId !== null && !parsedId.success)) return { ok: false, message: 'Data kelas tidak valid.' }
  const result = await persistClass(await createClient(), parsedId === null ? null : parsedId.data, parsed.data)
  if (!result.ok) return { ok: false, message: result.message }
  revalidatePath('/admin/classes')
  return { ok: true, message: id === null ? 'Kelas berhasil ditambahkan.' : 'Kelas berhasil diperbarui.' }
}

export async function deleteClass(id: string): Promise<ClassActionResult> {
  await requireRole('admin')
  const parsed = idSchema.safeParse(id)
  if (!parsed.success) return { ok: false, message: 'Kelas tidak valid.' }
  const result = await removeClass(await createClient(), parsed.data)
  if (!result.ok) return { ok: false, message: result.message }
  revalidatePath('/admin/classes')
  return { ok: true, message: 'Kelas berhasil dihapus.' }
}
