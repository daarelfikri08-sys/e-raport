import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReportCard } from '../types/database'
import { queryFailed, type ServiceResult } from './service-result'

const COLUMNS = 'id,student_id,class_id,semester_id,total_score,average_score,ranking,homeroom_note,status,generated_at,created_at,updated_at'
export interface ReportQuery { classId: string; semesterId: string }
export async function listReports(client: SupabaseClient, params: ReportQuery): Promise<ServiceResult<ReportCard[]>> {
  try {
    const { data, error } = await client.from('report_cards').select(COLUMNS).eq('class_id', params.classId).eq('semester_id', params.semesterId).order('student_id').returns<ReportCard[]>()
    return error ? queryFailed() : { ok: true, data: data ?? [] }
  } catch { return queryFailed() }
}
export async function getStudentReport(client: SupabaseClient, studentId: string, semesterId: string): Promise<ServiceResult<ReportCard | null>> {
  try {
    const { data, error } = await client.from('report_cards').select(COLUMNS).eq('student_id', studentId).eq('semester_id', semesterId).maybeSingle<ReportCard>()
    return error ? queryFailed() : { ok: true, data }
  } catch { return queryFailed() }
}
