import type { ReactNode } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { requireRole } from '@/lib/auth/server'
export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole('admin')
  return <DashboardShell profile={profile}>{children}</DashboardShell>
}
