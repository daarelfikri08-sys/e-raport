'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { navigation } from './Sidebar'
import { destinationForRole } from '@/lib/auth/helpers'
import { LogOut, UserCircle } from 'lucide-react'
import type { AuthProfile } from '@/lib/auth/helpers'
import { createClient } from '@/lib/supabase/client'

const roleLabels: Record<AuthProfile['role'], string> = { admin: 'Administrator', teacher: 'Guru mata pelajaran', homeroom_teacher: 'Wali kelas' }

export default function Header({ profile }: { profile: AuthProfile }) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pathname = usePathname()
  const current = navigation[profile.role].find(item => pathname === item.href || pathname.startsWith(`${item.href}/`))

  async function signOut() {
    setSigningOut(true)
    setError(null)
    try {
      const { error: signOutError } = await createClient().auth.signOut()
      if (signOutError) throw signOutError
      router.replace('/login')
      router.refresh()
    } catch { setError('Gagal keluar. Periksa koneksi dan coba kembali.') } finally { setSigningOut(false) }
  }

  return (
    <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 pl-16 sm:px-8 sm:pl-20 lg:pl-8">
      <div><p className="text-sm font-semibold text-slate-900">{roleLabels[profile.role]}</p><nav aria-label="Breadcrumb" className="mt-1 text-xs text-slate-600"><ol className="flex flex-wrap gap-2"><li><Link href={destinationForRole(profile.role)} className="hover:underline">Ruang kerja</Link></li><li aria-hidden="true">/</li><li aria-current="page">{current?.label ?? 'Halaman'}</li></ol></nav></div>
      <div className="flex items-center gap-3">
        <UserCircle className="h-9 w-9 text-slate-400" />
        <div className="hidden text-right sm:block"><p className="max-w-48 truncate text-sm font-medium">{profile.full_name || 'Pengguna'}</p><p className="max-w-48 truncate text-xs text-slate-500">{profile.email}</p></div>
        <button type="button" onClick={signOut} disabled={signingOut} className="ml-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50">
          <LogOut aria-hidden="true" className="h-4 w-4" /><span>{signingOut ? 'Keluar...' : 'Keluar'}</span>
        </button>
      </div>
      {error && <p role="alert" className="w-full rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    </header>
  )
}
