'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import { studentImportSchema, studentExportSchema } from '@/validators/admin-master'

export type StudentImportResult =
  | { ok: true; message: string; imported: number; failed: number; errors: Array<{ row: number; message: string }> }
  | { ok: false; message: string }

const PATH = '/admin/students'

/** Template import siswa: kolom wajib NIS; lainnya opsional tetapi divalidasi. */
export async function downloadStudentTemplate(): Promise<{ ok: true; filename: string; blob: Blob } | { ok: false; message: string }> {
  await requireRole('admin')
  const header = ['NIS', 'NISN', 'Nama Lengkap', 'Jenis Kelamin (L/P)', 'Tempat Lahir', 'Tanggal Lahir (YYYY-MM-DD)', 'NIK', 'Alamat', 'Nama Ayah', 'Nama Ibu', 'Telepon']
  const sheet = XLSX.utils.aoa_to_sheet([header, ['001', '', 'Contoh Nama Siswa', 'L', 'Jakarta', '2013-01-01', '', 'Jl. Contoh No. 1', 'Ayah Contoh', 'Ibu Contoh', '081234567890']])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, 'Siswa')
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return {
    ok: true,
    filename: `template_siswa.xlsx`,
    blob: new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  }
}

/** Export seluruh siswa (aktif) ke Excel. */
export async function exportStudentsToExcel(): Promise<{ ok: true; filename: string; blob: Blob } | { ok: false; message: string }> {
  await requireRole('admin')
  const client = await createClient()
  const { data, error } = await client
    .from('students')
    .select('nis,nisn,full_name,gender,birth_place,birth_date,nik,address,father_name,mother_name,phone,is_active')
    .order('full_name')
  if (error) return { ok: false, message: 'Data siswa tidak dapat dimuat.' }

  const rows = (data ?? []).map(row => {
    const parsed = studentExportSchema.safeParse(row)
    return parsed.success
      ? {
          NIS: parsed.data.nis,
          NISN: parsed.data.nisn,
          'Nama Lengkap': parsed.data.full_name,
          'Jenis Kelamin': parsed.data.gender,
          'Tempat Lahir': parsed.data.birth_place,
          'Tanggal Lahir': parsed.data.birth_date,
          NIK: parsed.data.nik,
          Alamat: parsed.data.address,
          'Nama Ayah': parsed.data.father_name,
          'Nama Ibu': parsed.data.mother_name,
          Telepon: parsed.data.phone,
          Status: parsed.data.is_active ? 'Aktif' : 'Nonaktif',
        }
      : null
  }).filter((row): row is NonNullable<typeof row> => row !== null)

  const sheet = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, 'Siswa')
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return {
    ok: true,
    filename: `data_siswa_${new Date().toISOString().slice(0, 10)}.xlsx`,
    blob: new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  }
}

/** Import siswa dari Excel. NIS sebagai identifier utama; NISN opsional tetapi divalidasi 10 digit. */
export async function importStudentsFromExcel(formData: FormData): Promise<StudentImportResult> {
  await requireRole('admin')
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: 'Pilih berkas Excel untuk diimpor.' }
  }
  const MAX_SIZE = 3 * 1024 * 1024
  if (file.size > MAX_SIZE) return { ok: false, message: 'Ukuran berkas melebihi 3 MB.' }

  let workbook: XLSX.WorkBook
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    workbook = XLSX.read(buffer, { type: 'buffer' })
  } catch {
    return { ok: false, message: 'Berkas tidak dapat dibaca sebagai Excel.' }
  }

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return { ok: false, message: 'Berkas Excel kosong.' }
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: '' })
  if (jsonRows.length === 0) return { ok: false, message: 'Tidak ada baris data di dalam berkas.' }

  const imported: Array<Record<string, unknown>> = []
  const errors: Array<{ row: number; message: string }> = []
  let failed = 0

  jsonRows.forEach((raw, index) => {
    const rowNumber = index + 2 // header = baris 1
    const parsed = studentImportSchema.safeParse(raw)
    if (!parsed.success) {
      failed += 1
      errors.push({ row: rowNumber, message: parsed.error.issues[0]?.message ?? 'Data baris tidak valid.' })
      return
    }
    imported.push(parsed.data)
  })

  const client = await createClient()

  // Validasi NIS unik terhadap database (cek konflik) sebelum insert.
  const existing = new Set<string>()
  const nisList = imported.map(r => String(r.nis)).filter(Boolean)
  if (nisList.length > 0) {
    const { data } = await client.from('students').select('nis').in('nis', nisList)
    for (const row of data ?? []) if (row?.nis) existing.add(String(row.nis))
  }

  // Pisahkan baris konflik; sisanya siap insert.
  const toInsert = imported.filter(r => !existing.has(String(r.nis)))
  const conflictRows = imported.length - toInsert.length
  if (conflictRows > 0) {
    failed += conflictRows
    errors.push({ row: 0, message: `${conflictRows} baris dilewati karena NIS sudah terdaftar di sistem.` })
  }

  let inserted = 0
  if (toInsert.length > 0) {
    const { error } = await client.from('students').insert(toInsert)
    if (error) {
      return { ok: false, message: 'Sebagian data gagal disimpan. Periksa kembali NIS, NISN, dan kolom wajib.' }
    }
    inserted = toInsert.length
  }

  revalidatePath(PATH)
  return {
    ok: true,
    message: `Berhasil impor ${inserted} siswa.`,
    imported: inserted,
    failed,
    errors,
  }
}