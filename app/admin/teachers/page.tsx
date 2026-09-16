import CrudManager, { type CrudRow } from '@/components/admin/CrudManager'
import { requireRole } from '@/lib/auth/server'
import { parseAdminQuery } from '@/lib/admin-query'
import { createClient } from '@/lib/supabase/server'
import { saveTeacher, setTeacherStatus } from './actions'

export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; status?: string }> }) {
  await requireRole('admin')
  const query = parseAdminQuery(await searchParams)
  const client = await createClient()
  const pattern = `%${query.search.replace(/[\\%_]/g, '\\$&')}%`

  let request = client
    .from('teachers')
    .select('id,profile_id,nip,nuptk,full_name,email,phone,is_active', { count: 'exact' })
    .or(`full_name.ilike.${pattern},nip.ilike.${pattern},nuptk.ilike.${pattern},email.ilike.${pattern}`)
    .order('full_name')
    .range((query.page - 1) * 20, query.page * 20 - 1)

  if (query.status !== 'all') request = request.eq('is_active', query.status === 'active')

  const [{ data, count, error }, profiles, links] = await Promise.all([
    request,
    client.from('profiles').select('id,full_name,role').in('role', ['teacher', 'homeroom_teacher']).order('full_name'),
    client.from('teachers').select('profile_id').not('profile_id', 'is', null),
  ])

  const linked = new Set((links.data ?? []).map(item => item.profile_id))
  const profileOptions = [
    { value: '', label: 'Belum ditautkan' },
    ...(profiles.data ?? []).map(profile => ({
      value: profile.id,
      label: `${profile.full_name} (${profile.role})${linked.has(profile.id) ? ' — sudah tertaut' : ''}`,
    })),
  ]

  return (
    <CrudManager
      title="Guru"
      description="Kelola master guru dan hubungkan ke akun Auth yang sudah diprovisikan."
      note="Menambah guru di sini tidak membuat login. Buat pengguna di Supabase Auth dan profil yang sesuai terlebih dahulu, lalu pilih profil yang belum tertaut. Penonaktifan guru tertaut juga menonaktifkan profil secara atomik."
      rows={(data ?? []) as CrudRow[]}
      count={count ?? 0}
      page={query.page}
      search={query.search}
      status={query.status}
      error={error || profiles.error || links.error ? 'Data guru tidak dapat dimuat.' : null}
      saveAction={saveTeacher}
      statusAction={setTeacherStatus}
      columns={[
        { key: 'nip', label: 'NIP' },
        { key: 'full_name', label: 'Nama' },
        { key: 'email', label: 'Email' },
        { key: 'profile_id', label: 'Akun', format: 'linked-status' },
        { key: 'is_active', label: 'Status', format: 'boolean-status' },
      ]}
      fields={[
        { name: 'nip', label: 'NIP' },
        { name: 'nuptk', label: 'NUPTK' },
        { name: 'full_name', label: 'Nama lengkap', required: true },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'phone', label: 'Telepon', type: 'tel' },
        { name: 'profile_id', label: 'Profil/Auth', type: 'select', options: profileOptions },
      ]}
    />
  )
}
