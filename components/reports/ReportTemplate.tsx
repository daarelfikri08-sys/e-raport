import type { ReactNode } from 'react'
import type { ReportStudentData, ReportBundle } from '@/services/report-data.service'

function n(value: string | null | undefined): string { return value && value.trim() ? value : '—' }

function InfoBox({ label, value }: { label: string; value: ReactNode }) {
  return <div className="flex items-center gap-2"><span className="w-28 shrink-0 font-medium">{label}</span><span className="flex-1 border-b border-black/20 px-1 font-bold">{value}</span></div>
}

/** Lembar rapor A4 satu siswa. Putih, kep, tabel nilai, ringkasan, absensi, ekskul, prestasi, catatan, tanda tangan. */
export function ReportTemplate({ report, school, homeroomTeacherName }: { report: ReportStudentData; school: ReportBundle['school']; homeroomTeacherName: string | null }) {
  const showRanking = report.rankingEnabled

  return (
    <article className="report-page mx-auto w-[210mm] bg-white px-[16mm] py-[14mm] text-black" data-student-id={report.studentId} aria-label="Rapor">
      {/* Kop sekolah */}
      <header className="flex items-center gap-4 border-b-4 border-double border-slate-800 pb-3">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden border border-slate-300">
          {school.logoUrl ? (
            // Logo di-render sebagai img; bila URL eksternal tidak boleh di-fetch saat build.
            // Karena Next Image memerlukan config domain, pakai <img> biasa di area cetak.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={school.logoUrl} alt="Logo sekolah" className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-3xl font-black text-slate-400">E</div>
          )}
        </div>
        <div className="flex-1 text-center">
          <p className="text-xl font-black uppercase leading-tight tracking-wide">{n(school.schoolName)}</p>
          <p className="mt-0.5 text-xs leading-snug">{n(school.npsn)}</p>
          <p className="text-xs leading-snug">{n(school.address)}</p>
          <p className="mt-1 text-sm font-semibold uppercase tracking-wide">Laporan Hasil Belajar Siswa</p>
        </div>
      </header>

      {/* Identitas siswa */}
      <section className="mt-6 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <InfoBox label="Nama Siswa" value={report.fullName} />
        <InfoBox label="Kelas" value={`${report.className}`} />
        <InfoBox label="NIS" value={n(report.nis)} />
        <InfoBox label="Semester" value={report.semesterName === 'ganjil' ? 'Ganjil (1)' : 'Genap (2)'} />
        <InfoBox label="NISN" value={n(report.nisn)} />
        <InfoBox label="Tahun Pelajaran" value={report.academicYearName} />
      </section>

      {/* Tabel nilai */}
      <section className="mt-6">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black/40 px-2 py-1.5 text-left">No</th>
              <th className="border border-black/40 px-2 py-1.5 text-left">Mata Pelajaran</th>
              <th className="border border-black/40 px-2 py-1.5 text-center w-20">Nilai Akhir</th>
              <th className="border border-black/40 px-2 py-1.5 text-center w-16">Predikat</th>
              <th className="border border-black/40 px-2 py-1.5 text-left">Deskripsi</th>
            </tr>
          </thead>
          <tbody>
            {report.subjects.length === 0 ? (
              <tr><td colSpan={5} className="border border-black/40 px-2 py-2 text-center">Belum ada data nilai</td></tr>
            ) : report.subjects.map((subject, index) => (
              <tr key={`${subject.subjectCode}-${index}`}>
                <td className="border border-black/40 px-2 py-1.5 text-center">{index + 1}</td>
                <td className="border border-black/40 px-2 py-1.5">{subject.subjectName}</td>
                <td className="border border-black/40 px-2 py-1.5 text-center">{subject.finalScore !== null ? Number(subject.finalScore).toFixed(2) : '—'}</td>
                <td className="border border-black/40 px-2 py-1.5 text-center">{subject.grade}</td>
                <td className="border border-black/40 px-2 py-1.5">{subject.description}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={2} className="border border-black/40 px-2 py-1.5 text-right font-bold">Jumlah</td>
              <td className="border border-black/40 px-2 py-1.5 text-center font-bold">{report.subjects.length > 0 ? report.total.toFixed(2) : '—'}</td>
              <td colSpan={2} className="border border-black/40 px-2 py-1.5" />
            </tr>
            <tr>
              <td colSpan={2} className="border border-black/40 px-2 py-1.5 text-right font-bold">Rata-rata</td>
              <td className="border border-black/40 px-2 py-1.5 text-center font-bold">{report.subjects.length > 0 ? report.average.toFixed(2) : '—'}</td>
              <td colSpan={2} className="border border-black/40 px-2 py-1.5" />
            </tr>
            {showRanking && (
              <tr>
                <td colSpan={2} className="border border-black/40 px-2 py-1.5 text-right font-bold">Ranking di kelas</td>
                <td className="border border-black/40 px-2 py-1.5 text-center font-bold">{report.complete ? report.ranking : '—'}</td>
                <td colSpan={2} className="border border-black/40 px-2 py-1.5" />
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Absensi */}
      <section className="mt-5 grid grid-cols-3 gap-6 text-sm">
        <div>
          <p className="mb-1 font-semibold uppercase tracking-wide">Absensi</p>
          <div className="space-y-1">
            <p>Sakit : {report.attendance.sick} hari</p>
            <p>Izin : {report.attendance.permission} hari</p>
            <p>Tanpa keterangan : {report.attendance.absent} hari</p>
          </div>
        </div>

        {/* Ekstrakurikuler */}
        <div>
          <p className="mb-1 font-semibold uppercase tracking-wide">Ekstrakurikuler</p>
          {report.extracurriculars.length === 0 ? <p>—</p> : (
            <ul className="space-y-0.5">
              {report.extracurriculars.map((ex, i) => (
                <li key={`${ex.name}-${i}`}>{ex.name}{ex.score !== null ? ` (${Number(ex.score).toFixed(1)})` : ''}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Prestasi */}
        <div>
          <p className="mb-1 font-semibold uppercase tracking-wide">Prestasi</p>
          {report.achievements.length === 0 ? <p>—</p> : (
            <ul className="space-y-0.5">
              {report.achievements.map((a, i) => (
                <li key={`${a.title}-${i}`}>{a.title}{a.level ? ` — ${a.level}` : ''}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Catatan wali kelas */}
      <section className="mt-6 text-sm">
        <p className="mb-1 font-semibold uppercase tracking-wide">Catatan Wali Kelas</p>
        <p className="min-h-16 border border-black/40 p-2 leading-relaxed">{report.homeroomNote ?? '—'}</p>
      </section>

      {/* Tanggal & tanda tangan */}
      <footer className="mt-8 flex items-end justify-between px-2 text-sm">
        <div>
          <p>Tempat/ Tanggal : {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p>Mengetahui,</p>
          <p className="mt-8 font-bold">Kepala Sekolah</p>
          <p className="mt-2 font-bold underline">{n(school.principalName)}</p>
          <p>{n(school.principalNip)}</p>
        </div>
        <div className="text-right">
          <p>Wali Kelas,</p>
          <p className="mt-8 font-bold">{n(homeroomTeacherName)}</p>
          <p>&nbsp;</p>
        </div>
      </footer>
    </article>
  )
}