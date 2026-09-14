import { requireRole } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { TextInput, EmailInput } from '@/components/ui/Input'
import { updateHomeroomProfile, getHomeroomTeacherData } from './actions'
import type { Teacher } from '@/types/database'

export default async function HomeroomProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string }>
}) {
  const profile = await requireRole('homeroom_teacher')
  const supabase: SupabaseClient = await createClient()

  const teacherIdResult = await supabase.rpc('current_teacher_id')
  if (typeof teacherIdResult !== 'string') {
    return (
      <div className="space-y-6">
        <header><h1 className="text-3xl font-bold text-slate-900">Profil Saya</h1><p className="mt-2 text-slate-600">Data wali kelas tidak ditemukan.</p></header>
        <Card padding="lg"><p className="text-red-700">Hubungi administrator sekolah untuk pemecahan masalah.</p></Card>
      </div>
    )
  }

  const teacherResult = await getHomeroomTeacherData(supabase, teacherIdResult)
  let teacherData: Teacher | null = null
  if (teacherResult.ok && teacherResult.data) teacherData = teacherResult.data

  const teacherName = teacherData?.full_name ?? profile.full_name ?? 'Wali Kelas'

  const sp = await searchParams
  const success = sp?.success === '1'
  const error = sp?.error

  const errorMessageMap: Record<string, string> = {
    id_invalid: 'ID wali kelas tidak valid.',
    name_too_short: 'Nama lengkap harus diisi (minimal 2 karakter).',
    email_required: 'Email wajib diisi.',
    email_invalid: 'Format email tidak valid.',
    phone_invalid: 'Nomor telepon hanya boleh mengandung angka dan tanda baca dasar.',
    save_failed: 'Gagal menyimpan perubahan. Silakan coba lagi.',
    not_found: 'Data wali kelas tidak ditemukan.',
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Selamat datang, {teacherName}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Kelola informasi akun dan data diri Anda.</p>
      </header>

      {success && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Perubahan berhasil disimpan.</div>}
      {error && !success && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{errorMessageMap[error] || 'Terjadi kesalahan. Silakan coba lagi.'}</div>}

      <Card title="Informasi Pribadi" subtitle="Lengkapi data pribadi Anda">
        <form action={updateHomeroomProfile} className="space-y-5">
          <input type="hidden" name="teacherId" value={teacherIdResult} />
          <TextInput label="Nama Lengkap" name="fullName" defaultValue={teacherData?.full_name ?? ''} required helperText="Nama lengkap sesuai data akademik." />
          <EmailInput label="Email" name="email" defaultValue={teacherData?.email ?? ''} placeholder="nama@sekolah.sch.id" required helperText="Alamat email untuk komunikasi akademik." />
          <TextInput label="Nomor Telepon" name="phone" defaultValue={teacherData?.phone ?? ''} placeholder="08xxxxxxxxxx" helperText="Nomor telepon yang dapat dihubungi (opsional)." />
          <div className="flex items-center gap-3 pt-4">
            <Button type="submit" variant="primary">Simpan Perubahan</Button>
            <Button type="button" variant="outline" href="/homeroom/dashboard">Batal</Button>
          </div>
        </form>
      </Card>

      <Card title="Informasi Akun">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div><dt className="text-sm font-medium text-slate-600">ID Pengguna</dt><dd className="mt-1 text-sm text-slate-900">{profile.id}</dd></div>
          <div><dt className="text-sm font-medium text-slate-600">Peran</dt><dd className="mt-1 text-sm text-slate-900">Wali Kelas</dd></div>
          <div><dt className="text-sm font-medium text-slate-600">Status</dt><dd className="mt-1 text-sm text-slate-900">{profile.is_active ? 'Aktif' : 'Tidak Aktif'}</dd></div>
        </dl>
      </Card>
    </div>
  )
}