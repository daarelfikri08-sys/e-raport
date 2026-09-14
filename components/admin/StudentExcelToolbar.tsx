'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { downloadStudentTemplate, exportStudentsToExcel, importStudentsFromExcel, type StudentImportResult } from '@/app/admin/students/excel-actions'

export default function StudentExcelToolbar() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<StudentImportResult | null>(null)

  async function triggerDownload(fn: () => Promise<{ ok: true; filename: string; blob: Blob } | { ok: false; message: string }>) {
    setBusy(true)
    try {
      const out = await fn()
      if (!out.ok) {
        setResult({ ok: false, message: out.message })
        return
      }
      const href = URL.createObjectURL(out.blob)
      const anchor = document.createElement('a')
      anchor.href = href
      anchor.download = out.filename
      anchor.click()
      URL.revokeObjectURL(href)
    } finally { setBusy(false) }
  }

  async function handleImportFile(file: File) {
    setBusy(true)
    setResult(null)
    try {
      const form = new FormData()
      form.set('file', file)
      const out = await importStudentsFromExcel(form)
      setResult(out)
      if (out.ok) router.refresh()
    } finally { setBusy(false) }
  }

  return (
    <>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4" /> Impor Excel</Button>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => setImportOpen(true)}><Download className="h-4 w-4" /> Template</Button>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => void triggerDownload(exportStudentsToExcel)}><FileSpreadsheet className="h-4 w-4" /> Ekspor</Button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={event => { const file = event.target.files?.[0]; if (file) void handleImportFile(file); event.target.value = '' }}
      />

      <Modal isOpen={importOpen} onClose={() => setImportOpen(false)} title="Template impor siswa">
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">Unduh template untuk melihat kolom yang diharapkan. Kolom wajib <strong>NIS</strong> dan <strong>Nama Lengkap</strong>; NISN bersifat opsional tetapi harus tepat 10 digit jika diisi.</p>
          <Button variant="outline" disabled={busy} onClick={() => void triggerDownload(downloadStudentTemplate)}><Download className="h-4 w-4" /> Unduh template</Button>
        </div>
      </Modal>

      {result && (
        <Modal isOpen onClose={() => setResult(null)} title="Hasil impor">
          {result.ok ? (
            <div className="space-y-3">
              <p className="text-sm text-emerald-800">{result.message}</p>
              {result.imported > 0 && <p className="text-sm text-emerald-800">Berhasil impor {result.imported} siswa.</p>}
              {result.errors.length > 0 && (
                <ul className="max-h-48 space-y-1 overflow-auto text-xs text-slate-600">{result.errors.slice(0, 20).map((e, i) => <li key={i}>Baris {e.row || '(konflik)'}: {e.message}</li>)}</ul>
              )}
              <Button variant="outline" onClick={() => setResult(null)}>Tutup</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-red-800">{result.message}</p>
              <Button variant="outline" onClick={() => setResult(null)}>Tutup</Button>
            </div>
          )}
        </Modal>
      )}
    </>
  )
}