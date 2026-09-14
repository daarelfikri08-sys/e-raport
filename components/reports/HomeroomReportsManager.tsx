'use client'

import { useMemo, useState } from 'react'
import { Printer, FileText } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { TextInput } from '@/components/ui/Input'
import { ReportTemplate } from './ReportTemplate'
import type { ReportStudentData, ReportBundle } from '@/services/report-data.service'

interface Props {
  bundle: ReportBundle
  students: ReportStudentData[]
}

type PrintTarget = 'single' | 'all'

export default function HomeroomReportsManager({ bundle, students }: Props) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(students[0]?.studentId ?? null)
  const [printTarget, setPrintTarget] = useState<PrintTarget>('single')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter(s => s.fullName.toLowerCase().includes(q) || (s.nis ?? '').toLowerCase().includes(q))
  }, [students, search])

  const selected = students.find(s => s.studentId === selectedId) ?? null

  function handlePrint(target: PrintTarget) {
    setPrintTarget(target)
    // Tunggu state ter-update lalu tampilkan dialog cetak browser (bisa dipilih "Simpan sebagai PDF").
    setTimeout(() => window.print(), 120)
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <div className="w-full sm:w-80">
          <TextInput label="Cari siswa" placeholder="Nama atau NIS..." value={search} onChange={e => { setSearch(e.target.value); if (filtered.length > 0) setSelectedId(filtered[0].studentId) }} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!selected} onClick={() => handlePrint('single')}><Printer className="h-4 w-4" /> Cetak Siswa Ini</Button>
          <Button variant="outline" onClick={() => handlePrint('all')}><Printer className="h-4 w-4" /> Cetak Seluruh Kelas</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr] print:block">
        {/* Daftar siswa */}
        <aside className="print:hidden">
          <ul className="max-h-[640px] divide-y divide-slate-100 overflow-auto rounded-lg border border-slate-200 bg-white">
            {filtered.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-500">Tidak ada siswa.</li>}
            {filtered.map(student => (
              <li key={student.studentId}>
                <button type="button" onClick={() => setSelectedId(student.studentId)}
                  className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm transition-colors ${selectedId === student.studentId ? 'bg-primary-50 text-primary-800' : 'hover:bg-slate-50'}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{student.fullName}</span>
                    <span className="block text-xs text-slate-500">{student.nis ?? '—'} • Rerata {student.average.toFixed(2)}</span>
                  </span>
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Preview (hanya di layar) */}
        <section className="min-w-0 print:hidden">
          {selected ? (
            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm text-slate-600">Preview: <span className="font-semibold text-slate-900">{selected.fullName}</span></p>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="origin-top-left scale-[0.55] lg:scale-[0.68]">
                  <ReportTemplate report={selected} school={bundle.school} homeroomTeacherName={bundle.homeroomTeacherName} />
                </div>
              </div>
            </div>
          ) : (
            <Card padding="lg" className="text-center"><p className="text-sm text-slate-500">Pilih salah satu siswa untuk melihat preview rapor.</p></Card>
          )}
        </section>
      </div>

      {/* Area cetak: hanya tampil saat print (A4). Satu siswa atau seluruh kelas. */}
      <div className="hidden print:block">
        {printTarget === 'single' && selected && (
          <ReportTemplate report={selected} school={bundle.school} homeroomTeacherName={bundle.homeroomTeacherName} />
        )}
        {printTarget === 'all' && students.map(student => (
          <div key={student.studentId} className="report-break">
            <ReportTemplate report={student} school={bundle.school} homeroomTeacherName={bundle.homeroomTeacherName} />
          </div>
        ))}
      </div>
    </div>
  )
}