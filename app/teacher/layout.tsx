import type { ReactNode } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { requireRole } from '@/lib/auth/server'
export const dynamic = 'force-dynamic'

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole('teacher')
  return <DashboardShell profile={profile}>{children}</DashboardShell>
}
