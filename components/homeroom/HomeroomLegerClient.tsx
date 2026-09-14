'use client'

import { FileSpreadsheet, Printer } from 'lucide-react'
import Button from '@/components/ui/Button'
import type { HomeroomSubject } from '@/services/homeroom.service'

export interface LegerRow {
  studentId: string
  nis: string | null
  fullName: string
  subjectScores: Record<string, number | null>
  total: number
  average: number
  ranking: number
  complete: boolean
}

interface Props {
  rows: LegerRow[]
  subjects: HomeroomSubject[]
  className: string
  academicYearName: string
  semesterName: string
  rankingEnabled: boolean
}

export default function HomeroomLegerClient({ rows, subjects, className, academicYearName, semesterName, rankingEnabled }: Props) {
  function exportExcel() {
    // Lazy import xlsx only on client action
    void import('xlsx').then(XLSX => {
      const header = ['No', 'Nama', 'NIS', ...subjects.map(s => s.name)]
      if (rankingEnabled) header.push('Ranking')
      header.push('Jumlah', 'Rata-rata')

      const data = rows.map((row, index) => {
        const line: (string | number)[] = [index + 1, row.fullName, row.nis ?? '']
        for (const subject of subjects) {
          const score = row.subjectScores[subject.subjectId]
          line.push(score !== null && score !== undefined ? Number(score).toFixed(2) : '')
        }
        if (rankingEnabled) line.push(row.complete ? row.ranking : '')
        line.push(row.total.toFixed(2), row.average.toFixed(2))
        return line
      })

      const worksheet = XLSX.utils.aoa_to_sheet([header, ...data])
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Leger')
      const filename = `Leger_${className}_${academicYearName}_${semesterName}.xlsx`
      XLSX.writeFile(workbook, filename)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" onClick={exportExcel}><FileSpreadsheet className="h-4 w-4" /> Export Excel</Button>
        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Cetak</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white print:border-0">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 print:bg-white"><tr>
            <th scope="col" className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">No</th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nama</th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">NIS</th>
            {subjects.map(s => <th key={s.subjectId} scope="col" className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">{s.name}</th>)}
            {rankingEnabled && <th scope="col" className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Rank</th>}
            <th scope="col" className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Jumlah</th>
            <th scope="col" className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Rata-rata</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr><td colSpan={5 + subjects.length + (rankingEnabled ? 1 : 0)} className="px-4 py-10 text-center text-sm text-slate-500">Belum ada data untuk ditampilkan.</td></tr>
            ) : rows.map((row, index) => (
              <tr key={row.studentId}>
                <td className="px-3 py-2 text-sm text-slate-700">{index + 1}</td>
                <td className="px-3 py-2 text-sm font-medium text-slate-900">{row.fullName}</td>
                <td className="px-3 py-2 text-sm text-slate-600">{row.nis ?? '—'}</td>
                {subjects.map(subject => {
                  const score = row.subjectScores[subject.subjectId]
                  return <td key={subject.subjectId} className="px-3 py-2 text-center text-sm tabular-nums text-slate-700">{score !== null && score !== undefined ? Number(score).toFixed(2) : ''}</td>
                })}
                {rankingEnabled && <td className="px-3 py-2 text-center text-sm tabular-nums text-slate-700">{row.complete ? row.ranking : ''}</td>}
                <td className="px-3 py-2 text-right text-sm tabular-nums text-slate-700">{row.total.toFixed(2)}</td>
                <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums text-slate-900">{row.average.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}