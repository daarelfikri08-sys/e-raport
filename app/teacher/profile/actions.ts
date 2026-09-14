'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Teacher } from '@/types/database'
import type { ServiceResult } from '@/services/service-result'
import { queryFailed } from '@/services/service-result'

export async function updateTeacherProfile(formData: FormData): Promise<void> {
  await requireRole('teacher')
  
  const teacherId = String(formData.get('teacherId') ?? '')
  if (!teacherId || typeof teacherId !== 'string') {
    redirect('/teacher/profile?error=id_invalid')
  }

  const fullName = String(formData.get('fullName') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const phone = String(formData.get('phone') ?? '').trim()

  // Validation
  if (fullName.length < 2) {
    redirect('/teacher/profile?error=name_too_short')
  }

  if (email.length === 0) {
    redirect('/teacher/profile?error=email_required')
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect('/teacher/profile?error=email_invalid')
  }

  if (phone.length > 0 && !/^[0-9+\-\s()]+$/.test(phone)) {
    redirect('/teacher/profile?error=phone_invalid')
  }

  const supabase = await createClient()

  // Update teachers table
  const { data, error } = await supabase
    .from('teachers')
    .update({
      full_name: fullName,
      email: email.length > 0 ? email : null,
      phone: phone.length > 0 ? phone : null,
    })
    .eq('id', teacherId)
    .select('*')
    .single()

  if (error) {
    console.error('Update failed:', error)
    redirect('/teacher/profile?error=save_failed')
  }

  if (!data) {
    redirect('/teacher/profile?error=not_found')
  }

  // Validate returned data
  if (typeof data.full_name !== 'string' || typeof data.email !== 'string' || typeof data.phone !== 'string') {
    redirect('/teacher/profile?error=data_invalid')
  }

  // Revalidate path
  revalidatePath('/teacher/profile')
  redirect('/teacher/profile?success=1')
}

export async function getTeacherData(
  client: SupabaseClient,
  teacherId: string
): Promise<ServiceResult<Teacher | null>> {
  try {
    const { data, error } = await client
      .from('teachers')
      .select('*')
      .eq('id', teacherId)
      .maybeSingle()

    if (error) return queryFailed()
    if (!data) return { ok: true, data: null }

    // Validate type guard
    if (
      typeof data.id !== 'string' ||
      typeof data.profile_id !== 'string' ||
      typeof data.full_name !== 'string' ||
      typeof data.email !== 'string' ||
      typeof data.phone !== 'string' ||
      typeof data.is_active !== 'boolean'
    ) {
      return queryFailed()
    }

    return { ok: true, data }
  } catch {
    return queryFailed()
  }
}
