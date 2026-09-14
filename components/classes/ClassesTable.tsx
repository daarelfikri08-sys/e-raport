'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'

interface AssignmentWithRoster {
  assignmentId: string
  className: string
  gradeLevel: number
  subjectNames: string
  academicYearName: string
  studentCount: number
  hasActiveSemester: boolean
}

interface ClassesTableProps {
  assignments: AssignmentWithRoster[]
}

export default function ClassesTable({ assignments }: ClassesTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  const filtered = useMemo(() => {
    return assignments.filter(a => 
      a.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.subjectNames.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [assignments, searchTerm])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage])

  const resetPage = () => setCurrentPage(1)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Cari nama kelas atau mata pelajaran..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onClick={resetPage}
          onKeyPress={(e) => e.key === 'Enter' && resetPage()}
          className="w-full sm:w-72 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">#</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Nama Kelas</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Tingkat</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Mata Pelajaran</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Siswa</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-slate-500">
                  Tidak ada kelas yang diajar
                </td>
              </tr>
            ) : (
              paginated.map((assignment, index) => (
                <tr 
                  key={`${assignment.assignmentId}-${index}`} 
                  className="hover:bg-slate-50 cursor-pointer transition-colors duration-150 ease-in-out"
                >
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                    {(currentPage - 1) * pageSize + index + 1}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                    <Link href={`/teacher/grades?assignmentId=${encodeURIComponent(assignment.assignmentId)}`} className="hover:text-primary-600 hover:underline">
                      {assignment.className}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                    Kelas {assignment.gradeLevel}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {assignment.subjectNames || '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                    {assignment.studentCount} siswa
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {assignment.hasActiveSemester ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                        Tidak Aktif
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-600">
            Menampilkan {Math.min(currentPage === 1 ? 1 : (currentPage - 1) * pageSize + 1, filtered.length)} sampai {Math.min(currentPage * pageSize, filtered.length)} dari {filtered.length} kelas
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
