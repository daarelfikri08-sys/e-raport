import { requireRole } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { TextInput, EmailInput } from '@/components/ui/Input'
import { updateTeacherProfile, getTeacherData } from './actions'
import type { Teacher } from '@/types/database'

export default async function TeacherProfilePage({ 
  searchParams 
}: { searchParams?: Promise<{ success?: string; error?: string }> }) {
  const profile = await requireRole('teacher')
  const supabase: SupabaseClient = await createClient()

  // Get teacher data from database
  const teacherIdResult = await supabase.rpc('current_teacher_id')
  if (typeof teacherIdResult !== 'string') {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-slate-900">Profil Saya</h1>
          <p className="mt-2 text-slate-600">Data guru tidak ditemukan.</p>
        </header>
        <Card padding="lg">
          <p className="text-red-700">Hubungi administrator sekolah untuk pemecahan masalah.</p>
        </Card>
      </div>
    )
  }

  const teacherResult = await getTeacherData(supabase, teacherIdResult)
  let teacherData: Teacher | null = null
  if (teacherResult.ok && teacherResult.data) {
    teacherData = teacherResult.data
  }

  const teacherName = teacherData?.full_name ?? profile.full_name ?? 'Guru'

  // Parse success/error from search params
  const sp = await searchParams
  const success = sp?.success === '1'
  const error = sp?.error

  const errorMessageMap: Record<string, string> = {
    id_invalid: 'ID guru tidak valid.',
    name_too_short: 'Nama lengkap harus diisi (minimal 2 karakter).',
    email_required: 'Email wajib diisi.',
    email_invalid: 'Format email tidak valid.',
    phone_invalid: 'Nomor telepon hanya boleh mengandung angka dan tanda baca dasar.',
    save_failed: 'Gagal menyimpan perubahan. Silakan coba lagi.',
    not_found: 'Data guru tidak ditemukan.',
    data_invalid: 'Data guru tidak valid.',
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Selamat datang, {teacherName}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Kelola informasi akun dan data diri Anda.</p>
      </header>

      {/* Success/Error Messages */}
      {success && (
        <div role="alert" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Perubahan berhasil disimpan. Terima kasih.
        </div>
      )}

      {error && !success && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMessageMap[error] || 'Terjadi kesalahan. Silakan coba lagi.'}
        </div>
      )}

      {/* Profile Card */}
      <Card title="Informasi Pribadi" subtitle="Lengkapi data pribadi Anda">
        <form action={updateTeacherProfile} className="space-y-5">
          {/* Hidden inputs */}
          <input type="hidden" name="teacherId" value={teacherIdResult} />
          
          {/* Full Name - Editable */}
          <TextInput
            label="Nama Lengkap"
            name="fullName"
            defaultValue={teacherData?.full_name ?? ''}
            required
            helperText="Nama lengkap sesuai data akademik."
          />

          {/* Email - From teachers table */}
          <EmailInput
            label="Email"
            name="email"
            defaultValue={teacherData?.email ?? ''}
            placeholder="nama@sekolah.sch.id"
            helperText="Alamat email yang akan digunakan untuk komunikasi akademik."
            required
          />

          {/* Phone - Optional */}
          <TextInput
            label="Nomor Telepon"
            name="phone"
            defaultValue={teacherData?.phone ?? ''}
            placeholder="08xxxxxxxxxx"
            helperText="Nomor telepon yang dapat dihubungi (opsional)."
          />

          {/* Submit Buttons */}
          <div className="flex items-center gap-3 pt-4">
            <Button type="submit" variant="primary">
              Simpan Perubahan
            </Button>
            <Button type="button" variant="outline" href="/teacher/dashboard">
              Batal
            </Button>
          </div>
        </form>
      </Card>

      {/* Account Info Card */}
      <Card title="Informasi Akun">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-600">ID Pengguna</dt>
            <dd className="mt-1 text-sm text-slate-900">{profile.id}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-600">Peran</dt>
            <dd className="mt-1 text-sm text-slate-900">Guru Mata Pelajaran</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-600">Status</dt>
            <dd className="mt-1 text-sm text-slate-900">{profile.is_active ? 'Aktif' : 'Tidak Aktif'}</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
