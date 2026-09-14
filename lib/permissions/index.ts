import type { AuthRole } from '../../types/auth'
export const ROLE_ROUTES: Readonly<Record<AuthRole, readonly string[]>> = {
  admin: ['/admin'], teacher: ['/teacher'], homeroom_teacher: ['/homeroom'],
}
export const destinationForRole = (role: AuthRole): string => `${ROLE_ROUTES[role][0]}/dashboard`
export function canAccessRoute(role: AuthRole, pathname: string): boolean {
  return ROLE_ROUTES[role].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
export function allowedRolesForRoute(pathname: string): AuthRole[] {
  return (Object.keys(ROLE_ROUTES) as AuthRole[]).filter((role) => canAccessRoute(role, pathname))
}
