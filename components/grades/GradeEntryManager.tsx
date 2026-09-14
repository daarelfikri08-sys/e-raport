'use client'

import { CalendarCheck, CheckCircle2, FileSpreadsheet, Loader2, Save } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { Select } from '@/components/ui/Input'
import { ConfirmModal } from '@/components/ui/Modal'
import { saveGradeBatch, submitGrades, loadAssignmentGradebook, exportGradesToExcel, importGradesFromExcel } from '@/app/teacher/grades/actions'
import type { AssessmentType, GradeStatus, SubmissionSnapshot } from '@/types/database'

interface Props {
  assignments: Array<{ id: string; subject_name: string; subject_code: string | null; class_name: string; class_grade_level: number; academic_year_name: string }>
  semester: { id: string; name: string }
  assessmentTypes: AssessmentType[]
  initialSubmissions: Record<string, SubmissionSnapshot>
  initialError: string | null
}

interface StudentRow {
  student_id: string
  full_name: string
  nis: string | null
  grades: Record<string, number | null>
}

/** studentId → assessmentTypeId → current input as string ('' = empty) */
type ScoreState = Record<string, Record<string, string>>

const gradeStatusConfig: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Draft' },
  submitted: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Terkirim' },
  verified: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Terverifikasi' },
  locked: { bg: 'bg-red-100', text: 'text-red-800', label: 'Terkunci' },
}

export default function GradeEntryManager({ assignments, semester, assessmentTypes, initialError }: Props) {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(assignments[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [roster, setRoster] = useState<StudentRow[]>([])
  const [submissionStatus, setSubmissionStatus] = useState<{ status: GradeStatus; submitted_at: string | null } | null>(null)
  const [scores, setScores] = useState<ScoreState>({})
  const [dirtyCount, setDirtyCount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState('')
  const [confirmMessage, setConfirmMessage] = useState('')
  const [confirmAction, setConfirmAction] = useState<() => Promise<void> | void>(() => {})

  // Load gradebook whenever assignment changes
  useEffect(() => {
    if (!selectedAssignmentId) return
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      setSuccessMessage(null)
      try {
        const result = await loadAssignmentGradebook(selectedAssignmentId)
        if (cancelled) return
        if (!result.ok || !result.roster) {
          setError(result.error ?? 'Data tidak dapat dimuat.')
          setRoster([])
          setSubmissionStatus(null)
          setScores({})
          return
        }
        setRoster(result.roster)
        setSubmissionStatus(result.submission ?? null)
        const initial: ScoreState = {}
        for (const student of result.roster) {
          initial[student.student_id] = {}
          for (const type of assessmentTypes) {
            const score = student.grades[type.id]
            initial[student.student_id][type.id] = score === null || score === undefined ? '' : String(score)
          }
        }
        setScores(initial)
        setDirtyCount(0)
      } catch {
        if (!cancelled) setError('Terjadi kesalahan saat memuat data siswa.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssignmentId])

  function handleScoreChange(studentId: string, typeId: string, value: string) {
    setScores(prev => {
      const studentScores = { ...(prev[studentId] ?? {}) }
      const before = studentScores[typeId] ?? ''
      studentScores[typeId] = value
      const next = { ...prev, [studentId]: studentScores }
      // Track dirty count incrementally
      const rosterRow = roster.find(s => s.student_id === studentId)
      const original = rosterRow?.grades[typeId]
      const originalStr = original === null || original === undefined ? '' : String(original)
      const wasDirty = before !== originalStr
      const isDirty = value !== originalStr
      if (wasDirty && !isDirty) setDirtyCount(c => Math.max(0, c - 1))
      else if (!wasDirty && isDirty) setDirtyCount(c => c + 1)
      return next
    })
  }

  function parseScore(value: string): number | null {
    if (value === '') return null
    const n = Number(value)
    if (!Number.isFinite(n) || n < 0 || n > 100) return NaN // NaN signals invalid
    return n
  }

  async function handleSaveDraft() {
    if (!selectedAssignmentId || dirtyCount === 0) return
    setSaving(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const entries: Array<{ studentId: string; assessmentTypeId: string; score: number }> = []
      let invalidCount = 0
      for (const student of roster) {
        for (const type of assessmentTypes) {
          const raw = scores[student.student_id]?.[type.id] ?? ''
          if (raw === '') continue
          const parsed = parseScore(raw)
          if (parsed === null || Number.isNaN(parsed)) { invalidCount++; continue }
          const original = student.grades[type.id]
          const originalStr = original === null || original === undefined ? '' : String(original)
          if (raw !== originalStr) entries.push({ studentId: student.student_id, assessmentTypeId: type.id, score: parsed })
        }
      }
      if (invalidCount > 0) {
        setError(`Terdapat ${invalidCount} nilai tidak valid (harus 0–100). Perbaiki sebelum menyimpan.`)
        return
      }
      if (entries.length === 0) {
        setSuccessMessage('Tidak ada perubahan untuk disimpan.')
        return
      }
      const result = await saveGradeBatch(selectedAssignmentId, semester.id, entries)
      if (!result.ok) {
        setError(result.message)
      } else {
        setSuccessMessage(result.message)
        setDirtyCount(0)
        // Update roster snapshot to reflect saved values
        setRoster(prev => prev.map(student => {
          const updated = { ...student, grades: { ...student.grades } }
          for (const e of entries) if (e.studentId === student.student_id) updated.grades[e.assessmentTypeId] = e.score
          return updated
        }))
      }
    } catch {
      setError('Gagal menyimpan nilai. Silakan coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  function validateComplete(): boolean {
    if (dirtyCount > 0) return false
    for (const student of roster) {
      for (const type of assessmentTypes) {
        const raw = scores[student.student_id]?.[type.id] ?? ''
        if (raw === '') return false
      }
    }
    return true
  }

  function openSubmitConfirm() {
    if (!validateComplete()) {
      setConfirmTitle('Nilai belum lengkap')
      setConfirmMessage('Ada nilai yang belum diisi atau perubahan yang belum disimpan. Lengkapi dan simpan semua nilai sebelum mengajukan.')
      setConfirmAction(() => () => setConfirmOpen(false))
      setConfirmOpen(true)
      return
    }
    setConfirmTitle('Ajukan nilai?')
    setConfirmMessage('Nilai akan berstatus "Terkirim" dan tidak dapat diedit sampai dibuka kembali oleh administrator. Lanjutkan?')
    setConfirmAction(() => async () => {
      setConfirmOpen(false)
      setSubmitting(true)
      setError(null)
      try {
        if (!selectedAssignmentId) return
        const result = await submitGrades(selectedAssignmentId, semester.id)
        if (!result.ok) {
          setError(result.message)
        } else {
          setSuccessMessage(result.message)
          setSubmissionStatus({ status: 'submitted', submitted_at: new Date().toISOString() })
          setDirtyCount(0)
        }
      } catch {
        setError('Gagal mengajukan nilai. Silakan coba lagi.')
      } finally {
        setSubmitting(false)
      }
    })
    setConfirmOpen(true)
  }

  async function handleExport() {
    if (!selectedAssignmentId) return
    
    setExporting(true)
    try {
      const result = await exportGradesToExcel(selectedAssignmentId, semester.id)
      if (!result.ok || !result.blob) {
        setError(result.error ?? 'Gagal mengekspor nilai.')
        return
      }
      
      // Create download link
      const url = URL.createObjectURL(result.blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.filename ?? `Nilai-${selectedAssignment?.subject_name}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setSuccessMessage('Nilai berhasil diekspor ke Excel.')
    } catch {
      setError('Terjadi kesalahan saat mengekspor nilai.')
    } finally {
      setExporting(false)
    }
  }

  async function handleImport(file: File) {
    if (!selectedAssignmentId) return
    
    setImporting(true)
    setError(null)
    try {
      const result = await importGradesFromExcel(selectedAssignmentId, semester.id, file)
      if (!result.ok) {
        setError(result.message)
      } else {
        setSuccessMessage(result.message)
        setDirtyCount(0)
        // Reload gradebook
        window.location.reload()
      }
    } catch {
      setError('Gagal mengimpor nilai. Periksa format file dan coba lagi.')
    } finally {
      setImporting(false)
    }
    
    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

   function statusBadge(status: string | undefined) {
     const config = gradeStatusConfig[status ?? 'draft']
     return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${config.bg} ${config.text}`}><CheckCircle2 className="h-3.5 w-3.5" aria-hidden />{config.label}</span>
   }

   // Locked or verified status means grades are finalized - disable all editing
   const isLocked = submissionStatus?.status === 'locked' || submissionStatus?.status === 'verified'
   const editable = !isLocked && (submissionStatus?.status === 'draft' || submissionStatus === null)

   // Calculate progress
   const totalStudents = roster.length
   const expectedGrades = totalStudents * assessmentTypes.length
   let filledGrades = 0

   if (totalStudents > 0 && assessmentTypes.length > 0) {
     for (const student of roster) {
       for (const type of assessmentTypes) {
         const raw = scores[student.student_id]?.[type.id] ?? ''
         if (raw !== '') filledGrades++
       }
     }
   }

   const progressPercent = expectedGrades > 0 ? Math.round((filledGrades / expectedGrades) * 100) : 0

   // Show locked/verified warning
   if (isLocked) {
     return (
       <div className="space-y-4">
         <Card padding="lg" className="text-center">
           <FileSpreadsheet className="mx-auto h-10 w-10 text-red-500" aria-hidden />
           <h2 className="mt-4 text-lg font-bold text-red-800">Nilai Sudah Dikunci</h2>
           <p className="mt-2 text-sm text-slate-600">
              Status penilaian adalah {gradeStatusConfig[submissionStatus?.status ?? 'draft'].label}.
             Tidak dapat diubah atau diedit. Hubungi administrator untuk revisi.
           </p>
         </Card>
       </div>
     )
   }
  
  // Final score calculation (handles null gracefully)
  function finalScore(studentId: string): string {
    const studentScores = scores[studentId]
    if (!studentScores) return '—'
    
    const scoredData: Array<{ value: number; weight: number }> = []
    for (const type of assessmentTypes) {
      const raw = studentScores[type.id] ?? ''
      if (raw === '') continue
      
      const n = Number(raw)
      if (!Number.isFinite(n)) continue
      
      scoredData.push({ value: n, weight: type.weight })
    }
    
    if (scoredData.length === 0) return '—'
    
    const weighted = scoredData.reduce((sum, item) => sum + item.value * item.weight, 0)
    const totalWeight = scoredData.reduce((sum, item) => sum + item.weight, 0)
    
    return (Math.round((weighted / totalWeight) * 100) / 100).toFixed(2)
  }

  const selectedAssignment = assignments.find(a => a.id === selectedAssignmentId)

  if (assignments.length === 0) {
    return (
      <Card padding="lg" className="text-center">
        <FileSpreadsheet className="mx-auto h-10 w-10 text-slate-400" aria-hidden />
        <h2 className="mt-4 text-lg font-semibold text-slate-900">Belum ada penugasan mengajar</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Anda belum ditugaskan mengajar mata pelajaran pada tahun pelajaran aktif. Hubungi administrator sekolah.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      {successMessage && !error && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{successMessage}</div>}

      <Card padding="sm">
        <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <label htmlFor="assignment-select" className="mb-1.5 block text-sm font-medium text-slate-700">Penugasan mengajar</label>
            <Select
              id="assignment-select"
              value={selectedAssignmentId}
              onChange={e => setSelectedAssignmentId(e.target.value)}
              options={assignments.map(a => ({ value: a.id, label: `${a.subject_name}${a.subject_code ? ` (${a.subject_code})` : ''} — ${a.class_name}` }))}
              inputSize="md"
            />
          </div>
          <div className="flex items-end gap-3">
            {/* Excel Actions */}
            <Button variant="outline" onClick={handleExport} disabled={exporting || roster.length === 0 || assessmentTypes.length === 0} isLoading={exporting}>
              <FileSpreadsheet className="h-4 w-4" aria-hidden /> Ekspor Excel
            </Button>
            
            <label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImport(file)
                }}
                disabled={isLocked || submitting || saving}
                className="hidden"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing || isLocked || roster.length === 0}>
                <Save className="h-4 w-4" aria-hidden /> Impor Excel
              </Button>
            </label>
            
            <div className="flex items-center gap-2">
              <Button onClick={handleSaveDraft} disabled={saving || !editable || dirtyCount === 0} isLoading={saving}>
                <Save className="h-4 w-4" aria-hidden /> Simpan Draft{dirtyCount > 0 ? ` (${dirtyCount})` : ''}
              </Button>
              {editable && (
                <Button variant="primary" onClick={openSubmitConfirm} disabled={submitting || dirtyCount > 0}>Ajukan Nilai</Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {selectedAssignment && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <CalendarCheck className="h-4 w-4" aria-hidden />
          <span>Semester {semester.name} · {selectedAssignment.academic_year_name} · {selectedAssignment.class_name}</span>
          {statusBadge(submissionStatus?.status)}
          
          {/* Progress indicator */}
          {roster.length > 0 && assessmentTypes.length > 0 && !isLocked && (
            <div className="ml-auto flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5">
              <span className="text-xs font-semibold text-blue-800">{progressPercent}% diisi</span>
              <div className="h-2 w-24 overflow-hidden rounded-full bg-blue-200">
                <div className={`h-full rounded-full ${progressPercent === 100 ? 'bg-green-500' : progressPercent >= 50 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${progressPercent}%` }} />
              </div>
              <span className="text-xs text-blue-700">{filledGrades}/{expectedGrades}</span>
            </div>
          )}
        </div>
      )}

      {!editable && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Nilai sudah diajukan dan tidak dapat diubah. Hubungi administrator jika diperlukan revisi.
        </div>
      )}

      {/* Lock warning */}
      {isLocked && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          ⚠️ Status &quot;{gradeStatusConfig[submissionStatus?.status ?? 'draft'].label}&quot; - nilai sudah dikunci dan tidak dapat diedit.
        </div>
      )}

      {loading ? (
        <Card padding="lg">
          <div className="flex items-center justify-center gap-3 py-12 text-slate-600"><Loader2 className="h-6 w-6 animate-spin" aria-hidden /><p>Memuat data siswa…</p></div>
        </Card>
      ) : roster.length === 0 ? (
        <Card padding="lg" className="text-center">
          <FileSpreadsheet className="mx-auto h-10 w-10 text-slate-400" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Belum ada siswa</h2>
          <p className="mt-2 text-sm text-slate-600">Kelas ini belum memiliki siswa terdaftar pada tahun pelajaran aktif.</p>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">No</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nama Siswa</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">NIS</th>
                  {assessmentTypes.map(type => (
                    <th key={type.id} scope="col" className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <div>{type.name}</div>
                      <div className="text-[10px] font-normal normal-case text-slate-400">bobot {type.weight}</div>
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Nilai Akhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {roster.map((row, index) => (
                  <tr key={row.student_id}>
                    <td className="px-4 py-2.5 text-sm text-slate-500">{index + 1}</td>
                    <td className="px-4 py-2.5 text-sm font-medium text-slate-900">{row.full_name}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-600">{row.nis ?? '—'}</td>
                    {assessmentTypes.map(type => (
                      <td key={type.id} className="px-3 py-2.5 text-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="any"
                          inputMode="decimal"
                          aria-label={`Nilai ${type.name} untuk ${row.full_name}`}
                          value={scores[row.student_id]?.[type.id] ?? ''}
                          disabled={!editable}
                          onChange={e => handleScoreChange(row.student_id, type.id, e.target.value)}
                          className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-center text-sm tabular-nums text-slate-900 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:bg-slate-50 disabled:text-slate-500"
                        />
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-center text-sm font-semibold tabular-nums text-slate-900">{finalScore(row.student_id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {assessmentTypes.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Belum ada jenis penilaian aktif. Hubungi administrator.</p>
          )}
        </Card>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void confirmAction()}
        title={confirmTitle}
        message={confirmMessage}
        confirmText="Lanjutkan"
        cancelText="Batal"
        isLoading={submitting}
      />
    </div>
  )
}
