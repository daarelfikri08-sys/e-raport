import 'server-only'
import { redirect } from 'next/navigation'
import type { AppRole, AuthProfile } from './helpers'
import { isAppRole } from './helpers'
import { createClient } from '@/lib/supabase/server'

export async function requireRole(requiredRole: AppRole): Promise<AuthProfile> {
  let supabase
  try {
    supabase = await createClient()
  } catch (configError) {
    console.error('[E-Rapor] Gagal inisialisasi Supabase:', configError instanceof Error ? configError.message : configError)
    redirect('/configuration-error')
  }

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) {
    console.error('[E-Rapor] auth.getUser gagal:', authError.message)
    redirect('/login')
  }
  const user = authData.user
  if (!user) redirect('/login')

  const { data: profile, error } = await supabase.from('profiles').select('id,full_name,role,is_active').eq('id', user.id).maybeSingle()
  if (error) {
    console.error('[E-Rapor] Query profiles gagal:', error.message, '| user.id:', user.id)
    redirect('/unauthorized')
  }
  if (!profile) {
    console.error('[E-Rapor] Profile tidak ditemukan untuk user:', user.id)
    redirect('/unauthorized')
  }
  if (profile.is_active !== true) {
    console.error('[E-Rapor] Profile tidak aktif untuk user:', user.id)
    redirect('/unauthorized')
  }
  if (!isAppRole(profile.role)) {
    console.error('[E-Rapor] Role tidak valid:', profile.role)
    redirect('/unauthorized')
  }
  if (profile.role !== requiredRole) {
    console.error('[E-Rapor] Role tidak sesuai. Dibutuhkan:', requiredRole, '| Didapat:', profile.role)
    redirect('/unauthorized')
  }

  return { id: user.id, email: user.email ?? null, full_name: typeof profile.full_name === 'string' ? profile.full_name : null, role: profile.role, is_active: true }
}