import type { AppRole, Profile } from './database'
export const APP_ROLES = ['admin', 'teacher', 'homeroom_teacher'] as const satisfies readonly AppRole[]
export type AuthRole = AppRole
export type AuthProfile = Pick<Profile, 'id' | 'full_name' | 'role' | 'avatar_url' | 'is_active'> & { email?: string | null }
export function isAuthRole(value: unknown): value is AuthRole {
  return typeof value === 'string' && APP_ROLES.some((role) => role === value)
}
