'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log error asli ke console browser agar mudah dilihat (buka DevTools → Console)
    console.error('[E-Rapor] Halaman gagal dimuat:', error?.message ?? error)
    if (error?.digest) console.error('[E-Rapor] Digest:', error.digest)
    // Kirim ke server log juga jika memungkinkan
    console.error('[E-Rapor] Stack:', error?.stack)
  }, [error])

  const isConfigError = error?.message?.includes('Konfigurasi Supabase belum lengkap') ?? false

  return (
    <section role="alert" className="mx-auto my-12 max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <AlertCircle aria-hidden="true" className="mx-auto h-10 w-10 text-amber-700" />
      <h1 className="mt-5 text-2xl font-bold">Halaman belum dapat dimuat</h1>

      {isConfigError ? (
        <p className="mt-3 text-sm leading-7 text-red-700">
          Environment variables Supabase belum terpasang di server deployment.
          <br />Pastikan <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code>,{' '}
          <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, dan{' '}
          <code className="rounded bg-slate-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> sudah diatur di Vercel → Settings → Environment Variables, lalu Redeploy.
        </p>
      ) : (
        <p className="mt-3 text-sm leading-7 text-slate-600">Periksa koneksi dan coba kembali. Jika kendala berlanjut, hubungi pengelola sistem sekolah.</p>
      )}

      {/* Tampilkan error detail di development atau saat debug — membantu diagnosis */}
      <details className="mt-6 rounded-xl bg-slate-50 p-4 text-left">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">Detail error (untuk diagnosis)</summary>
        <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-600">
{error?.message ?? 'Tidak ada pesan error'}
{error?.digest ? `\n\nDigest: ${error.digest}` : ''}
        </pre>
      </details>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
        <Button onClick={reset}>Coba lagi</Button>
        <Link href="/" className="rounded-lg p-3 text-sm font-semibold text-slate-700 hover:underline">Ke beranda</Link>
      </div>
    </section>
  )
}