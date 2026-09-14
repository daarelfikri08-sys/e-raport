'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Modal, { ConfirmModal } from '@/components/ui/Modal'
import { Select, TextInput } from '@/components/ui/Input'

export type CrudValue = string | number | boolean | null
export type CrudRow = Record<string, CrudValue>
export type CrudResult = { ok: true; message: string } | { ok: false; message: string }
export interface CrudField { name: string; label: string; type?: 'text' | 'email' | 'tel' | 'number' | 'date' | 'select' | 'textarea'; required?: boolean; min?: number; max?: number; step?: number; options?: { value: string; label: string; disabled?: boolean }[] }
interface Props {
  title: string; description: string; rows: CrudRow[]; columns: { key: string; label: string; render?: (value: CrudValue, row: CrudRow) => string }[]
  fields: CrudField[]; page: number; count: number; search: string; status: string; error?: string | null; note?: string
  toolbar?: ReactNode
  saveAction: (data: FormData) => Promise<CrudResult>; statusAction?: (id: string, active: boolean) => Promise<CrudResult>; deleteAction?: (id: string) => Promise<CrudResult>
}
const PAGE_SIZE = 20

export default function CrudManager({ title, description, rows, columns, fields, page, count, search, status, error, note, toolbar, saveAction, statusAction, deleteAction }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState<CrudRow | 'new' | null>(null)
  const [confirming, setConfirming] = useState<CrudRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<CrudResult | null>(null)
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const disabled = pending || busy
  function navigate(nextPage: number, q = search, active = status) {
    const params = new URLSearchParams({ page: String(nextPage) })
    if (q.trim()) params.set('q', q.trim().slice(0, 100))
    if (active !== 'all') params.set('status', active)
    startTransition(() => router.push(`?${params}`))
  }
  async function run(operation: () => Promise<CrudResult>) {
    setBusy(true)
    try {
      const result = await operation()
      setMessage(result)
      if (result.ok) { setEditing(null); setConfirming(null); startTransition(() => router.refresh()) }
    } catch { setMessage({ ok: false, message: 'Operasi gagal. Periksa koneksi lalu coba lagi.' }) }
    finally { setBusy(false) }
  }
  return <div className="space-y-6" aria-busy={disabled}>
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold text-primary-700">Data Master</p><h1 className="text-3xl font-bold text-slate-900">{title}</h1><p className="mt-2 text-sm text-slate-600">{description}</p></div><div className="flex flex-wrap items-center gap-2">{toolbar}<Button disabled={disabled || Boolean(error)} onClick={() => setEditing('new')}>Tambah</Button></div></header>
    {note && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">{note}</div>}
    {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</div>}
    {message && <div role={message.ok ? 'status' : 'alert'} className={`rounded-xl p-3 text-sm ${message.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>{message.message}</div>}
    <form className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); navigate(1, String(data.get('q') ?? ''), String(data.get('status') ?? 'all')) }}>
      <TextInput label="Pencarian" name="q" defaultValue={search} placeholder="Cari nama atau kode…" />
      <Select label="Status" name="status" defaultValue={status} options={[{ value: 'all', label: 'Semua' }, { value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Nonaktif' }]} />
      <Button type="submit" disabled={disabled}>Terapkan</Button>
    </form>
    {pending && <p role="status">Memuat data…</p>}
    {!error && <div className="overflow-x-auto rounded-xl border bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50"><tr>{columns.map(column => <th className="p-4" scope="col" key={column.key}>{column.label}</th>)}<th className="p-4" scope="col">Tindakan</th></tr></thead><tbody>{rows.map(row => <tr className="border-t" key={String(row.id)}>{columns.map(column => <td className="p-4" key={column.key}>{column.render ? column.render(row[column.key], row) : String(row[column.key] ?? '—')}</td>)}<td className="p-4"><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={disabled} onClick={() => setEditing(row)}>Ubah</Button>{(statusAction || deleteAction) && <Button size="sm" variant={row.is_active === false ? 'outline' : 'danger'} disabled={disabled} onClick={() => setConfirming(row)}>{deleteAction ? 'Hapus' : row.is_active === false ? 'Aktifkan' : 'Nonaktifkan'}</Button>}</div></td></tr>)}{rows.length === 0 && <tr><td className="p-10 text-center text-slate-500" colSpan={columns.length + 1}>Tidak ada data yang sesuai.</td></tr>}</tbody></table></div>}
    <nav className="flex items-center justify-between gap-3"><p className="text-sm text-slate-600">{count} data · Halaman {page} dari {pages}</p><div className="flex gap-2"><Button variant="outline" disabled={disabled || page <= 1} onClick={() => navigate(page - 1)}>Sebelumnya</Button><Button variant="outline" disabled={disabled || page >= pages} onClick={() => navigate(page + 1)}>Berikutnya</Button></div></nav>
    <Modal isOpen={editing !== null} closeDisabled={busy} onClose={() => setEditing(null)} title={editing === 'new' ? `Tambah ${title}` : `Ubah ${title}`}>
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); void run(() => saveAction(new FormData(event.currentTarget))) }}>
        {editing !== 'new' && editing && <input type="hidden" name="id" value={String(editing.id)} />}
        <fieldset disabled={busy} className="space-y-4">{fields.map(field => field.type === 'select' ? <Select key={field.name} name={field.name} label={field.label} required={field.required} defaultValue={editing !== 'new' && editing ? String(editing[field.name] ?? '') : ''} options={field.options ?? []} /> : field.type === 'textarea' ? <label key={field.name} className="block text-sm font-medium text-slate-700">{field.label}<textarea name={field.name} required={field.required} defaultValue={editing !== 'new' && editing ? String(editing[field.name] ?? '') : ''} className="mt-1.5 min-h-24 w-full rounded-lg border border-slate-300 p-3" /></label> : <TextInput key={field.name} name={field.name} label={field.label} type={field.type ?? 'text'} required={field.required} min={field.min} max={field.max} step={field.step} defaultValue={editing !== 'new' && editing ? String(editing[field.name] ?? '') : ''} />)}
          {message && !message.ok && <p role="alert" className="text-sm text-red-800">{message.message}</p>}<div className="flex justify-end gap-3"><Button variant="outline" disabled={busy} onClick={() => setEditing(null)}>Batal</Button><Button type="submit" isLoading={busy}>Simpan</Button></div>
        </fieldset>
      </form>
    </Modal>
    <ConfirmModal isOpen={confirming !== null} onClose={() => setConfirming(null)} onConfirm={() => { if (!confirming) return; const id = String(confirming.id); void run(() => deleteAction ? deleteAction(id) : statusAction!(id, confirming.is_active === false)) }} title={deleteAction ? 'Hapus data?' : confirming?.is_active === false ? 'Aktifkan data?' : 'Nonaktifkan data?'} message={deleteAction ? 'Data hanya dapat dihapus jika belum digunakan. Tindakan ini tidak dapat dibatalkan.' : 'Perubahan status akan langsung memengaruhi penggunaan data ini.'} isLoading={busy} />
  </div>
}
