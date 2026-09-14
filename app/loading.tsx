import { Loader2 } from 'lucide-react'
export default function Loading() {
  return <div role="status" className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center gap-4 p-8 text-center"><Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-teal-700" /><h2 className="text-lg font-semibold">Menyiapkan halaman Anda</h2><p className="text-sm text-slate-600">Mohon tunggu sebentar…</p></div>
}
