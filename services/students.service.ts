import type { SupabaseClient } from '@supabase/supabase-js'
import type { Student } from '../types/database'
import { queryFailed, type ServiceResult } from './service-result'

export interface StudentQuery { active?: boolean; search?: string }
const COLUMNS = 'id,nis,nisn,full_name,gender,birth_place,birth_date,nik,address,father_name,mother_name,phone,is_active,created_at,updated_at'

export async function listStudents(client: SupabaseClient, params: StudentQuery = {}): Promise<ServiceResult<Student[]>> {
  try {
    let query = client.from('students').select(COLUMNS).order('full_name')
    if (params.active !== undefined) query = query.eq('is_active', params.active)
    const search = params.search?.trim()
    if (search) query = query.ilike('full_name', `%${search.replace(/[%_,()]/g, '')}%`)
    const { data, error } = await query.returns<Student[]>()
    return error ? queryFailed() : { ok: true, data: data ?? [] }
  } catch { return queryFailed() }
}

export async function getStudent(client: SupabaseClient, id: string): Promise<ServiceResult<Student | null>> {
  try {
    const { data, error } = await client.from('students').select(COLUMNS).eq('id', id).maybeSingle<Student>()
    return error ? queryFailed() : { ok: true, data }
  } catch { return queryFailed() }
}
