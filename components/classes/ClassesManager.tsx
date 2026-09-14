'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { classSchema, type ClassInput } from '@/validators/class'
import { CLASS_PAGE_SIZE, type ClassRow, type HomeroomChoice } from '@/services/classes.service'
import { saveClass, deleteClass, type ClassActionResult } from '@/app/admin/classes/actions'
import Button from '@/components/ui/Button'
import Modal, { ConfirmModal } from '@/components/ui/Modal'
import { TextInput, Select } from '@/components/ui/Input'

interface Props { rows: ClassRow[]; teachers: HomeroomChoice[]; count: number; page: number; search: string; error: string | null }

export default function ClassesManager({ rows, teachers, count, page, search, error }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState<ClassRow | 'new' | null>(null)
  const [deleting, setDeleting] = useState<ClassRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<ClassActionResult | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const { register, reset, handleSubmit, formState: { errors } } = useForm<ClassInput>({ resolver: zodResolver(classSchema) })
  const pages = Math.max(1, Math.ceil(count / CLASS_PAGE_SIZE))

  function navigate(nextPage: number, query = search) {
    const params = new URLSearchParams({ page: String(nextPage) })
    if (query.trim()) params.set('q', query.trim().slice(0, 100))
    startTransition(() => router.push(`/admin/classes?${params}`))
  }
  function open(row: ClassRow | 'new') {
    reset(row === 'new' ? { name: '', grade_level: 1, homeroom_teacher_id: null } : {
      name: row.name, grade_level: row.grade_level, homeroom_teacher_id: row.homeroom_teacher_id,
    })
    setFormError(null)
    setEditing(row)
  }
  async function mutate(operation: () => Promise<ClassActionResult>) {
    setBusy(true)
    setFormError(null)
    try {
      const result = await operation()
      setMessage(result)
      if (result.ok) {
        setEditing(null)
        setDeleting(null)
        startTransition(() => router.refresh())
      } else setFormError(result.message)
    } catch {
      const text = 'Operasi gagal. Periksa koneksi lalu coba lagi.'
      setMessage({ ok: false, message: text })
      setFormError(text)
    } finally { setBusy(false) }
  }
  const unavailable = editing !== null && editing !== 'new' && editing.homeroom_teacher_id !== null
    && !teachers.some(teacher => teacher.id === editing.homeroom_teacher_id)
  const disabled = pending || busy

  return <div className="space-y-6" aria-busy={disabled}>
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold">Data kelas</h1><p className="text-sm text-slate-600">Kelola tingkat dan wali kelas. Kelas berlaku lintas tahun akademik.</p></div><Button disabled={disabled || Boolean(error)} onClick={() => open('new')}>Tambah kelas</Button></header>
    {error && <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{error} <Button variant="outline" disabled={disabled} onClick={() => startTransition(() => router.refresh())}>Coba lagi</Button></div>}
    {message && <p role={message.ok ? 'status' : 'alert'} className={message.ok ? 'text-green-800' : 'text-red-800'}>{message.message}</p>}
    <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); navigate(1, String(data.get('q') ?? '')) }}>
      <TextInput key={search} label="Cari nama kelas" name="q" defaultValue={search} maxLength={100} className="flex-1" />
      <Button type="submit" disabled={disabled}>Cari</Button>
      {search && <Button variant="outline" disabled={disabled} onClick={() => navigate(1, '')}>Bersihkan</Button>}
    </form>
    {pending && <p role="status">Memuat data kelas…</p>}
    {!error && <><div className="overflow-x-auto rounded-lg border bg-white"><table className="w-full text-left text-sm"><caption className="sr-only">Daftar kelas dan wali kelas</caption><thead className="bg-slate-50"><tr>{['Nama kelas', 'Tingkat', 'Wali kelas', 'Tindakan'].map(title => <th key={title} scope="col" className="p-4">{title}</th>)}</tr></thead><tbody>
      {rows.map(row => <tr key={row.id} className="border-t"><td className="p-4 font-medium">{row.name}</td><td className="p-4">{row.grade_level}</td><td className="p-4">{row.homeroom?.full_name ?? 'Belum ditetapkan'}</td><td className="p-4"><div className="flex gap-2"><Button variant="outline" disabled={disabled} aria-label={`Ubah ${row.name}`} onClick={() => open(row)}>Ubah</Button><Button variant="danger" disabled={disabled} aria-label={`Hapus ${row.name}`} onClick={() => { setFormError(null); setDeleting(row) }}>Hapus</Button></div></td></tr>)}
      {rows.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-500">{search ? 'Tidak ada kelas yang cocok dengan pencarian.' : 'Belum ada kelas. Tambahkan kelas pertama.'}</td></tr>}
    </tbody></table></div><nav aria-label="Halaman kelas" className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm">{count} kelas · Halaman {page} dari {pages}</p><div className="flex gap-2"><Button variant="outline" disabled={disabled || page <= 1} onClick={() => navigate(page - 1)}>Sebelumnya</Button><Button variant="outline" disabled={disabled || page >= pages} onClick={() => navigate(page + 1)}>Berikutnya</Button></div></nav></>}
    <Modal isOpen={editing !== null} closeDisabled={busy} onClose={() => { if (!busy) setEditing(null) }} title={editing === 'new' ? 'Tambah kelas' : 'Ubah kelas'}>
      <form className="space-y-4" onSubmit={handleSubmit(values => mutate(() => saveClass(editing === 'new' || editing === null ? null : editing.id, values)))}>
        <fieldset disabled={busy} className="space-y-4">
          <TextInput label="Nama kelas" autoFocus maxLength={100} {...register('name')} error={errors.name?.message} />
          <TextInput label="Tingkat (1–12)" type="number" min={1} max={12} step={1} {...register('grade_level', { valueAsNumber: true })} error={errors.grade_level?.message} />
          <Select label="Wali kelas" {...register('homeroom_teacher_id', { setValueAs: (value: string | null) => value === '' ? null : value })} error={errors.homeroom_teacher_id?.message}
            options={[{ value: '', label: 'Belum ditetapkan' }, ...(unavailable ? [{ value: editing.homeroom_teacher_id!, label: 'Wali sebelumnya tidak memenuhi syarat — pilih ulang', disabled: true }] : []), ...teachers.map(teacher => ({ value: teacher.id, label: teacher.full_name }))]} />
          <p className="text-xs text-slate-600">Hanya guru aktif dengan profil aktif berperan wali kelas yang dapat dipilih. Pilih “Belum ditetapkan” untuk melepas wali kelas.</p>
          {formError && <p role="alert" className="text-sm text-red-800">{formError}</p>}
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setEditing(null)}>Batal</Button><Button type="submit" isLoading={busy}>Simpan</Button></div>
        </fieldset>
      </form>
    </Modal>
    <ConfirmModal isOpen={deleting !== null} onClose={() => { if (!busy) setDeleting(null) }} title="Hapus kelas?" message={`Hapus kelas ${deleting?.name ?? ''}? Tindakan ini tidak dapat dibatalkan. Kelas dengan riwayat siswa, penugasan guru, atau rapor tidak dapat dihapus.${formError ? ` ${formError}` : ''}`} confirmText="Hapus kelas" isLoading={busy} onConfirm={() => { if (deleting && !busy) void mutate(() => deleteClass(deleting.id)) }} />
  </div>
}
