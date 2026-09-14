import { redirect } from 'next/navigation'
import type { AppRole, AuthProfile } from './helpers'
import { isAppRole } from './helpers'
import { createClient } from '@/lib/supabase/server'

export async function requireRole(requiredRole: AppRole): Promise<AuthProfile> {
  let supabase
  try { supabase = await createClient() } catch { redirect('/configuration-error') }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile, error } = await supabase.from('profiles').select('id,full_name,role,is_active').eq('id', user.id).maybeSingle()
  if (error || !profile || profile.is_active !== true || !isAppRole(profile.role)) redirect('/unauthorized')
  if (profile.role !== requiredRole) redirect('/unauthorized')
  return { id: user.id, email: user.email ?? null, full_name: typeof profile.full_name === 'string' ? profile.full_name : null, role: profile.role, is_active: true }
}
