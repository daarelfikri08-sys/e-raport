import { requireRole } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { parseAdminQuery } from '@/lib/admin-query'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { TextInput, Select } from '@/components/ui/Input'
import { History } from 'lucide-react'
import type { AuditLogRow } from '@/types/audit'

export const dynamic = 'force-dynamic'

const TABLE_LABELS: Record<string, string> = {
  students: 'Siswa',
  teachers: 'Guru',
  classes: 'Kelas',
  subjects: 'Mata pelajaran',
  teacher_subjects: 'Penugasan',
  assessment_types: 'Jenis penilaian',
  academic_years: 'Tahun pelajaran',
  semesters: 'Semester',
}

const ACTION_TONE: Record<string, string> = {
  INSERT: 'bg-emerald-100 text-emerald-800',
  UPDATE: 'bg-amber-100 text-amber-800',
  DELETE: 'bg-red-100 text-red-800',
}

function formatDate(value: string): string {
  try { return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) } catch { return value }
}

function summarize(data: unknown, limit = 6): string {
  if (!data) return '—'
  try {
    const obj = typeof data === 'string' ? JSON.parse(data) : data
    if (typeof obj === 'object' && obj !== null) {
      return Object.entries(obj).slice(0, limit).map(([k, v]) => `${k}: ${v ?? ''}`).join(', ')
    }
    return String(obj)
  } catch { return String(data).slice(0, 80) }
}

export default async function AdminAuditLogPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; table?: string; action?: string }> }) {
  await requireRole('admin')
  const query = parseAdminQuery(await searchParams)
  const filterTable = String((await searchParams).table ?? '')
  const filterAction = String((await searchParams).action ?? '')

  const client = await createClient()
  let request = client.from('audit_logs').select('id,user_id,action,table_name,record_id,old_data,new_data,created_at', { count: 'exact' }).order('created_at', { ascending: false }).range((query.page - 1) * 20, query.page * 20 - 1)

  if (filterTable) request = request.eq('table_name', filterTable)
  if (filterAction) request = request.eq('action', filterAction)
  if (query.search.trim()) {
    const pattern = `%${query.search.replace(/[\\%_]/g, '\\$&')}%`
    request = request.or(`table_name.ilike.${pattern},record_id::text.ilike.${pattern}`)
  }

  const { data, count, error } = await request
  const rows = (data ?? []) as AuditLogRow[]
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / 20))

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-primary-700">Laporan</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Audit Log</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Riwayat perubahan data master akademik. Catatan bersifat tambahan saja dan tidak dapat diubah atau dihapus.</p>
      </header>

      <Card padding="sm">
        <form className="grid gap-3 p-3 sm:grid-cols-[1fr_12rem_10rem_auto] sm:items-end" method="get">
          <TextInput label="Pencarian" name="q" defaultValue={query.search} placeholder="Tabel atau ID catatan..." />
          <Select label="Tabel" name="table" defaultValue={filterTable} options={[{ value: '', label: 'Semua tabel' }, ...Object.entries(TABLE_LABELS).map(([value, label]) => ({ value, label }))]} />
          <Select label="Aksi" name="action" defaultValue={filterAction} options={[{ value: '', label: 'Semua aksi' }, { value: 'INSERT', label: 'Tambah (INSERT)' }, { value: 'UPDATE', label: 'Ubah (UPDATE)' }, { value: 'DELETE', label: 'Hapus (DELETE)' }]} />
          <Button type="submit">Terapkan</Button>
        </form>
      </Card>

      {error ? (
        <Card padding="lg"><p className="text-red-800">Data audit tidak dapat dimuat.</p></Card>
      ) : rows.length === 0 ? (
        <Card padding="lg" className="text-center"><History className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm text-slate-600">Belum ada catatan audit untuk filter ini.</p></Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50"><tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Waktu</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Tabel</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Aksi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Ringkasan</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map(row => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-sm text-slate-600">{formatDate(row.created_at)}</td>
                    <td className="px-4 py-2.5 text-sm font-medium text-slate-800">{TABLE_LABELS[row.table_name ?? ''] ?? row.table_name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-sm"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${ACTION_TONE[row.action] ?? 'bg-slate-100 text-slate-700'}`}>{row.action}</span></td>
                    <td className="max-w-md px-4 py-2.5 text-sm text-slate-600">
                      {row.action === 'DELETE' ? summarize(row.old_data) : row.action === 'INSERT' ? summarize(row.new_data) : (
                        <div className="space-y-1"><p className="text-xs text-slate-500">Lama: {summarize(row.old_data)}</p><p>Baru: {summarize(row.new_data)}</p></div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <nav className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">{count ?? 0} catatan · Halaman {query.page} dari {totalPages}</p>
        <div className="flex gap-2">
          <Button variant="outline" disabled={query.page <= 1} href={`?${new URLSearchParams({ ...(query.search ? { q: query.search } : {}), ...(filterTable ? { table: filterTable } : {}), ...(filterAction ? { action: filterAction } : {}), page: String(query.page - 1) })}`}>Sebelumnya</Button>
          <Button variant="outline" disabled={query.page >= totalPages} href={`?${new URLSearchParams({ ...(query.search ? { q: query.search } : {}), ...(filterTable ? { table: filterTable } : {}), ...(filterAction ? { action: filterAction } : {}), page: String(query.page + 1) })}`}>Berikutnya</Button>
        </div>
      </nav>
    </div>
  )
}