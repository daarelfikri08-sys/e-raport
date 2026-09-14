import type { Json } from './database'

export interface AuditLogRow {
  id: string
  user_id: string | null
  action: string
  table_name: string | null
  record_id: string | null
  old_data: Json | null
  new_data: Json | null
  created_at: string
}