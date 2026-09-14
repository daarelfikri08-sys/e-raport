import type { LucideIcon } from 'lucide-react'

export interface FeaturePlaceholderProps {
  title: string
  description: string
  icon: LucideIcon
  roleLabel?: string
}

/** Empty state for dashboard modules that are intentionally not implemented yet. */
export default function FeaturePlaceholder({
  title,
  description,
  icon: Icon,
  roleLabel,
}: FeaturePlaceholderProps) {
  return (
    <section aria-labelledby="feature-title">
      {roleLabel && (
        <p className="text-sm font-medium text-primary-700">{roleLabel}</p>
      )}
      <h1 id="feature-title" className="mt-1 text-3xl font-bold text-slate-900">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-slate-600">{description}</p>

      <div className="mt-8 rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-teal-50"><Icon aria-hidden="true" className="h-9 w-9 text-teal-700" /></span>
        <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-amber-800">Segera hadir</p>
        <h2 className="mt-4 text-lg font-semibold text-slate-800">Modul sedang disiapkan</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
          Fitur ini belum tersedia. Data belum terhubung dan belum ada tindakan yang dapat dilakukan pada halaman ini. Anda tetap dapat menggunakan menu lain yang sudah tersedia.
        </p>
        <p className="mx-auto mt-5 max-w-xl text-xs leading-6 text-slate-500">Untuk pertanyaan tentang akses dan kebutuhan akademik, hubungi pengelola sistem sekolah.</p>
      </div>
    </section>
  )
}
