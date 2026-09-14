import type { SupabaseClient } from '@supabase/supabase-js'

export const APP_ROLES = ['admin', 'teacher', 'homeroom_teacher'] as const
export type AppRole = (typeof APP_ROLES)[number]

export interface AuthProfile {
  id: string
  email: string | null
  full_name: string | null
  role: AppRole
  is_active: boolean
}

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && APP_ROLES.includes(value as AppRole)
}

export function destinationForRole(role: AppRole): string {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'teacher') return '/teacher/dashboard'
  return '/homeroom/dashboard'
}

export async function getProfileByUID(uid: string, supabase: SupabaseClient) {
  return supabase.from('profiles').select('id,full_name,role,is_active').eq('id', uid).maybeSingle()
}

export function hasRole(profile: Pick<AuthProfile, 'role'> | null, roles: readonly AppRole[]) {
  return profile !== null && roles.includes(profile.role)
}

export async function getCurrentTeacherID(supabase: SupabaseClient): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('teachers').select('id').eq('profile_id', user.id).maybeSingle()
  return typeof data?.id === 'string' ? data.id : null
}
