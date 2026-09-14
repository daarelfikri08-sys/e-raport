import type { SupabaseClient } from '@supabase/supabase-js'
import type { AcademicYear, Semester } from '@/types/database'
import { queryFailed, type ServiceResult } from './service-result'

export interface AcademicYearWithSemesters extends AcademicYear {
  semesters: Semester[]
}

const COLUMNS = 'id,name,start_date,end_date,is_active,created_at,updated_at,semesters(id,academic_year_id,name,is_active,created_at)'

function isSemester(value: unknown): value is Semester {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  return typeof row.id === 'string' && typeof row.academic_year_id === 'string'
    && (row.name === 'ganjil' || row.name === 'genap') && typeof row.is_active === 'boolean'
    && typeof row.created_at === 'string'
}

function isAcademicYear(value: unknown): value is AcademicYearWithSemesters {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  return typeof row.id === 'string' && typeof row.name === 'string'
    && (typeof row.start_date === 'string' || row.start_date === null)
    && (typeof row.end_date === 'string' || row.end_date === null)
    && typeof row.is_active === 'boolean' && typeof row.created_at === 'string'
    && typeof row.updated_at === 'string' && Array.isArray(row.semesters)
    && row.semesters.every(isSemester)
}

export async function listAcademicPeriods(client: SupabaseClient): Promise<ServiceResult<AcademicYearWithSemesters[]>> {
  try {
    const { data, error } = await client.from('academic_years').select(COLUMNS).order('name', { ascending: false })
    if (error || !Array.isArray(data)) return queryFailed()
    const rows: unknown[] = data
    if (!rows.every(isAcademicYear)) return queryFailed()
    return {
      ok: true,
      data: rows.map((year) => ({ ...year, semesters: [...year.semesters].sort((a, b) => a.name === b.name ? 0 : a.name === 'ganjil' ? -1 : 1) })),
    }
  } catch {
    return queryFailed()
  }
}
