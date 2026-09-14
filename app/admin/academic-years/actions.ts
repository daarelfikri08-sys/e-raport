'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { academicYearSchema, recordIdSchema, semesterSchema } from '@/validators/academic-year'

export type AcademicPeriodActionResult = { ok: true; message: string } | { ok: false; message: string }
const PATH = '/admin/academic-years'
const invalid = (): AcademicPeriodActionResult => ({ ok: false, message: 'Data yang dikirim tidak valid. Periksa kembali formulir.' })
const failed = (): AcademicPeriodActionResult => ({ ok: false, message: 'Operasi tidak dapat diproses. Silakan coba lagi.' })

async function adminClient() {
  await requireRole('admin')
  return createClient()
}

export async function saveAcademicYear(formData: FormData): Promise<AcademicPeriodActionResult> {
  const parsed = academicYearSchema.safeParse({ name: formData.get('name'), start_date: formData.get('start_date'), end_date: formData.get('end_date') })
  const rawId = formData.get('id')
  const id = rawId === null || rawId === '' ? null : recordIdSchema.safeParse(rawId)
  if (!parsed.success || (id !== null && !id.success)) return invalid()
  const client = await adminClient()
  const values = { name: parsed.data.name, start_date: parsed.data.start_date || null, end_date: parsed.data.end_date || null }
  try {
    const result = id === null
      ? await client.from('academic_years').insert(values)
      : await client.from('academic_years').update(values).eq('id', id.data)
    if (result.error) return failed()
    revalidatePath(PATH)
    return { ok: true, message: id === null ? 'Tahun akademik berhasil ditambahkan.' : 'Tahun akademik berhasil diperbarui.' }
  } catch { return failed() }
}

export async function saveSemester(formData: FormData): Promise<AcademicPeriodActionResult> {
  const parsed = semesterSchema.safeParse({ academic_year_id: formData.get('academic_year_id'), name: formData.get('name') })
  const rawId = formData.get('id')
  const id = rawId === null || rawId === '' ? null : recordIdSchema.safeParse(rawId)
  if (!parsed.success || (id !== null && !id.success)) return invalid()
  const client = await adminClient()
  try {
    const result = id === null
      ? await client.from('semesters').insert(parsed.data)
      : await client.from('semesters').update(parsed.data).eq('id', id.data)
    if (result.error) return failed()
    revalidatePath(PATH)
    return { ok: true, message: id === null ? 'Semester berhasil ditambahkan.' : 'Semester berhasil diperbarui.' }
  } catch { return failed() }
}

export async function deleteAcademicYear(formData: FormData): Promise<AcademicPeriodActionResult> {
  const id = recordIdSchema.safeParse(formData.get('id'))
  if (!id.success) return invalid()
  const client = await adminClient()
  try {
    const { error, count } = await client.from('academic_years').delete({ count: 'exact' }).eq('id', id.data)
    if (error) {
      // Extract readable reason from database guard trigger
      const reason = error.message.includes('active academic year')
        ? 'Tahun ajaran sedang aktif. Nonaktifkan dulu dengan mengaktifkan periode lain.'
        : error.message.includes('has semesters')
          ? 'Tahun ajaran masih memiliki semester. Hapus semua semester di tahun ini terlebih dahulu.'
          : error.message.includes('student enrollment')
            ? 'Tahun ajaran memiliki riwayat penempatan siswa dan tidak dapat dihapus.'
            : error.message.includes('teacher assignments')
              ? 'Tahun ajaran memiliki penugasan guru dan tidak dapat dihapus.'
              : 'Tahun ajaran tidak dapat dihapus karena masih memiliki data terkait.'
      return { ok: false, message: reason }
    }
    if (count === 0) return { ok: false, message: 'Tahun ajaran tidak ditemukan.' }
    revalidatePath(PATH)
    return { ok: true, message: 'Tahun ajaran berhasil dihapus.' }
  } catch { return failed() }
}

export async function deleteSemester(formData: FormData): Promise<AcademicPeriodActionResult> {
  const id = recordIdSchema.safeParse(formData.get('id'))
  if (!id.success) return invalid()
  const client = await adminClient()
  try {
    const { error, count } = await client.from('semesters').delete({ count: 'exact' }).eq('id', id.data)
    if (error) {
      const reason = error.message.includes('active semester')
        ? 'Semester sedang aktif. Aktifkan semester lain terlebih dahulu.'
        : 'Semester tidak dapat dihapus karena masih memiliki data terkait (nilai, rapor, atau kehadiran).'
      return { ok: false, message: reason }
    }
    if (count === 0) return { ok: false, message: 'Semester tidak ditemukan.' }
    revalidatePath(PATH)
    return { ok: true, message: 'Semester berhasil dihapus.' }
  } catch { return failed() }
}

export async function activateAcademicPeriod(formData: FormData): Promise<AcademicPeriodActionResult> {
  const yearId = recordIdSchema.safeParse(formData.get('academic_year_id'))
  const rawSemesterId = formData.get('semester_id')
  const semesterId = rawSemesterId === null || rawSemesterId === '' ? null : recordIdSchema.safeParse(rawSemesterId)
  if (!yearId.success || (semesterId !== null && !semesterId.success)) return invalid()
  const client = await adminClient()
  try {
    const { error } = await client.rpc('set_active_academic_period', {
      target_year: yearId.data,
      target_semester: semesterId === null ? null : semesterId.data,
    })
    if (error) return failed()
    revalidatePath(PATH)
    return { ok: true, message: semesterId === null ? 'Tahun akademik berhasil diaktifkan.' : 'Periode akademik berhasil diaktifkan.' }
  } catch { return failed() }
}
