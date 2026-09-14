'use client'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section role="alert" className="mx-auto my-12 max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><AlertCircle aria-hidden="true" className="mx-auto h-10 w-10 text-amber-700" /><h1 className="mt-5 text-2xl font-bold">Halaman belum dapat dimuat</h1><p className="mt-3 text-sm leading-7 text-slate-600">Periksa koneksi dan coba kembali. Jika kendala berlanjut, hubungi pengelola sistem sekolah.</p><div className="mt-6 flex flex-wrap items-center justify-center gap-4"><Button onClick={reset}>Coba lagi</Button><Link href="/" className="rounded-lg p-3 text-sm font-semibold text-slate-700 hover:underline">Ke beranda</Link></div></section>
}
