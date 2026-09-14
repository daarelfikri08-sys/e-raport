import type { SupabaseClient } from '@supabase/supabase-js'
import type { Teacher } from '../types/database'
import { queryFailed, type ServiceResult } from './service-result'

export interface TeacherQuery { active?: boolean }
const COLUMNS = 'id,profile_id,nip,nuptk,full_name,email,phone,is_active,created_at,updated_at'
export async function listTeachers(client: SupabaseClient, params: TeacherQuery = {}): Promise<ServiceResult<Teacher[]>> {
  try {
    let query = client.from('teachers').select(COLUMNS).order('full_name')
    if (params.active !== undefined) query = query.eq('is_active', params.active)
    const { data, error } = await query.returns<Teacher[]>()
    return error ? queryFailed() : { ok: true, data: data ?? [] }
  } catch { return queryFailed() }
}
export async function getTeacher(client: SupabaseClient, id: string): Promise<ServiceResult<Teacher | null>> {
  try {
    const { data, error } = await client.from('teachers').select(COLUMNS).eq('id', id).maybeSingle<Teacher>()
    return error ? queryFailed() : { ok: true, data }
  } catch { return queryFailed() }
}
