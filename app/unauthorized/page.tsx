import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'

export default function UnauthorizedPage() {
  return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6"><section className="max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm"><ShieldAlert className="mx-auto h-12 w-12 text-red-600" /><h1 className="mt-5 text-2xl font-bold">Akses tidak diizinkan</h1><p className="mt-3 text-slate-600">Akun Anda tidak memiliki kewenangan untuk membuka halaman ini atau profil akun tidak aktif.</p><div className="mt-7 flex justify-center gap-3"><Link href="/" className="rounded-lg border px-4 py-2 text-sm font-medium">Beranda</Link><Link href="/login" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white">Masuk kembali</Link></div></section></main>
}
