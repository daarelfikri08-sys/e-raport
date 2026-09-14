'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Users } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { TextInput } from '@/components/ui/Input'
import type { HomeroomStudent } from '@/services/homeroom.service'

interface Props { students: HomeroomStudent[]; className: string; academicYearName: string }

export default function HomeroomStudentsClient({ students, className, academicYearName }: Props) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter(s => s.fullName.toLowerCase().includes(q) || (s.nis ?? '').toLowerCase().includes(q) || (s.nisn ?? '').toLowerCase().includes(q))
  }, [students, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  useEffect(() => { setPage(1) }, [search])
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-5">
      <Card padding="sm">
        <form className="flex flex-col gap-3 p-3 sm:flex-row sm:items-end" onSubmit={e => e.preventDefault()}>
          <div className="flex-1">
            <TextInput label="Cari siswa" placeholder="Nama, NIS, atau NISN..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button variant="outline"><Search className="h-4 w-4" /> Cari</Button>
        </form>
      </Card>

      {filtered.length === 0 ? (
        <Card padding="lg" className="text-center">
          <Users className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Belum ada siswa</h2>
          <p className="mt-2 text-sm text-slate-600">Belum ada siswa yang terdaftar di kelas {className} pada {academicYearName}.</p>
        </Card>
      ) : (
        <>
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50"><tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">No</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">NIS</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">NISN</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nama Lengkap</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">L/P</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginated.map((student, index) => (
                    <tr key={student.studentId}>
                      <td className="px-4 py-2.5 text-sm text-slate-700">{(page - 1) * pageSize + index + 1}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">{student.nis ?? '—'}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">{student.nisn ?? '—'}</td>
                      <td className="px-4 py-2.5 text-sm font-medium text-slate-900">{student.fullName}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">{student.gender ?? '—'}</td>
                      <td className="px-4 py-2.5 text-sm">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${student.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{student.isActive ? 'Aktif' : 'Nonaktif'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm text-slate-600">Halaman {page} dari {totalPages} · {filtered.length} siswa</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Sebelumnya</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Berikutnya</Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}