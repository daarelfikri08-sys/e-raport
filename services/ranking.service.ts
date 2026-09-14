import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReportCard } from '../types/database'
import { queryFailed, type ServiceResult } from './service-result'

export type RankingEntry = Pick<ReportCard, 'student_id' | 'total_score' | 'average_score' | 'ranking'>
export async function listRanking(client: SupabaseClient, classId: string, semesterId: string): Promise<ServiceResult<RankingEntry[]>> {
  try {
    const { data, error } = await client.from('report_cards').select('student_id,total_score,average_score,ranking').eq('class_id', classId).eq('semester_id', semesterId).order('ranking', { ascending: true, nullsFirst: false }).returns<RankingEntry[]>()
    return error ? queryFailed() : { ok: true, data: data ?? [] }
  } catch { return queryFailed() }
}
