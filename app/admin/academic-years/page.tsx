import AcademicPeriodsManager from '@/components/dashboard/AcademicPeriodsManager'
import { createClient } from '@/lib/supabase/server'
import { listAcademicPeriods } from '@/services/academic-periods.service'
import { requireRole } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export default async function AdminAcademicYearsPage() {
  await requireRole('admin')
  const client = await createClient()
  const result = await listAcademicPeriods(client)
  return <AcademicPeriodsManager initialYears={result.ok ? result.data : []} initialError={result.ok ? null : result.message} />
}
