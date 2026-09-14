import ClassesManager from '@/components/classes/ClassesManager'
import { requireRole } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { listClasses, listHomeroomChoices, parseClassQuery } from '@/services/classes.service'

export const dynamic = 'force-dynamic'

export default async function AdminClassesPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireRole('admin')
  const query = parseClassQuery(await searchParams)
  const client = await createClient()
  const [classes, teachers] = await Promise.all([listClasses(client, query.search, query.page), listHomeroomChoices(client)])
  const data = classes.ok ? classes.data : { rows: [], count: 0, page: query.page }
  return <ClassesManager {...data} teachers={teachers.ok ? teachers.data : []} search={query.search} error={!classes.ok ? classes.message : !teachers.ok ? teachers.message : null} />
}
