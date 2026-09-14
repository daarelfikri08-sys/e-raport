'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarCheck, CalendarDays, CheckCircle2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { TextInput, Select } from '@/components/ui/Input'
import Modal, { ConfirmModal } from '@/components/ui/Modal'
import type { AcademicYearWithSemesters } from '@/services/academic-periods.service'
import type { Semester } from '@/types/database'
import { academicYearSchema, semesterSchema, type AcademicYearInput, type SemesterInput } from '@/validators/academic-year'
import {
  activateAcademicPeriod,
  deleteAcademicYear,
  deleteSemester,
  saveAcademicYear,
  saveSemester,
  type AcademicPeriodActionResult,
} from '@/app/admin/academic-years/actions'

interface Props { initialYears: AcademicYearWithSemesters[]; initialError: string | null }
type YearDialog = { mode: 'create' } | { mode: 'edit'; year: AcademicYearWithSemesters }
type SemesterDialog = { mode: 'create'; yearId: string; yearName: string } | { mode: 'edit'; yearId: string; yearName: string; semester: Semester }
type DeleteTarget = { kind: 'year'; id: string; label: string } | { kind: 'semester'; id: string; label: string }
type Status = { tone: 'success' | 'error'; message: string } | null

const semesterOptions = [
  { value: 'ganjil', label: 'Ganjil' },
  { value: 'genap', label: 'Genap' },
] as const

function ActiveBadge({ active }: { active: boolean }) {
  return active
    ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" /> Aktif</span>
    : <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Tidak aktif</span>
}

function formatDate(value: string | null) {
  if (!value) return 'Belum ditentukan'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

interface YearFormProps { dialog: YearDialog; busy: boolean; onClose: () => void; onResult: (result: AcademicPeriodActionResult) => void }
function AcademicYearForm({ dialog, busy, onClose, onResult }: YearFormProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const formId = 'academic-year-form'
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AcademicYearInput>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: dialog.mode === 'edit'
      ? { name: dialog.year.name, start_date: dialog.year.start_date ?? '', end_date: dialog.year.end_date ?? '' }
      : { name: '', start_date: '', end_date: '' },
  })

  useEffect(() => {
    reset(dialog.mode === 'edit'
      ? { name: dialog.year.name, start_date: dialog.year.start_date ?? '', end_date: dialog.year.end_date ?? '' }
      : { name: '', start_date: '', end_date: '' })
  }, [dialog, reset])

  const submit = handleSubmit(async (values) => {
    const data = new FormData()
    if (dialog.mode === 'edit') data.set('id', dialog.year.id)
    data.set('name', values.name)
    data.set('start_date', values.start_date)
    data.set('end_date', values.end_date)
    setFormError(null)
    try { const result = await saveAcademicYear(data); if (!result.ok) setFormError(result.message); onResult(result) } catch { setFormError('Penyimpanan gagal. Periksa koneksi dan coba lagi.') }
  })

  const pending = busy || isSubmitting
  return <Modal isOpen onClose={onClose} closeDisabled={pending} title={dialog.mode === 'create' ? 'Tambah tahun akademik' : 'Edit tahun akademik'} footer={<div className="flex justify-end gap-3"><Button variant="outline" onClick={onClose} disabled={pending}>Batal</Button><Button type="submit" form={formId} isLoading={pending} loadingText="Menyimpan...">Simpan</Button></div>}>
    {formError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{formError}</p>}
    <form id={formId} onSubmit={submit} className="space-y-4" noValidate>
      <TextInput label="Nama tahun akademik" placeholder="2025/2026" autoComplete="off" error={errors.name?.message} helperText="Gunakan format YYYY/YYYY." {...register('name')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput type="date" label="Tanggal mulai" error={errors.start_date?.message} {...register('start_date')} />
        <TextInput type="date" label="Tanggal selesai" error={errors.end_date?.message} {...register('end_date')} />
      </div>
      <p className="text-xs leading-5 text-slate-500">Tanggal boleh dikosongkan dan dapat dilengkapi kemudian.</p>
    </form>
  </Modal>
}

interface SemesterFormProps { dialog: SemesterDialog; busy: boolean; onClose: () => void; onResult: (result: AcademicPeriodActionResult) => void }
function SemesterForm({ dialog, busy, onClose, onResult }: SemesterFormProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const formId = 'semester-form'
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SemesterInput>({
    resolver: zodResolver(semesterSchema),
    defaultValues: { academic_year_id: dialog.yearId, name: dialog.mode === 'edit' ? dialog.semester.name : 'ganjil' },
  })

  useEffect(() => {
    reset({ academic_year_id: dialog.yearId, name: dialog.mode === 'edit' ? dialog.semester.name : 'ganjil' })
  }, [dialog, reset])

  const submit = handleSubmit(async (values) => {
    const data = new FormData()
    if (dialog.mode === 'edit') data.set('id', dialog.semester.id)
    data.set('academic_year_id', values.academic_year_id)
    data.set('name', values.name)
    setFormError(null)
    try { const result = await saveSemester(data); if (!result.ok) setFormError(result.message); onResult(result) } catch { setFormError('Penyimpanan gagal. Periksa koneksi dan coba lagi.') }
  })

  const pending = busy || isSubmitting
  return <Modal isOpen onClose={onClose} closeDisabled={pending} title={dialog.mode === 'create' ? 'Tambah semester' : 'Edit semester'} footer={<div className="flex justify-end gap-3"><Button variant="outline" onClick={onClose} disabled={pending}>Batal</Button><Button type="submit" form={formId} isLoading={pending} loadingText="Menyimpan...">Simpan</Button></div>}>
    {formError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{formError}</p>}
    <form id={formId} onSubmit={submit} className="space-y-4" noValidate>
      <input type="hidden" {...register('academic_year_id')} />
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tahun akademik</p><p className="mt-1 font-semibold text-slate-900">{dialog.yearName}</p></div>
      <Select label="Semester" options={semesterOptions} error={errors.name?.message} {...register('name')} />
    </form>
  </Modal>
}

export default function AcademicPeriodsManager({ initialYears, initialError }: Props) {
  const router = useRouter()
  const [yearDialog, setYearDialog] = useState<YearDialog | null>(null)
  const [semesterDialog, setSemesterDialog] = useState<SemesterDialog | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [status, setStatus] = useState<Status>(initialError ? { tone: 'error', message: initialError } : null)
  const [busy, setBusy] = useState<string | null>(null)

  async function run(key: string, action: () => Promise<AcademicPeriodActionResult>, close?: () => void) {
    setBusy(key)
    setStatus(null)
    try {
      const result = await action()
      setStatus({ tone: result.ok ? 'success' : 'error', message: result.message })
      if (result.ok) {
        close?.()
        router.refresh()
      }
    } catch {
      setStatus({ tone: 'error', message: 'Operasi tidak dapat diproses. Silakan coba lagi.' })
    } finally {
      setBusy(null)
    }
  }

  function activate(yearId: string, semesterId?: string) {
    const data = new FormData()
    data.set('academic_year_id', yearId)
    if (semesterId) data.set('semester_id', semesterId)
    void run(`activate-${semesterId ?? yearId}`, () => activateAcademicPeriod(data))
  }

  function confirmDelete() {
    if (!deleteTarget) return
    const data = new FormData()
    data.set('id', deleteTarget.id)
    const action = deleteTarget.kind === 'year' ? deleteAcademicYear : deleteSemester
    void run(`delete-${deleteTarget.id}`, () => action(data), () => setDeleteTarget(null))
  }

  const activeYear = initialYears.find((year) => year.is_active)
  const activeSemester = activeYear?.semesters.find((semester) => semester.is_active)

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-sm font-semibold text-primary-700">Master akademik</p><h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Tahun akademik & semester</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Kelola struktur periode akademik dan tentukan periode yang sedang digunakan.</p></div>
      <Button onClick={() => setYearDialog({ mode: 'create' })}><Plus className="h-4 w-4" /> Tambah tahun</Button>
    </header>

    {status && <div role={status.tone === 'error' ? 'alert' : 'status'} aria-live="polite" className={`rounded-lg border px-4 py-3 text-sm ${status.tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{status.message}</div>}

    <Card padding="sm" className="border-primary-100 bg-gradient-to-r from-primary-50 to-white">
      <div className="flex items-start gap-3"><span className="rounded-lg bg-primary-100 p-2 text-primary-700"><CalendarCheck className="h-5 w-5" /></span><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Periode aktif</p><p className="mt-1 font-semibold text-slate-900">{activeYear ? `${activeYear.name}${activeSemester ? ` · Semester ${activeSemester.name}` : ''}` : 'Belum ada periode aktif'}</p></div></div>
    </Card>

    {initialYears.length === 0 ? <Card className="py-12 text-center"><CalendarDays className="mx-auto h-10 w-10 text-slate-400" /><h2 className="mt-4 font-semibold text-slate-900">Belum ada tahun akademik</h2><p className="mt-1 text-sm text-slate-500">Tambahkan tahun akademik pertama untuk mulai mengatur semester.</p></Card> : <div className="space-y-5">
      {initialYears.map((year) => <Card key={year.id} padding="none" className={year.is_active ? 'border-primary-300 ring-1 ring-primary-100' : undefined}>
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3"><span className="rounded-lg bg-slate-100 p-2 text-slate-600"><CalendarDays className="h-5 w-5" /></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold text-slate-900">{year.name}</h2><ActiveBadge active={year.is_active} /></div><p className="mt-1 text-sm text-slate-500">{formatDate(year.start_date)} — {formatDate(year.end_date)}</p></div></div>
          <div className="flex flex-wrap gap-2">
            {!year.is_active && <Button size="sm" variant="outline" isLoading={busy === `activate-${year.id}`} onClick={() => activate(year.id)}>Aktifkan tahun</Button>}
            <Button size="sm" variant="outline" onClick={() => setSemesterDialog({ mode: 'create', yearId: year.id, yearName: year.name })}><Plus className="h-4 w-4" /> Semester</Button>
            <Button size="sm" variant="ghost" aria-label={`Edit ${year.name}`} onClick={() => setYearDialog({ mode: 'edit', year })}><Pencil className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" className="text-red-700" aria-label={`Hapus ${year.name}`} onClick={() => setDeleteTarget({ kind: 'year', id: year.id, label: year.name })}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="hidden overflow-x-auto sm:block"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr><th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Semester</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th><th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100">{year.semesters.length === 0 ? <tr><td colSpan={3} className="px-5 py-8 text-center text-sm text-slate-500">Belum ada semester.</td></tr> : year.semesters.map((semester) => <tr key={semester.id}><td className="px-5 py-3 text-sm font-medium capitalize text-slate-800">Semester {semester.name}</td><td className="px-5 py-3"><ActiveBadge active={semester.is_active} /></td><td className="px-5 py-3"><div className="flex justify-end gap-2">{!semester.is_active && <Button size="sm" variant="outline" isLoading={busy === `activate-${semester.id}`} onClick={() => activate(year.id, semester.id)}>Aktifkan</Button>}<Button size="sm" variant="ghost" aria-label={`Edit semester ${semester.name}`} onClick={() => setSemesterDialog({ mode: 'edit', yearId: year.id, yearName: year.name, semester })}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="ghost" className="text-red-700" aria-label={`Hapus semester ${semester.name}`} onClick={() => setDeleteTarget({ kind: 'semester', id: semester.id, label: `Semester ${semester.name} ${year.name}` })}><Trash2 className="h-4 w-4" /></Button></div></td></tr>)}</tbody></table></div>
        <div className="divide-y divide-slate-100 sm:hidden">{year.semesters.length === 0 ? <p className="px-4 py-8 text-center text-sm text-slate-500">Belum ada semester.</p> : year.semesters.map((semester) => <div key={semester.id} className="space-y-3 p-4"><div className="flex items-center justify-between gap-3"><p className="font-medium capitalize text-slate-800">Semester {semester.name}</p><ActiveBadge active={semester.is_active} /></div><div className="flex flex-wrap justify-end gap-2">{!semester.is_active && <Button size="sm" variant="outline" isLoading={busy === `activate-${semester.id}`} onClick={() => activate(year.id, semester.id)}>Aktifkan</Button>}<Button size="sm" variant="ghost" onClick={() => setSemesterDialog({ mode: 'edit', yearId: year.id, yearName: year.name, semester })}><Pencil className="h-4 w-4" /> Edit</Button><Button size="sm" variant="ghost" className="text-red-700" onClick={() => setDeleteTarget({ kind: 'semester', id: semester.id, label: `Semester ${semester.name} ${year.name}` })}><Trash2 className="h-4 w-4" /> Hapus</Button></div></div>)}</div>
      </Card>)}
    </div>}

    {yearDialog && <AcademicYearForm dialog={yearDialog} busy={busy !== null} onClose={() => setYearDialog(null)} onResult={(result) => { setStatus({ tone: result.ok ? 'success' : 'error', message: result.message }); if (result.ok) { setYearDialog(null); router.refresh() } }} />}
    {semesterDialog && <SemesterForm dialog={semesterDialog} busy={busy !== null} onClose={() => setSemesterDialog(null)} onResult={(result) => { setStatus({ tone: result.ok ? 'success' : 'error', message: result.message }); if (result.ok) { setSemesterDialog(null); router.refresh() } }} />}
    <ConfirmModal isOpen={deleteTarget !== null} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} title={deleteTarget?.kind === 'year' ? 'Hapus tahun akademik?' : 'Hapus semester?'} message={`Data “${deleteTarget?.label ?? ''}” akan dihapus. Tindakan ini tidak dapat dibatalkan dan dapat ditolak jika data masih digunakan.${status?.tone === 'error' ? ` ${status.message}` : ''}`} confirmText="Ya, hapus" isLoading={deleteTarget ? busy === `delete-${deleteTarget.id}` : false} />
  </div>
}
